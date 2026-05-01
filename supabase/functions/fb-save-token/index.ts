import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const APP_AUTH_URL = "https://gycrprnkuwlzntqvpoxl.supabase.co";
  const APP_AUTH_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5Y3Jwcm5rdXdsem50cXZwb3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNzEyMzQsImV4cCI6MjA5MjY0NzIzNH0.w7RiS6L4gir4KIKWAZxdmXutyp7EDxIu9z62n0QUoRM";

  function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Auth: requer usuário logado e admin ─────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ ok: false, error: "Não autenticado" }, 401);

  const userClient = createClient(APP_AUTH_URL, APP_AUTH_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ ok: false, error: "Sessão inválida" }, 401);
  }

  const { data: roleRow } = await userClient
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

  if (!dryRun && (!token || token.length < 50)) {
    return json({ ok: false, error: "Token muito curto ou ausente" }, 400);
  }

  // ── Validação no Facebook ────────────────────────────────────
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

  if (dryRun) {
    return json({
      ok: true,
      dry_run: true,
      auth: { user_id: userData.user.id, email: userData.user.email },
      role_admin: true,
      facebook_validation: fbCheck ? { ok: true, page: fbCheck.data } : "skipped",
      message: "✅ Todas as checagens passaram.",
    });
  }

  // ── Grava no banco (Cloud project) ───────────────────────────
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { error: upErr } = await admin
    .from("integration_secrets")
    .upsert(
      { name: "FB_PAGE_TOKEN", value: token, updated_at: new Date().toISOString(), updated_by: userData.user.id },
      { onConflict: "name" },
    );

  if (upErr) {
    return json({ ok: false, error: `Falha ao salvar no banco: ${upErr.message}` }, 500);
  }

  return json({ ok: true, message: "FB_PAGE_TOKEN salvo com sucesso (banco)", page: fbCheck?.data });
});
