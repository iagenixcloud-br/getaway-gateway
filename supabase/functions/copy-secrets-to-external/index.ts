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

  // Secrets to copy
  const secretNames = ["FB_APP_ID", "FB_APP_SECRET", "FB_PAGE_TOKEN", "FB_VERIFY_TOKEN"];
  const secrets: { name: string; value: string }[] = [];
  const missing: string[] = [];

  for (const name of secretNames) {
    const val = Deno.env.get(name);
    if (val) {
      secrets.push({ name, value: val });
    } else {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    return new Response(JSON.stringify({ ok: false, error: `Secrets não encontrados no Cloud: ${missing.join(", ")}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Use Supabase Management API to set secrets on external project
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
