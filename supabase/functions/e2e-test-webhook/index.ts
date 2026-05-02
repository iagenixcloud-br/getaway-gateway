// Edge Function: e2e-test-webhook
// Teste de ponta a ponta: dispara lead via webhook → verifica no banco → limpa
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROJECT_REF = "lzgdvvapzmuogtlivzxa";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL");
  const EXT_KEY = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
  if (!EXT_URL || !EXT_KEY) {
    return new Response(JSON.stringify({ pass: false, error: "External DB not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const crm = createClient(EXT_URL, EXT_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ts = Date.now();
  const testName = `E2E Test ${ts}`;
  const testEmail = `e2e+${ts}@test.com`;
  const testPhone = `+5511${String(ts).slice(-9)}`;
  const steps: { step: string; pass: boolean; detail?: string }[] = [];

  try {
    // STEP 1: Send webhook payload
    const webhookUrl = `https://${PROJECT_REF}.supabase.co/functions/v1/fb-lead-webhook`;
    const payload = {
      object: "page",
      entry: [{
        id: "test_page",
        time: Math.floor(ts / 1000),
        changes: [{
          field: "leadgen",
          value: {
            leadgen_id: `e2e_${ts}`,
            page_id: "test_page",
            form_id: "test_form",
            _test_data: { name: testName, email: testEmail, phone: testPhone, interest: "E2E test" },
          },
        }],
      }],
    };

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();

    const webhookOk = res.status === 200 && body.ok && body.created?.length === 1;
    steps.push({ step: "webhook_response", pass: webhookOk, detail: `status=${res.status} created=${body.created?.length ?? 0}` });

    if (!webhookOk) {
      return respond(false, steps, "Webhook failed");
    }

    const leadId = body.created[0];

    // STEP 2: Verify lead in DB
    const { data: lead, error } = await crm.from("leads").select("*").eq("id", leadId).single();
    const dbOk = !error && lead?.name === testName && lead?.email === testEmail && lead?.status === "lead_novo";
    steps.push({
      step: "db_verification",
      pass: dbOk,
      detail: error ? `error: ${error.message}` : `name=${lead?.name} status=${lead?.status}`,
    });

    // STEP 3: Check distribution
    const distributed = lead?.tenant_id != null;
    steps.push({ step: "lead_distribution", pass: distributed, detail: `tenant_id=${lead?.tenant_id ?? "null"}` });

    // STEP 4: Cleanup
    const { error: delErr } = await crm.from("leads").delete().eq("id", leadId);
    steps.push({ step: "cleanup", pass: !delErr, detail: delErr?.message ?? "ok" });

    const allPass = steps.every((s) => s.pass);
    return respond(allPass, steps);
  } catch (e) {
    steps.push({ step: "unexpected_error", pass: false, detail: String(e) });
    return respond(false, steps);
  }

  function respond(pass: boolean, steps: unknown[], error?: string) {
    return new Response(JSON.stringify({ pass, steps, error, timestamp: new Date().toISOString() }, null, 2), {
      status: pass ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
