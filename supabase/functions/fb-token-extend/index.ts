import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const FB_APP_ID = Deno.env.get("FB_APP_ID");
  const FB_APP_SECRET = Deno.env.get("FB_APP_SECRET");
  const FB_PAGE_TOKEN = Deno.env.get("FB_PAGE_TOKEN");
  const SUPABASE_ACCESS_TOKEN = Deno.env.get("SB_DEPLOY_ACCESS_TOKEN");
  const PROJECT_REF = "lzgdvvapzmuogtlivzxa";

  if (!FB_APP_ID || !FB_APP_SECRET || !FB_PAGE_TOKEN) {
    return new Response(JSON.stringify({ ok: false, error: "Faltam FB_APP_ID, FB_APP_SECRET ou FB_PAGE_TOKEN" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Trocar o short-lived Page Token por um long-lived USER token primeiro
    //    (o método correto é: short page → long user → page novamente, OU usar diretamente o page token)
    //    Estratégia: fb_exchange_token funciona com page tokens também e retorna long-lived
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

    // 2. Validar o token novo (debug_token) pra ver se realmente é long-lived
    const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${longLivedToken}&access_token=${FB_APP_ID}|${FB_APP_SECRET}`;
    const debugRes = await fetch(debugUrl);
    const debugData = await debugRes.json();

    const tokenInfo = debugData.data || {};
    const expiresAt = tokenInfo.expires_at;
    const isPermanent = expiresAt === 0;
    const expiresInDays = expiresAt ? Math.round((expiresAt - Date.now() / 1000) / 86400) : null;

    // 3. Atualiza o secret FB_PAGE_TOKEN automaticamente via Supabase Management API
    if (SUPABASE_ACCESS_TOKEN) {
      const updateRes = await fetch(
        `https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([{ name: "FB_PAGE_TOKEN", value: longLivedToken }]),
        },
      );
      const updateBody = await updateRes.text();

      return new Response(JSON.stringify({
        ok: updateRes.ok,
        secret_updated: updateRes.ok,
        secret_update_status: updateRes.status,
        secret_update_response: updateRes.ok ? "FB_PAGE_TOKEN atualizado com sucesso" : updateBody,
        new_token: updateRes.ok ? undefined : longLivedToken,
        token_type: tokenInfo.type,
        is_permanent: isPermanent,
        expires_in_days: expiresInDays,
        page_id: tokenInfo.profile_id,
        scopes: tokenInfo.scopes,
        new_token_preview: longLivedToken.slice(0, 12) + "...",
        message: isPermanent
          ? "✅ Token permanente gerado. Salve no FB_PAGE_TOKEN!"
          : `⚠️ Token gerado expira em ~${expiresInDays} dias.`,
      }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sem access token de management — devolve o novo token pro user atualizar manualmente
    return new Response(JSON.stringify({
      ok: true,
      secret_updated: false,
      reason: "SB_DEPLOY_ACCESS_TOKEN não configurado, atualize manualmente",
      new_token: longLivedToken,
      token_type: tokenInfo.type,
      is_permanent: isPermanent,
      expires_in_days: expiresInDays,
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
