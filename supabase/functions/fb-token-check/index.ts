import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

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

  const result: Record<string, unknown> = {};

  try {
    const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${token}`);
    const me = await meRes.json();
    result.me = me;

    const permRes = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${token}`);
    const perms = await permRes.json();
    result.permissions = perms;

    const debugRes = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${token}`,
    );
    const debug = await debugRes.json();
    result.debug_token = debug;

    const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${token}`);
    const pages = await pagesRes.json();
    result.pages = pages;

    const required = ["leads_retrieval", "pages_manage_metadata", "pages_show_list", "pages_read_engagement"];
    const granted = new Set(
      (perms.data || []).filter((p: any) => p.status === "granted").map((p: any) => p.permission),
    );
    result.required_permissions_check = required.map((p) => ({ permission: p, granted: granted.has(p) }));
    result.all_required_granted = required.every((p) => granted.has(p));

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
