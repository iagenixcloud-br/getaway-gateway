import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXTERNAL_PROJECT_REF = "gycrprnkuwlzntqvpoxl";

const CLOUD_URL = Deno.env.get("SUPABASE_URL")!;
const CLOUD_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const CLOUD_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function requireMaster(req: Request): Promise<Response | null> {
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
  if (!(roles ?? []).some((r: any) => r.role === "master")) {
    return new Response(JSON.stringify({ error: "Apenas o Admin Master pode executar esta operação" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const denied = await requireMaster(req);
  if (denied) return denied;

  const deployToken = Deno.env.get("SB_DEPLOY_ACCESS_TOKEN");
  if (!deployToken) {
    return new Response(JSON.stringify({ ok: false, error: "SB_DEPLOY_ACCESS_TOKEN não configurado" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const cloudAdmin = createClient(CLOUD_URL, CLOUD_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: tokenRow } = await cloudAdmin
    .from("integration_secrets")
    .select("value")
    .eq("name", "FB_PAGE_TOKEN")
    .maybeSingle();

  const dbToken = tokenRow?.value;

  const secrets: { name: string; value: string }[] = [];
  const missing: string[] = [];

  if (dbToken) {
    secrets.push({ name: "FB_PAGE_TOKEN", value: dbToken });
  } else {
    missing.push("FB_PAGE_TOKEN (tabela integration_secrets)");
  }

  for (const name of ["FB_APP_ID", "FB_APP_SECRET", "FB_VERIFY_TOKEN"]) {
    const val = Deno.env.get(name);
    if (val) {
      secrets.push({ name, value: val });
    } else {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    return new Response(JSON.stringify({ ok: false, error: `Não encontrados: ${missing.join(", ")}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${EXTERNAL_PROJECT_REF}/secrets`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deployToken}`,
      },
      body: JSON.stringify(secrets),
    }
  );

  const body = await res.text();
  if (!res.ok) {
    return new Response(JSON.stringify({ ok: false, status: res.status, error: body }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    copied: secrets.map(s => s.name),
    message: `✅ ${secrets.length} secrets copiados para o Supabase externo!`,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
