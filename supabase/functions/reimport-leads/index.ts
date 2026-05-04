import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAGE_ID = "101491475744542";
const CLOUD_URL = Deno.env.get("SUPABASE_URL")!;
const CLOUD_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
const EXT_SERVICE = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;

const cloudAdmin = createClient(CLOUD_URL, CLOUD_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
const crmAdmin = createClient(EXT_URL, EXT_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0+/, "");
}

function fieldValue(fieldData: Array<{ name: string; values?: string[] }>, keys: string[]) {
  for (const key of keys) {
    const found = fieldData.find((field) => field.name?.toLowerCase().includes(key));
    if (found?.values?.[0]) return found.values[0];
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = await (async () => {
    const { data } = await cloudAdmin.from("integration_secrets").select("value").eq("name", "FB_PAGE_TOKEN").maybeSingle();
    return data?.value || Deno.env.get("FB_PAGE_TOKEN") || "";
  })();

  if (!token) {
    return new Response(JSON.stringify({ ok: false, error: "No FB token" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const result = { forms_checked: 0, fetched: 0, created: 0, skipped: 0, errors: [] as string[] };

  try {
    const formsRes = await fetch(`https://graph.facebook.com/v21.0/${PAGE_ID}/leadgen_forms?fields=id,name,status&limit=100&access_token=${encodeURIComponent(token)}`);
    const formsData = await formsRes.json();
    if (formsData.error) throw new Error(formsData.error.message);

    const activeForms = (formsData.data || []).filter((f: any) => f.status === "ACTIVE");
    result.forms_checked = activeForms.length;

    // Track phones to deduplicate within this import
    const seenPhones = new Set<string>();

    for (const form of activeForms) {
      let nextUrl: string | null = `https://graph.facebook.com/v21.0/${form.id}/leads?fields=id,created_time,field_data,platform&limit=100&access_token=${encodeURIComponent(token)}`;

      for (let page = 0; nextUrl && page < 10; page++) {
        const res = await fetch(nextUrl);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);

        for (const lead of data.data || []) {
          result.fetched++;

          const fieldData = Array.isArray(lead.field_data) ? lead.field_data : [];
          const name = fieldValue(fieldData, ["full_name", "first_name", "nome", "name"]) || "Lead Facebook";
          const whatsapp = fieldValue(fieldData, ["whatsapp"]);
          const phone = fieldValue(fieldData, ["phone_number", "phone", "telefone", "celular"]) || whatsapp || "";
          const email = fieldValue(fieldData, ["email", "e-mail"]);
          const city = fieldValue(fieldData, ["city", "cidade"]);

          const normPhone = normalizePhone(phone);
          if (normPhone && seenPhones.has(normPhone)) {
            result.skipped++;
            continue;
          }
          if (normPhone) seenPhones.add(normPhone);

          const interest = `${form.name || form.id}${lead.platform ? ` • ${String(lead.platform).toUpperCase()}` : ""}`;

          const { data: inserted, error: insertErr } = await crmAdmin
            .from("leads")
            .insert({ name, phone, email, city, interest, status: "lead_novo" })
            .select("id")
            .single();

          if (insertErr) {
            result.errors.push(`${lead.id}: ${insertErr.message}`);
            continue;
          }

          try { await crmAdmin.rpc("distribute_lead", { _lead_id: inserted.id }); } catch (_) {}

          await cloudAdmin.from("webhook_logs").insert({
            event_type: "leadgen_sync", page_id: PAGE_ID, leadgen_id: lead.id,
            form_id: form.id, status: "success", lead_id: inserted.id,
            payload: { form_name: form.name, platform: lead.platform, created_time: lead.created_time },
          });
          result.created++;
        }
        nextUrl = data.paging?.next || null;
      }
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e), ...result }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
