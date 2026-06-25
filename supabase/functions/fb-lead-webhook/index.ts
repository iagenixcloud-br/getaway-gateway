// ============================================================
// Edge Function: fb-lead-webhook
// Recebe leads do Facebook Lead Ads (webhook) e grava no
// Supabase PRINCIPAL do CRM + loga em webhook_logs no Cloud.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const FB_VERIFY_TOKEN = Deno.env.get("FB_VERIFY_TOKEN") || "";
const FB_PAGE_TOKEN_ENV = Deno.env.get("FB_PAGE_TOKEN") || "";

const CLOUD_URL = Deno.env.get("SUPABASE_URL")!;
const CLOUD_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cloudAdmin = createClient(CLOUD_URL, CLOUD_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL");
const EXT_SERVICE = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
const crmAdmin = (EXT_URL && EXT_SERVICE)
  ? createClient(EXT_URL, EXT_SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

async function getFbToken(): Promise<string> {
  try {
    const { data } = await cloudAdmin
      .from("integration_secrets")
      .select("value")
      .eq("name", "FB_PAGE_TOKEN")
      .maybeSingle();
    if (data?.value) return data.value;
  } catch (_) { /* fallback */ }
  return FB_PAGE_TOKEN_ENV;
}

interface LeadFieldData {
  name: string;
  values: string[];
}

// Normaliza telefone para comparação (apenas dígitos, sem DDI 55)
function normalizePhone(phone: string): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  return digits;
}

// Normaliza telefone: BR -> "+55 DD 9XXXXXXXX", estrangeiro -> "+DDIXXXXXXXX" (E.164).
// Retorna null se não der para validar (caller cai no fallback do número original).
function formatPhoneE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  // BR: só vira BR quando tem cara de BR (evita confundir 12 dígitos estrangeiros sem + com BR).
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

  // Internacional (com ou sem +): grava SEMPRE com + na frente.
  if (digits.length >= 8 && digits.length <= 15 && /^[1-9]/.test(digits)) {
    return `+${digits}`;
  }

  return null;
}

async function fetchLeadDetails(leadgenId: string) {
  const token = await getFbToken();
  if (!token) return null;
  const fields = encodeURIComponent("id,created_time,field_data,platform");
  const url = `https://graph.facebook.com/v25.0/${leadgenId}?fields=${fields}&access_token=${token}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return await res.json();
}

function startOfTodaySaoPauloTimestamp() {
  const brDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return Math.floor(new Date(`${brDate}T00:00:00-03:00`).getTime() / 1000);
}

function cleanFbValue(v: string | null): string | null {
  if (!v) return v;
  return v.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function parseFields(fieldData: LeadFieldData[]) {
  const get = (keys: string[]) => {
    for (const k of keys) {
      const f = fieldData.find((x) => x.name?.toLowerCase().includes(k));
      if (f && f.values?.[0]) return f.values[0];
    }
    return null;
  };
  return {
    name: get(["full_name", "name", "nome"]) || "Lead Facebook",
    phone: get(["phone", "telefone", "celular"]) || "",
    email: get(["email", "e-mail"]),
    city: get(["city", "cidade"]),
    interest: get(["property", "imovel", "interesse", "message"]),
    entrada_desejada: cleanFbValue(get(["entrada"])),
    ja_investe_em_imoveis: cleanFbValue(get(["investe", "investidor"])),
  };
}

async function logWebhook(log: {
  event_type: string;
  page_id?: string;
  leadgen_id?: string;
  form_id?: string;
  status: string;
  error_message?: string;
  payload?: unknown;
  lead_id?: string;
}) {
  try {
    await cloudAdmin.from("webhook_logs").insert({
      event_type: log.event_type,
      page_id: log.page_id || null,
      leadgen_id: log.leadgen_id || null,
      form_id: log.form_id || null,
      status: log.status,
      error_message: log.error_message || null,
      payload: log.payload || null,
      lead_id: log.lead_id || null,
    });
  } catch (e) {
    console.error("Failed to log webhook:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 1) Verificação do webhook (Meta envia GET na hora do registro)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token === FB_VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }

  if (!crmAdmin) {
    console.error("EXTERNAL_SUPABASE_URL/KEY não configurados");
    await logWebhook({
      event_type: "system",
      status: "error",
      error_message: "EXTERNAL_SUPABASE_URL/KEY não configurados",
    });
    return new Response(
      JSON.stringify({ error: "CRM database not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    // Verify Facebook HMAC signature (X-Hub-Signature-256) before processing
    const rawBody = await req.text();
    const FB_APP_SECRET = Deno.env.get("FB_APP_SECRET") || "";
    const sigHeader = req.headers.get("x-hub-signature-256") || "";
    if (!FB_APP_SECRET) {
      console.error("FB_APP_SECRET not configured");
      await logWebhook({ event_type: "system", status: "error", error_message: "FB_APP_SECRET not configured" });
      return new Response(JSON.stringify({ error: "server misconfigured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!sigHeader.startsWith("sha256=")) {
      await logWebhook({ event_type: "leadgen", status: "error", error_message: "missing x-hub-signature-256" });
      return new Response(JSON.stringify({ error: "invalid signature" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const provided = sigHeader.slice("sha256=".length).toLowerCase();
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(FB_APP_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const expected = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (expected.length !== provided.length) {
      await logWebhook({ event_type: "leadgen", status: "error", error_message: "signature length mismatch" });
      return new Response(JSON.stringify({ error: "invalid signature" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
    if (diff !== 0) {
      await logWebhook({ event_type: "leadgen", status: "error", error_message: "invalid signature" });
      return new Response(JSON.stringify({ error: "invalid signature" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const payload = JSON.parse(rawBody);
    const entries = payload?.entry ?? [];
    const created: string[] = [];
    const errors: unknown[] = [];

    for (const entry of entries) {
      const changes = entry.changes ?? [];
      for (const change of changes) {
        if (change.field !== "leadgen") continue;
        const leadgenId = change.value?.leadgen_id;
        const formId = change.value?.form_id || null;
        const pageId = entry.id || change.value?.page_id || null;
        if (!leadgenId) continue;

        // Dedup por leadgen_id: se já processamos esse evento da Meta, pula
        // (Meta reenvia o mesmo evento se não receber 200 OK rápido)
        const { data: prevLog } = await cloudAdmin
          .from("webhook_logs")
          .select("id, lead_id, status")
          .eq("leadgen_id", leadgenId)
          .in("status", ["success", "skipped_duplicate"])
          .limit(1)
          .maybeSingle();
        if (prevLog) {
          console.log(`Leadgen ${leadgenId} já processado, pulando`);
          await logWebhook({
            event_type: "leadgen",
            page_id: pageId,
            leadgen_id: leadgenId,
            form_id: formId,
            status: "skipped_duplicate",
            lead_id: prevLog.lead_id,
            payload: { reason: "leadgen_id_already_processed" },
          });
          continue;
        }

        // Tenta buscar dados completos do lead na Graph API
        const details = await fetchLeadDetails(leadgenId);

        // Segurança: não deixa webhook reprocessar lead antigo se a Meta reenviar histórico.
        if (details?.created_time) {
          const leadTs = Math.floor(new Date(details.created_time).getTime() / 1000);
          if (leadTs < startOfTodaySaoPauloTimestamp()) {
            await logWebhook({
              event_type: "leadgen",
              page_id: pageId,
              leadgen_id: leadgenId,
              form_id: formId,
              status: "skipped_old_lead",
              payload: { created_time: details.created_time, reason: "older_than_today_brt" },
            });
            continue;
          }
        }

        let fields: ReturnType<typeof parseFields>;
        if (details?.field_data) {
          fields = parseFields(details.field_data);
        } else if (change.value?._test_data) {
          const t = change.value._test_data;
          fields = {
            name: t.name || "Lead Teste",
            phone: t.phone || "",
            email: t.email || null,
            city: t.city || null,
            interest: t.interest || null,
            entrada_desejada: t.entrada_desejada || null,
            ja_investe_em_imoveis: t.ja_investe_em_imoveis || null,
          };
        } else {
          fields = { name: "Lead Facebook", phone: "", email: null, city: null, interest: null, entrada_desejada: null, ja_investe_em_imoveis: null };
        }


        // Determine next corretor (max 10 leads with status "lead_novo" each)
        const MAX_LEADS = 10;
        let assignTo: string | null = null;
        try {
          const { data: corretores } = await crmAdmin
            .from("profiles")
            .select("id")
            .eq("is_active", true)
            .order("last_received_at", { ascending: true, nullsFirst: true });

          if (corretores?.length) {
            const { data: countData } = await crmAdmin
              .from("leads")
              .select("tenant_id")
              .eq("status", "lead_novo")
              .not("tenant_id", "is", null);

            const counts = new Map<string, number>();
            (countData || []).forEach((l: any) => {
              counts.set(l.tenant_id, (counts.get(l.tenant_id) || 0) + 1);
            });

            for (const c of corretores) {
              if ((counts.get(c.id) || 0) < MAX_LEADS) {
                assignTo = c.id;
                break;
              }
            }
          }
        } catch (e) {
          console.warn("corretor assignment failed:", e);
        }

        // Dedup: se já existe lead com mesmo telefone normalizado, pula
        const normPhone = normalizePhone(fields.phone);
        if (normPhone) {
          const { data: existing } = await crmAdmin
            .from("leads")
            .select("id, phone")
            .limit(2000);
          const dup = (existing || []).find(
            (l: any) => normalizePhone(l.phone || "") === normPhone
          );
          if (dup) {
            console.log(`Lead duplicado ignorado (phone=${fields.phone}, existing=${dup.id})`);
            await logWebhook({
              event_type: "leadgen",
              page_id: pageId,
              leadgen_id: leadgenId,
              form_id: formId,
              status: "skipped_duplicate",
              lead_id: dup.id,
              payload: { fields, reason: "phone_already_exists" },
            });
            continue;
          }
        }

        // Insere o lead no Supabase do CRM
        const { data: lead, error: insertErr } = await crmAdmin
          .from("leads")
          .insert({
            name: fields.name,
            phone: formatPhoneE164(fields.phone) || fields.phone,
            email: fields.email,
            city: fields.city,
            interest: fields.interest,
            entrada_desejada: fields.entrada_desejada,
            ja_investe_em_imoveis: fields.ja_investe_em_imoveis,
            status: "lead_novo",
            tenant_id: assignTo,
          })
          .select()
          .single();

        if (insertErr || !lead) {
          // Erro 23505 = violação do índice único leads_phone_unique → duplicado
          if (insertErr?.code === "23505") {
            console.log(`Insert bloqueado pelo índice único (phone=${fields.phone})`);
            await logWebhook({
              event_type: "leadgen",
              page_id: pageId,
              leadgen_id: leadgenId,
              form_id: formId,
              status: "skipped_duplicate",
              payload: { fields, reason: "unique_constraint_phone" },
            });
            continue;
          }

          console.error("insert lead failed:", insertErr);
          errors.push(insertErr?.message || "insert failed");

          await logWebhook({
            event_type: "leadgen",
            page_id: pageId,
            leadgen_id: leadgenId,
            form_id: formId,
            status: "error",
            error_message: insertErr?.message || "insert failed",
            payload: { fields, change_value: change.value },
          });
          continue;
        }

        created.push(lead.id);
        console.log(`Lead ${lead.id} criado no CRM (${fields.name})`);

        // Registra a atribuição da roleta de forma atômica:
        // - profiles.last_received_at = now() (avança a fila)
        // - profiles.total_received += 1
        // - insert em lead_assignments com source='webhook'
        if (assignTo) {
          try {
            const { error: rpcErr } = await crmAdmin.rpc("registrar_atribuicao_roleta", {
              p_lead_id: lead.id,
              p_corretor_id: assignTo,
              p_source: "webhook",
            });
            if (rpcErr) {
              console.error("registrar_atribuicao_roleta (webhook) error", {
                lead_id: lead.id,
                corretor_id: assignTo,
                source: "webhook",
                message: rpcErr.message,
                details: (rpcErr as any).details,
                hint: (rpcErr as any).hint,
                code: (rpcErr as any).code,
              });
            }
          } catch (e) {
            console.error("registrar_atribuicao_roleta (webhook) threw", {
              lead_id: lead.id,
              corretor_id: assignTo,
              source: "webhook",
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }

        // Log de sucesso
        await logWebhook({
          event_type: "leadgen",
          page_id: pageId,
          leadgen_id: leadgenId,
          form_id: formId,
          status: "success",
          lead_id: lead.id,
          payload: { fields, form_id: formId },
        });
      }
    }

    // Delay artificial para cadenciar as notificações de rajadas da Meta,
    // evitando que o mesmo corretor seja bombardeado com dezenas de avisos
    // simultâneos no WhatsApp/n8n.
    await new Promise((resolve) => setTimeout(resolve, 3000));

    return new Response(JSON.stringify({ ok: true, created, errors }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("webhook error:", e);
    await logWebhook({
      event_type: "unknown",
      status: "error",
      error_message: e instanceof Error ? e.message : "unknown",
    });
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
