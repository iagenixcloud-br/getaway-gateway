import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function getFbToken(): Promise<string | null> {
  try {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await admin.from("integration_secrets").select("value").eq("name", "FB_PAGE_TOKEN").maybeSingle();
    if (data?.value) return data.value;
  } catch (_) { /* fallback */ }
  return Deno.env.get("FB_PAGE_TOKEN") ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const FB_APP_ID = Deno.env.get("FB_APP_ID");
  const FB_APP_SECRET = Deno.env.get("FB_APP_SECRET");
  const FB_PAGE_TOKEN = await getFbToken();

  if (!FB_APP_ID || !FB_APP_SECRET || !FB_PAGE_TOKEN) {
    return new Response(JSON.stringify({ ok: false, error: "Faltam FB_APP_ID, FB_APP_SECRET ou FB_PAGE_TOKEN" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const exchangeUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    exchangeUrl.searchParams.set("grant_type", "fb_exchange_token");
    exchangeUrl.searchParams.set("client_id", FB_APP_ID);
    exchangeUrl.searchParams.set("client_secret", FB_APP_SECRET);
    exchangeUrl.searchParams.set("fb_exchange_token", FB_PAGE_TOKEN);

    const exchangeRes = await fetch(exchangeUrl.toString());
    const exchangeData = await exchangeRes.json();

    if (!exchangeRes.ok || exchangeData.error) {
      return new Response(JSON.stringify({ ok: false, step: "exchange", error: exchangeData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const longLivedToken = exchangeData.access_token as string;

    const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${longLivedToken}&access_token=${FB_APP_ID}|${FB_APP_SECRET}`;
    const debugRes = await fetch(debugUrl);
    const debugData = await debugRes.json();

    const tokenInfo = debugData.data || {};
    const expiresAt = tokenInfo.expires_at;
    const isPermanent = expiresAt === 0;
    const expiresInDays = expiresAt ? Math.round((expiresAt - Date.now() / 1000) / 86400) : null;

    // Salva no banco
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: upErr } = await admin
      .from("integration_secrets")
      .upsert(
        { name: "FB_PAGE_TOKEN", value: longLivedToken, updated_at: new Date().toISOString() },
        { onConflict: "name" },
      );

    return new Response(JSON.stringify({
      ok: !upErr,
      saved: !upErr,
      save_error: upErr?.message,
      token_type: tokenInfo.type,
      is_permanent: isPermanent,
      expires_in_days: expiresInDays,
      page_id: tokenInfo.profile_id,
      scopes: tokenInfo.scopes,
      new_token_preview: longLivedToken.slice(0, 12) + "...",
      message: isPermanent
        ? "✅ Token permanente gerado e salvo!"
        : `⚠️ Token gerado expira em ~${expiresInDays} dias.`,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
