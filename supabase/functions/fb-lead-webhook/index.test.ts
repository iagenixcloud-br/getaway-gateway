import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const PROJECT_REF = "lzgdvvapzmuogtlivzxa";
const WEBHOOK_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/fb-lead-webhook`;

const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
const EXT_KEY = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;

Deno.test("E2E: webhook receives lead and saves to DB", async () => {
  const crm = createClient(EXT_URL, EXT_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ts = Date.now();
  const uniqueName = `E2E Test ${ts}`;
  const uniqueEmail = `e2e+${ts}@test.com`;

  // 1) Send webhook payload (Facebook format)
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
          _test_data: {
            name: uniqueName,
            email: uniqueEmail,
            phone: `+5511${String(ts).slice(-9)}`,
            interest: "E2E validation test",
          },
        },
      }],
    }],
  };

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await res.json();
  assertEquals(res.status, 200, `Webhook returned ${res.status}`);
  assertEquals(body.ok, true, `Webhook not ok: ${JSON.stringify(body)}`);
  assertEquals(body.created?.length, 1, `Expected 1 lead, got ${body.created?.length}`);

  const leadId = body.created[0];

  // 2) Verify lead in external DB
  const { data: lead, error } = await crm
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  assertEquals(error, null, `DB error: ${error?.message}`);
  assertEquals(lead.name, uniqueName);
  assertEquals(lead.email, uniqueEmail);
  assertEquals(lead.status, "lead_novo");
  assertEquals(lead.interest, "E2E validation test");

  // 3) Check distribution
  console.log(`Lead ${leadId} assigned to: ${lead.tenant_id ?? "(none)"}`);

  // 4) Cleanup
  await crm.from("leads").delete().eq("id", leadId);

  console.log(`✅ E2E passed: lead ${leadId} created, verified, cleaned up`);
});
