import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

async function getFbToken(): Promise<string | null> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (url && key) {
      const admin = createClient(url, key);
      const { data } = await admin.from("integration_secrets").select("value").eq("name", "FB_PAGE_TOKEN").maybeSingle();
      if (data?.value) return data.value;
    }
  } catch (_) { /* fallback */ }
  return Deno.env.get("FB_PAGE_TOKEN") ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = await getFbToken();
  if (!token) {
    return new Response(JSON.stringify({ ok: false, error: "FB_PAGE_TOKEN não configurado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const result: Record<string, unknown> = { token_length: token.length, token_prefix: token.slice(0, 8) };

  try {
    // 1. /me — identifica o token
    const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${token}`);
    const me = await meRes.json();
    result.me = me;

    // 2. /me/permissions — lista escopos
    const permRes = await fetch(`https://graph.facebook.com/v21.0/me/permissions?access_token=${token}`);
    const perms = await permRes.json();
    result.permissions = perms;

    // 3. debug_token — info do token (validade, tipo, scopes)
    const debugRes = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${token}`,
    );
    const debug = await debugRes.json();
    result.debug_token = debug;

    // 4. Lista páginas acessíveis (se for user token)
    const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${token}`);
    const pages = await pagesRes.json();
    result.pages = pages;

    // Análise das permissões necessárias
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
    return new Response(JSON.stringify({ ok: false, error: String(e), partial: result }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
