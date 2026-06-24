import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const PAGE_ID = "101491475744542";
const FORM_ID = "849013068226913";

const CLOUD_URL = Deno.env.get("SUPABASE_URL")!;
const CLOUD_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const CLOUD_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function requireAdmin(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const token = authHeader.slice("Bearer ".length);
  const userClient = createClient(CLOUD_URL, CLOUD_ANON, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: claims, error } = await userClient.auth.getClaims(token);
  if (error || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Sessão inválida" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const admin = createClient(CLOUD_URL, CLOUD_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", claims.claims.sub);
  const set = new Set((roles ?? []).map((r: any) => r.role));
  if (!(set.has("admin") || set.has("master"))) {
    return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return null;
}

async function getFbToken(): Promise<string | null> {
  try {
    if (CLOUD_URL && CLOUD_SERVICE) {
      const admin = createClient(CLOUD_URL, CLOUD_SERVICE);
      const { data } = await admin.from("integration_secrets").select("value").eq("name", "FB_PAGE_TOKEN").maybeSingle();
      if (data?.value) return data.value;
    }
  } catch (_) { /* fallback */ }
  return Deno.env.get("FB_PAGE_TOKEN") ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const denied = await requireAdmin(req);
  if (denied) return denied;

  const token = await getFbToken();
  if (!token) {
    return new Response(JSON.stringify({ ok: false, error: "FB_PAGE_TOKEN não configurado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "list";

  try {
    if (action === "list") {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${PAGE_ID}/subscribed_apps?access_token=${token}`,
      );
      const data = await res.json();
      const formRes = await fetch(
        `https://graph.facebook.com/v21.0/${FORM_ID}?fields=id,name,status&access_token=${token}`,
      );
      const form = await formRes.json();
      return new Response(JSON.stringify({ action: "list", page_id: PAGE_ID, form_id: FORM_ID, subscribed_apps: data, form }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "subscribe") {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${PAGE_ID}/subscribed_apps?subscribed_fields=leadgen&access_token=${token}`,
        { method: "POST" },
      );
      const data = await res.json();

      const listRes = await fetch(
        `https://graph.facebook.com/v21.0/${PAGE_ID}/subscribed_apps?access_token=${token}`,
      );
      const listData = await listRes.json();

      return new Response(JSON.stringify({
        action: "subscribe",
        subscribe_result: data,
        all_subscribed_apps_after: listData,
      }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "leads") {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${FORM_ID}/leads?fields=id,created_time,field_data,platform&limit=5&access_token=${token}`,
      );
      const data = await res.json();
      return new Response(JSON.stringify({ action: "leads", page_id: PAGE_ID, form_id: FORM_ID, ...data }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "action deve ser 'list', 'subscribe' ou 'leads'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
