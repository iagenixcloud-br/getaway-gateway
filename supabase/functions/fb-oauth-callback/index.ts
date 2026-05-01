import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const PAGE_ID = "101491475744542"; // Salles Imóveis

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FB_APP_ID = Deno.env.get("FB_APP_ID")!;
const FB_APP_SECRET = Deno.env.get("FB_APP_SECRET")!;

const DEFAULT_RETURN_URL = "https://id-preview--563e940b-5fd2-4d9a-9d39-ab91d2e3e24b.lovable.app/integracao";

function decodeState(state: string | null) {
  if (!state) return null;
  try {
    const normalized = state.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function getReturnUrl(url: URL) {
  const state = decodeState(url.searchParams.get("state"));
  try {
    const candidate = new URL(state?.return_to || DEFAULT_RETURN_URL);
    const isAllowedHost = candidate.hostname === "localhost" || candidate.hostname.endsWith(".lovable.app");
    if (isAllowedHost) {
      candidate.pathname = "/integracao";
      return candidate;
    }
  } catch {
    // Fallback abaixo
  }
  return new URL(DEFAULT_RETURN_URL);
}

function redirectResponse(url: URL, payload: { ok: boolean; message: string }) {
  const destination = getReturnUrl(url);
  destination.searchParams.set("fb_oauth", payload.ok ? "success" : "error");
  destination.searchParams.set("message", payload.message);

  return new Response(null, {
    status: 303,
    headers: {
      ...corsHeaders,
      Location: destination.toString(),
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // O Facebook precisa do MESMO redirect_uri usado na URL de autorização
  const redirectUri = `${SUPABASE_URL}/functions/v1/fb-oauth-callback`;

  if (error) {
    return redirectResponse(url, { ok: false, message: errorDescription || error });
  }
  if (!code) {
    return redirectResponse(url, { ok: false, message: "Código de autorização ausente." });
  }

  try {
    // 1) Trocar code por user access token (short-lived)
    const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", FB_APP_ID);
    tokenUrl.searchParams.set("client_secret", FB_APP_SECRET);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);
    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
      return htmlResponse({ ok: false, message: "Falha ao trocar code por token", details: tokenData });
    }
    const userToken = tokenData.access_token as string;

    // 2) Trocar por long-lived user token
    const longUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
    longUrl.searchParams.set("grant_type", "fb_exchange_token");
    longUrl.searchParams.set("client_id", FB_APP_ID);
    longUrl.searchParams.set("client_secret", FB_APP_SECRET);
    longUrl.searchParams.set("fb_exchange_token", userToken);
    const longRes = await fetch(longUrl.toString());
    const longData = await longRes.json();
    if (!longRes.ok || longData.error) {
      return htmlResponse({ ok: false, message: "Falha ao gerar long-lived token", details: longData });
    }
    const longUserToken = longData.access_token as string;

    // 3) Buscar páginas do usuário e localizar a Salles Imóveis
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?access_token=${longUserToken}&limit=200`,
    );
    const pagesData = await pagesRes.json();
    if (!pagesRes.ok || pagesData.error) {
      return htmlResponse({ ok: false, message: "Falha ao listar páginas", details: pagesData });
    }
    const page = (pagesData.data || []).find((p: any) => p.id === PAGE_ID);
    if (!page) {
      return htmlResponse({
        ok: false,
        message: `Você não tem acesso à página ${PAGE_ID} (Salles Imóveis). Páginas disponíveis na sua conta:`,
        details: (pagesData.data || []).map((p: any) => ({ id: p.id, name: p.name })),
      });
    }
    // Page tokens vindos de um long-lived user token NÃO expiram (permanentes)
    const pageToken = page.access_token as string;

    // 4) Salvar no banco
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: upErr } = await admin
      .from("integration_secrets")
      .upsert(
        { name: "FB_PAGE_TOKEN", value: pageToken, updated_at: new Date().toISOString() },
        { onConflict: "name" },
      );
    if (upErr) {
      return htmlResponse({ ok: false, message: "Falha ao salvar token no banco", details: upErr.message });
    }

    // 5) Inscrever no webhook de leads (não falhar se já estiver inscrito)
    let subscribeResult: any = null;
    try {
      const subRes = await fetch(
        `https://graph.facebook.com/v21.0/${PAGE_ID}/subscribed_apps?subscribed_fields=leadgen&access_token=${pageToken}`,
        { method: "POST" },
      );
      subscribeResult = await subRes.json();
    } catch (e) {
      subscribeResult = { warning: String(e) };
    }

    // 6) Verificar permissões
    const debugRes = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?input_token=${pageToken}&access_token=${FB_APP_ID}|${FB_APP_SECRET}`,
    );
    const debugData = await debugRes.json();
    const info = debugData.data || {};

    return htmlResponse({
      ok: true,
      message: `Página "${page.name}" conectada com sucesso! Token permanente salvo e webhook ativo.`,
      details: {
        page_name: page.name,
        page_id: page.id,
        is_permanent: info.expires_at === 0,
        scopes: info.scopes,
        subscribe: subscribeResult,
      },
    });
  } catch (e) {
    return htmlResponse({ ok: false, message: "Erro inesperado", details: String(e) });
  }
});
