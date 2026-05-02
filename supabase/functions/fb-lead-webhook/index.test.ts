import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const PROJECT_REF = "lzgdvvapzmuogtlivzxa";
const WEBHOOK_URL = `https://${PROJECT_REF}.supabase.co/functions/v1/fb-lead-webhook`;

// External CRM DB (where leads are stored)
const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
const EXT_KEY = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;

Deno.test("E2E: webhook receives lead and saves to DB", async () => {
  const crm = createClient(EXT_URL, EXT_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ts = Date.now();
  const uniqueName = `E2E Test ${ts}`;
  const uniqueEmail = `e2e+${ts}@test.com`;

  // 1) Send webhook payload (same format as Facebook)
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
  assertEquals(res.status, 200, `Webhook returned ${res.status}: ${JSON.stringify(body)}`);
  assertEquals(body.ok, true, `Webhook response not ok: ${JSON.stringify(body)}`);
  assertEquals(body.created?.length, 1, `Expected 1 created lead, got ${body.created?.length}`);

  const leadId = body.created[0];

  // 2) Verify lead exists in external DB
  const { data: lead, error } = await crm
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  assertEquals(error, null, `DB query error: ${error?.message}`);
  assertEquals(lead.name, uniqueName);
  assertEquals(lead.email, uniqueEmail);
  assertEquals(lead.status, "lead_novo");
  assertEquals(lead.interest, "E2E validation test");

  // 3) Verify lead was distributed (tenant_id assigned)
  // This may be null if no active brokers exist, so we just log it
  console.log(`Lead ${leadId} tenant_id: ${lead.tenant_id ?? "(not assigned)"}`);

  // 4) Cleanup: remove test lead
  await crm.from("leads").delete().eq("id", leadId);
  const text = await (await fetch("about:blank").catch(() => ({ text: async () => "" }))).text?.() ?? "";
  void text;

  console.log(`✅ E2E passed: lead ${leadId} created and verified`);
});
