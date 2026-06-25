import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const PAGE_ID = "101491475744542";

const CLOUD_URL = Deno.env.get("SUPABASE_URL")!;
const CLOUD_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
const EXT_SERVICE = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;

const cloudAdmin = createClient(CLOUD_URL, CLOUD_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
const crmAdmin = createClient(EXT_URL, EXT_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Valida o JWT no MESMO projeto que o emitiu (externo) e checa role.
async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { error: json({ ok: false, error: "Não autenticado" }, 401) };

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const { data: userData, error: userErr } = await crmAdmin.auth.getUser(token);
  if (userErr || !userData?.user) return { error: json({ ok: false, error: "Sessão inválida" }, 401) };

  const { data: roleRows, error: roleErr } = await crmAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);

  if (roleErr) {
    return { error: json({ ok: false, error: "Falha ao validar permissões" }, 500) };
  }

  const roles = (roleRows || []).map((r: any) => r.role);
  if (!roles.includes("admin") && !roles.includes("master")) {
    return { error: json({ ok: false, error: "Apenas administradores podem alterar o webhook" }, 403) };
  }
  return { user: userData.user };
}

async function getFbToken(): Promise<string | null> {
  const { data } = await cloudAdmin.from("integration_secrets").select("value").eq("name", "FB_PAGE_TOKEN").maybeSingle();
  if (data?.value) return data.value;
  return Deno.env.get("FB_PAGE_TOKEN") ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const token = await getFbToken();
  if (!token) return json({ ok: false, error: "FB_PAGE_TOKEN não configurado. Conecte o Facebook primeiro." }, 500);

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "list";

  try {
    if (action === "list") {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${PAGE_ID}/subscribed_apps?access_token=${encodeURIComponent(token)}`,
      );
      const data = await res.json();
      const isSubscribed = Array.isArray(data?.data) &&
        data.data.some((app: any) => Array.isArray(app.subscribed_fields) && app.subscribed_fields.includes("leadgen"));
      return json({ ok: true, action: "list", page_id: PAGE_ID, is_subscribed_to_leadgen: isSubscribed, subscribed_apps: data });
    }

    if (action === "subscribe") {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${PAGE_ID}/subscribed_apps?subscribed_fields=leadgen&access_token=${encodeURIComponent(token)}`,
        { method: "POST" },
      );
      const data = await res.json();

      const listRes = await fetch(
        `https://graph.facebook.com/v21.0/${PAGE_ID}/subscribed_apps?access_token=${encodeURIComponent(token)}`,
      );
      const listData = await listRes.json();
      const isSubscribed = Array.isArray(listData?.data) &&
        listData.data.some((app: any) => Array.isArray(app.subscribed_fields) && app.subscribed_fields.includes("leadgen"));

      // log no banco para auditoria
      try {
        await cloudAdmin.from("webhook_logs").insert({
          event_type: "subscribe_attempt",
          page_id: PAGE_ID,
          status: isSubscribed ? "success" : "error",
          error_message: isSubscribed ? null : (data?.error?.message || "Page not subscribed after POST"),
          payload: { subscribe_result: data, list_after: listData },
        });
      } catch (_) { /* ignore */ }

      if (!isSubscribed) {
        return json({
          ok: false,
          action: "subscribe",
          error: data?.error?.message || "Página não ficou inscrita após a tentativa.",
          subscribe_result: data,
          all_subscribed_apps_after: listData,
        }, 500);
      }

      return json({
        ok: true,
        action: "subscribe",
        message: "Página inscrita no webhook de leads (leadgen).",
        subscribe_result: data,
        all_subscribed_apps_after: listData,
      });
    }

    return json({ ok: false, error: "action deve ser 'list' ou 'subscribe'" }, 400);
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
