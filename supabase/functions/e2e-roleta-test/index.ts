// ONE-SHOT TEST: valida que um lead de tráfego pago via fb-lead-webhook
// dispara registrar_atribuicao_roleta corretamente (total_received++ +
// last_received_at + linha em lead_assignments com source='webhook').
// SERÁ DELETADA após uso.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROJECT_REF = "lzgdvvapzmuogtlivzxa";
const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
const EXT_KEY = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
const crm = createClient(EXT_URL, EXT_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const out: Record<string, unknown> = {};

  // 1) próximo da fila (menor last_received_at, ativo)
  const { data: nextQ } = await crm
    .from("profiles")
    .select("id, name, total_received, last_received_at, is_active")
    .eq("is_active", true)
    .order("last_received_at", { ascending: true, nullsFirst: true })
    .limit(1);
  const next = nextQ?.[0];
  out.next_in_queue_before = next;
  if (!next) {
    return new Response(JSON.stringify({ ok: false, ...out }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // 2) dispara webhook com _test_data
  const ts = Date.now();
  const testName = `E2E Roleta ${ts}`;
  const testEmail = `e2e-roleta+${ts}@test.com`;
  const testPhone = `+5511${String(ts).slice(-9)}`;

  const webhookRes = await fetch(
    `https://${PROJECT_REF}.supabase.co/functions/v1/fb-lead-webhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        object: "page",
        entry: [{
          id: "test_page",
          time: Math.floor(ts / 1000),
          changes: [{
            field: "leadgen",
            value: {
              leadgen_id: `e2e_roleta_${ts}`,
              page_id: "test_page",
              form_id: "test_form",
              _test_data: { name: testName, email: testEmail, phone: testPhone, interest: "E2E roleta" },
            },
          }],
        }],
      }),
    },
  );
  const wb = await webhookRes.json();
  out.webhook_response = { status: webhookRes.status, body: wb };
  const leadId = wb?.created?.[0];
  if (!leadId) {
    return new Response(JSON.stringify({ ok: false, ...out }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // pequena espera p/ propagação
  await new Promise((r) => setTimeout(r, 800));

  // 3) lead + assignment
  const { data: lead } = await crm.from("leads")
    .select("id, name, tenant_id, status, origem")
    .eq("id", leadId).single();
  out.lead = lead;

  const { data: assignment } = await crm.from("lead_assignments")
    .select("id, lead_id, corretor_id, source, assigned_at")
    .eq("lead_id", leadId)
    .order("assigned_at", { ascending: true });
  out.assignments = assignment;

  // 4) corretor depois
  const corretorId = (lead as any)?.tenant_id;
  if (corretorId) {
    const { data: after } = await crm.from("profiles")
      .select("id, name, total_received, last_received_at")
      .eq("id", corretorId).single();
    out.corretor_after = after;

    // also fetch the BEFORE state of THIS corretor (might differ from next-in-queue if pages were stale)
  }

  // 5) cleanup: remove lead e assignment
  await crm.from("lead_assignments").delete().eq("lead_id", leadId);
  await crm.from("leads").delete().eq("id", leadId);
  out.cleanup = "done";

  return new Response(JSON.stringify({ ok: true, ...out }, null, 2), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
