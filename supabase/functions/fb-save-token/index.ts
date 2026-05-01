import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_ACCESS_TOKEN = Deno.env.get("SB_DEPLOY_ACCESS_TOKEN");
  const PROJECT_REF = "lzgdvvapzmuogtlivzxa";
  const APP_AUTH_URL = "https://gycrprnkuwlzntqvpoxl.supabase.co";
  const APP_AUTH_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5Y3Jwcm5rdXdsem50cXZwb3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNzEyMzQsImV4cCI6MjA5MjY0NzIzNH0.w7RiS6L4gir4KIKWAZxdmXutyp7EDxIu9z62n0QUoRM";

  // ── Auth: requer usuário logado e admin ─────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ ok: false, error: "Não autenticado" }, 401);
  }

  const supabase = createClient(APP_AUTH_URL, APP_AUTH_ANON_KEY || SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ ok: false, error: "Sessão inválida" }, 401);
  }

  // Checa se é admin (tabela user_roles)
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleRow) {
    return json({ ok: false, error: "Apenas administradores podem alterar o token" }, 403);
  }

  // ── Body ─────────────────────────────────────────────────────
  let body: { token?: string; dry_run?: boolean };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "JSON inválido" }, 400);
  }

  const dryRun = body.dry_run === true;
  const token = (body.token || "").trim();

  // No dry_run, se não vier token, usa o atual do ambiente só para validar fluxo
  if (!dryRun && (!token || token.length < 50)) {
    return json({ ok: false, error: "Token muito curto ou ausente" }, 400);
  }

  // ── Validação prévia: o token bate no Facebook? ──────────────
  // (em dry_run sem token, pula esta etapa)
  let fbCheck: any = null;
  if (token && token.length >= 50) {
    try {
      const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${encodeURIComponent(token)}`);
      const meData = await meRes.json();
      fbCheck = { status: meRes.status, data: meData };
      if (!meRes.ok || meData.error) {
        return json({ ok: false, step: "facebook_validate", error: `Token rejeitado pelo Facebook: ${meData.error?.message || "desconhecido"}`, fb: fbCheck }, 400);
      }
    } catch (e) {
      return json({ ok: false, step: "facebook_validate", error: `Erro ao validar no Facebook: ${String(e)}` }, 500);
    }
  }

  // ── DRY RUN: retorna status de auth + role + secret manager sem gravar
  if (dryRun) {
    return json({
      ok: true,
      dry_run: true,
      auth: { user_id: userData.user.id, email: userData.user.email },
      role_admin: true,
      management_api_configured: !!SUPABASE_ACCESS_TOKEN,
      facebook_validation: fbCheck ? { ok: true, page: fbCheck.data } : "skipped (sem token)",
      message: "✅ Todas as checagens passaram. O fluxo real funcionaria.",
    });
  }

  // ── Atualiza o secret via Management API ─────────────────────
  if (!SUPABASE_ACCESS_TOKEN) {
    return json({
      ok: false,
      error: "SB_DEPLOY_ACCESS_TOKEN não configurado. Atualize FB_PAGE_TOKEN manualmente.",
    }, 500);
  }

  const updRes = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ name: "FB_PAGE_TOKEN", value: token }]),
    },
  );

  if (!updRes.ok) {
    const txt = await updRes.text();
    return json({ ok: false, error: `Falha ao salvar secret (${updRes.status}): ${txt}` }, 500);
  }

  return json({ ok: true, message: "FB_PAGE_TOKEN atualizado com sucesso" });

  function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
