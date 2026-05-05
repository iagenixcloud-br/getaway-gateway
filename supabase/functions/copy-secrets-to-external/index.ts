import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXTERNAL_PROJECT_REF = "gycrprnkuwlzntqvpoxl";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const deployToken = Deno.env.get("SB_DEPLOY_ACCESS_TOKEN");
  if (!deployToken) {
    return new Response(JSON.stringify({ ok: false, error: "SB_DEPLOY_ACCESS_TOKEN não configurado" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const cloudAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Read FB_PAGE_TOKEN from integration_secrets table (the valid one)
  const { data: tokenRow, error: dbErr } = await cloudAdmin
    .from("integration_secrets")
    .select("value")
    .eq("name", "FB_PAGE_TOKEN")
    .maybeSingle();

  const dbToken = tokenRow?.value;

  // Build secrets list: FB_PAGE_TOKEN from DB, rest from env
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

  // Push to external Supabase via Management API
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
    token_source: "integration_secrets table",
    token_preview: dbToken!.slice(0, 12) + "...",
    message: `✅ ${secrets.length} secrets copiados para o Supabase externo!`,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
