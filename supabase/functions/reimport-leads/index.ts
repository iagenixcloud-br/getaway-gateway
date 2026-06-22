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

// IDs duplicados criados pela execução anterior do reimport (a apagar antes de rodar)
const DUPS_TO_DELETE = [
  "55d281ba-9064-4059-bf45-fd89e44a6dd0", // Tatiana criada 21/06 23:52
  "09f37a91-669a-4df6-91ba-d958266af218", // Erick criada 21/06 23:52
];

function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, "").replace(/^0+/, "");
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  return d;
}

function formatPhoneE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  const isBR =
    (hasPlus && digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) ||
    (!hasPlus && (
      digits.length === 10 || digits.length === 11 ||
      ((digits.length === 12 || digits.length === 13) && digits.startsWith("55"))
    ));
  if (isBR) {
    let d = digits;
    if (d.startsWith("55") && (d.length === 12 || d.length === 13)) d = d.slice(2);
    while (d.startsWith("0")) d = d.slice(1);
    if (d.length < 10 || d.length > 11) return null;
    const ddd = d.slice(0, 2);
    let sub = d.slice(2);
    if (!/^[1-9][1-9]$/.test(ddd)) return null;
    if (sub.length === 8) sub = "9" + sub;
    else if (sub.length === 9 && sub[0] !== "9") sub = "9" + sub.slice(1);
    if (sub.length !== 9) return null;
    return `+55 ${ddd} ${sub}`;
  }
  if (digits.length >= 8 && digits.length <= 15 && /^[1-9]/.test(digits)) {
    return `+${digits}`;
  }
  return null;
}

function fieldValue(fieldData: Array<{ name: string; values?: string[] }>, keys: string[]) {
  for (const key of keys) {
    const found = fieldData.find((field) => field.name?.toLowerCase().includes(key));
    if (found?.values?.[0]) return found.values[0];
  }
  return null;
}

async function doImport() {
  const result: Record<string, unknown> = {
    deleted_all: 0, forms_checked: 0, fetched: 0, created: 0,
    skipped_dup_batch: 0, errors: 0, error_messages: [] as string[],
  };

  // 1) Apaga TODOS os leads do CRM
  try {
    const { data: deleted } = await crmAdmin
      .from("leads")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select("id");
    result.deleted_all = deleted?.length || 0;
  } catch (e) {
    (result.error_messages as string[]).push(`delete all failed: ${e instanceof Error ? e.message : "unknown"}`);
  }

  // 2) Token FB
  const { data: tokenRow } = await cloudAdmin.from("integration_secrets").select("value").eq("name", "FB_PAGE_TOKEN").maybeSingle();
  const token = tokenRow?.value || Deno.env.get("FB_PAGE_TOKEN") || "";
  if (!token) {
    (result.error_messages as string[]).push("No FB token");
    await cloudAdmin.from("webhook_logs").insert({ event_type: "reimport_result", status: "error", payload: result });
    return;
  }

  // 3) Cutoff = últimas 48h (hoje + ontem)

  const cutoff = Math.floor((Date.now() - 48 * 60 * 60 * 1000) / 1000);
  const filtering = encodeURIComponent(JSON.stringify([{ field: "time_created", operator: "GREATER_THAN", value: cutoff }]));

  // 5) Lista forms ativos
  const formsRes = await fetch(`https://graph.facebook.com/v21.0/${PAGE_ID}/leadgen_forms?fields=id,name,status&limit=100&access_token=${encodeURIComponent(token)}`);
  const formsData = await formsRes.json();
  if (formsData.error) {
    (result.error_messages as string[]).push(`Forms error: ${formsData.error.message}`);
    await cloudAdmin.from("webhook_logs").insert({ event_type: "reimport_result", status: "error", payload: result });
    return;
  }
  const activeForms = (formsData.data || []).filter((f: any) => f.status === "ACTIVE");
  result.forms_checked = activeForms.length;

  const seenPhonesBatch = new Set<string>();
  const seenEmailsBatch = new Set<string>();

  for (const form of activeForms) {
    let nextUrl: string | null = `https://graph.facebook.com/v21.0/${form.id}/leads?fields=id,created_time,field_data,platform&limit=100&filtering=${filtering}&access_token=${encodeURIComponent(token)}`;

    for (let page = 0; nextUrl && page < 10; page++) {
      const res = await fetch(nextUrl);
      const data = await res.json();
      if (data.error) { (result.error_messages as string[]).push(`Lead fetch error: ${data.error.message}`); break; }

      for (const lead of data.data || []) {
        (result as any).fetched++;
        const fieldData = Array.isArray(lead.field_data) ? lead.field_data : [];
        const name = fieldValue(fieldData, ["full_name", "first_name", "nome", "name"]) || "Lead Facebook";
        const whatsapp = fieldValue(fieldData, ["whatsapp"]);
        const phone = fieldValue(fieldData, ["phone_number", "phone", "telefone", "celular"]) || whatsapp || "";
        const email = fieldValue(fieldData, ["email", "e-mail"]);
        const city = fieldValue(fieldData, ["city", "cidade"]);
        const entradaDesejada = fieldValue(fieldData, ["entrada"]);
        const jaInvesteImoveis = fieldValue(fieldData, ["investe", "investidor"]);

        const normPhone = normalizePhone(phone);
        const normEmail = (email || "").toLowerCase().trim();

        // Dedup vs banco
        if (normPhone && existingPhones.has(normPhone)) { (result as any).skipped_phone_dup_db++; continue; }
        if (normEmail && existingEmails.has(normEmail)) { (result as any).skipped_email_dup_db++; continue; }
        // Dedup dentro do batch
        if (normPhone && seenPhonesBatch.has(normPhone)) { (result as any).skipped_dup_batch++; continue; }
        if (normEmail && seenEmailsBatch.has(normEmail)) { (result as any).skipped_dup_batch++; continue; }
        if (normPhone) seenPhonesBatch.add(normPhone);
        if (normEmail) seenEmailsBatch.add(normEmail);

        const interest = `${form.name || form.id}${lead.platform ? ` • ${String(lead.platform).toUpperCase()}` : ""}`;

        const { data: inserted, error: insertErr } = await crmAdmin
          .from("leads")
          .insert({
            name,
            phone: formatPhoneE164(phone) || phone,
            email,
            city,
            interest,
            entrada_desejada: entradaDesejada,
            ja_investe_em_imoveis: jaInvesteImoveis,
            status: "lead_novo",
          })
          .select("id")
          .single();

        if (insertErr) {
          (result as any).errors++;
          (result.error_messages as string[]).push(`insert err: ${insertErr.message}`);
          continue;
        }
        try { await crmAdmin.rpc("distribute_lead", { _lead_id: inserted.id }); } catch (_) {}

        await cloudAdmin.from("webhook_logs").insert({
          event_type: "leadgen_sync", page_id: PAGE_ID, leadgen_id: lead.id,
          form_id: form.id, status: "success", lead_id: inserted.id,
          payload: { form_name: form.name, scope: "last_24h" },
        });
        (result as any).created++;
      }
      nextUrl = data.paging?.next || null;
    }
  }

  await cloudAdmin.from("webhook_logs").insert({
    event_type: "reimport_result", status: "completed", payload: result,
  });
  console.log("Reimport 24h completed", JSON.stringify(result));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  (globalThis as any).EdgeRuntime.waitUntil(doImport());
  return new Response(JSON.stringify({ ok: true, message: "Reimport (last 24h, com dedup DB) started. Veja webhook_logs.reimport_result." }), {
    status: 202,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
