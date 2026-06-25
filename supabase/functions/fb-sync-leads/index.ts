import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const PAGE_ID = "101491475744542";
const APP_AUTH_URL = "https://gycrprnkuwlzntqvpoxl.supabase.co";
const APP_AUTH_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5Y3Jwcm5rdXdsem50cXZwb3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNzEyMzQsImV4cCI6MjA5MjY0NzIzNH0.w7RiS6L4gir4KIKWAZxdmXutyp7EDxIu9z62n0QUoRM";

const CLOUD_URL = Deno.env.get("SUPABASE_URL")!;
const CLOUD_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
const EXT_SERVICE = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;

const cloudAdmin = createClient(CLOUD_URL, CLOUD_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
const crmAdmin = createClient(EXT_URL, EXT_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { error: json({ ok: false, error: "Não autenticado" }, 401) };

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const { data: userData, error: userErr } = await crmAdmin.auth.getUser(token);
  if (userErr || !userData?.user) return { error: json({ ok: false, error: "Sessão inválida" }, 401) };

  // Verifica role no mesmo backend que emitiu o JWT, usando service role (bypass RLS).
  const { data: roleRows, error: roleErr } = await crmAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);

  if (roleErr) {
    console.error("fb-sync-leads role lookup failed", { user_id: userData.user.id, message: roleErr.message });
    return { error: json({ ok: false, error: "Não foi possível validar permissões de administrador" }, 500) };
  }

  const roles = (roleRows || []).map((r: any) => r.role);
  if (!roles.includes("admin") && !roles.includes("master")) {
    console.warn("fb-sync-leads forbidden", { user_id: userData.user.id, roles });
    return { error: json({ ok: false, error: "Apenas administradores podem sincronizar leads" }, 403) };
  }
  return { user: userData.user };
}

async function getFbToken() {
  const { data } = await cloudAdmin.from("integration_secrets").select("value").eq("name", "FB_PAGE_TOKEN").maybeSingle();
  return data?.value || Deno.env.get("FB_PAGE_TOKEN") || "";
}

function fieldValue(fieldData: Array<{ name: string; values?: string[] }>, keys: string[]) {
  for (const key of keys) {
    const found = fieldData.find((field) => field.name?.toLowerCase().includes(key));
    if (found?.values?.[0]) return found.values[0];
  }
  return null;
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0+/, "");
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
      (digits.length === 12 && digits.startsWith("0")) ||
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

function cleanFbValue(v: string | null): string | null {
  if (!v) return v;
  return v.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function parseLead(lead: any, formName: string) {
  const fieldData = Array.isArray(lead.field_data) ? lead.field_data : [];
  const name = fieldValue(fieldData, ["full_name", "first_name", "nome", "name"]) || "Lead Facebook";
  const whatsapp = fieldValue(fieldData, ["whatsapp"]);
  const phone = fieldValue(fieldData, ["phone_number", "phone", "telefone", "celular"]) || whatsapp || "";
  const email = fieldValue(fieldData, ["email", "e-mail"]);
  const city = fieldValue(fieldData, ["city", "cidade"]);
  const entrada_desejada = cleanFbValue(fieldValue(fieldData, ["entrada"]));
  const ja_investe_em_imoveis = cleanFbValue(fieldValue(fieldData, ["investe", "investidor"]));

  return {
    name,
    phone: formatPhoneE164(phone) || phone,
    email,
    city,
    interest: `${formName}${lead.platform ? ` • ${String(lead.platform).toUpperCase()}` : ""}`,
    entrada_desejada,
    ja_investe_em_imoveis,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Método não permitido" }, 405);

  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  let body: { max_pages?: number; limit?: number; since?: string; today_only?: boolean } = {};
  try { body = await req.json(); } catch { body = {}; }

  const maxPages = Math.min(Math.max(Number(body.max_pages || 3), 1), 10);
  const limit = Math.min(Math.max(Number(body.limit || 50), 10), 100);

  // Filtro por data: se today_only=true, usa início do dia UTC; se since="YYYY-MM-DD", usa essa data
  let sinceTimestamp: number | null = null;
  if (body.today_only) {
    const now = new Date();
    sinceTimestamp = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000);
  } else if (body.since) {
    const parsed = new Date(body.since);
    if (!isNaN(parsed.getTime())) {
      sinceTimestamp = Math.floor(parsed.getTime() / 1000);
    }
  }
  const token = await getFbToken();
  if (!token) return json({ ok: false, error: "Token do Facebook não configurado" }, 500);

  const result = { forms_checked: 0, fetched: 0, created: 0, skipped: 0, errors: [] as string[] };

  async function fbFetchJson(url: string, context: string) {
    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const res = await fetch(url);
        const text = await res.text();
        let data: any;
        try { data = JSON.parse(text); }
        catch {
          const snippet = text.slice(0, 200).replace(/\s+/g, " ");
          throw new Error(`${context}: resposta não-JSON do Facebook (HTTP ${res.status}). Token provavelmente inválido/expirado. Prévia: ${snippet}`);
        }
        if (!res.ok || data?.error) {
          const code = data?.error?.code;
          const isTransient = res.status >= 500 || code === 1 || code === 2 || code === 4 || code === 17 || code === 32 || code === 613;
          if (isTransient && attempt < 4) {
            await new Promise((r) => setTimeout(r, 500 * attempt));
            continue;
          }
          throw new Error(`${context}: ${data?.error?.message || `HTTP ${res.status}`}`);
        }
        return data;
      } catch (e) {
        lastErr = e;
        const msg = e instanceof Error ? e.message : String(e);
        // Erros de rede: connection reset, EOF, timeout, etc.
        const isNetErr = /connection (reset|error|closed)|client error \(SendRequest\)|error sending request|UnexpectedEof|os error|timed out|ECONNRESET|network/i.test(msg);
        if (isNetErr && attempt < 4) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
        throw e;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  try {
    // 1. Get active forms
    const formsData = await fbFetchJson(
      `https://graph.facebook.com/v21.0/${PAGE_ID}/leadgen_forms?fields=id,name,status&limit=100&access_token=${encodeURIComponent(token)}`,
      "listar formulários"
    );

    const activeForms = (formsData.data || []).filter((f: any) => f.status === "ACTIVE");
    result.forms_checked = activeForms.length;

    // 1b. Load active corretores and their current lead counts for round-robin with cap
    const MAX_LEADS_PER_CORRETOR = 10;
    const [{ data: corretoresRaw }, { data: allLeads }, { data: existingLeads }, { data: existingLogs }] = await Promise.all([
      crmAdmin.from("profiles").select("id, name, is_active, last_received_at").eq("is_active", true).order("last_received_at", { ascending: true, nullsFirst: true }),
      crmAdmin.from("leads").select("tenant_id").eq("status", "lead_novo").not("tenant_id", "is", null).limit(5000),
      crmAdmin.from("leads").select("phone").limit(5000),
      cloudAdmin.from("webhook_logs").select("leadgen_id").not("leadgen_id", "is", null).limit(5000),
    ]);

    const leadCounts = new Map<string, number>();
    (allLeads || []).forEach((l: any) => {
      leadCounts.set(l.tenant_id, (leadCounts.get(l.tenant_id) || 0) + 1);
    });

    const activeCorretores = (corretoresRaw || []).filter((c: any) => c.is_active !== false);
    let corretorIndex = 0;

    function getNextCorretor(): string | null {
      if (activeCorretores.length === 0) return null;
      for (let i = 0; i < activeCorretores.length; i++) {
        const idx = (corretorIndex + i) % activeCorretores.length;
        const c = activeCorretores[idx];
        const count = leadCounts.get(c.id) || 0;
        if (count < MAX_LEADS_PER_CORRETOR) {
          corretorIndex = (idx + 1) % activeCorretores.length;
          leadCounts.set(c.id, count + 1);
          return c.id;
        }
      }
      return null;
    }

    const existingPhones = new Set(
      (existingLeads || []).map((l: any) => normalizePhone(l.phone || "")).filter(Boolean)
    );
    const existingLeadgenIds = new Set(
      (existingLogs || []).map((l: any) => l.leadgen_id).filter(Boolean)
    );

    // Collect batches for bulk insert
    const leadsToInsert: any[] = [];
    const logsToInsert: any[] = [];

    // 2. Process each form — collect leads into batches
    for (const form of activeForms) {
      let baseUrl = `https://graph.facebook.com/v21.0/${form.id}/leads?fields=id,created_time,field_data,platform&limit=${limit}&access_token=${encodeURIComponent(token)}`;
      if (sinceTimestamp) {
        const filterJson = JSON.stringify([{ field: "time_created", operator: "GREATER_THAN", value: sinceTimestamp }]);
        baseUrl += `&filtering=${encodeURIComponent(filterJson)}`;
      }
      let nextUrl: string | null = baseUrl;

      for (let page = 0; nextUrl && page < maxPages; page++) {
        const data = await fbFetchJson(nextUrl, `leads do formulário ${form.id}`);

        for (const lead of data.data || []) {
          result.fetched++;

          // Server-side date filter fallback — skip leads older than requested date
          if (sinceTimestamp && lead.created_time) {
            const leadTs = Math.floor(new Date(lead.created_time).getTime() / 1000);
            if (leadTs <= sinceTimestamp) {
              result.skipped++;
              continue;
            }
          }

          if (existingLeadgenIds.has(lead.id)) {
            result.skipped++;
            continue;
          }

          const fields = parseLead(lead, form.name || form.id);
          const normPhone = normalizePhone(fields.phone);

          if (normPhone && existingPhones.has(normPhone)) {
            result.skipped++;
            existingLeadgenIds.add(lead.id);
            logsToInsert.push({
              event_type: "leadgen_sync", page_id: PAGE_ID, leadgen_id: lead.id,
              form_id: form.id, status: "skipped_duplicate",
              payload: { form_name: form.name, phone: fields.phone },
            });
            continue;
          }

          const assignTo = getNextCorretor();
          leadsToInsert.push({ ...fields, status: "lead_novo", tenant_id: assignTo, _leadgen_id: lead.id, _form_id: form.id, _form_name: form.name, _platform: lead.platform, _created_time: lead.created_time });
          existingLeadgenIds.add(lead.id);
          if (normPhone) existingPhones.add(normPhone);
          result.created++;
        }
        nextUrl = data.paging?.next || null;
      }
    }

    // 3. Insert leads one-by-one (evita perder lote inteiro por duplicidade intra-batch)
    for (const src of leadsToInsert) {
      const { _leadgen_id, _form_id, _form_name, _platform, _created_time, ...row } = src;
      const { data: inserted, error: insertErr } = await crmAdmin
        .from("leads")
        .insert(row)
        .select("id")
        .single();

      if (insertErr || !inserted) {
        // 23505 = unique violation (telefone duplicado) — conta como skip, não como erro
        if ((insertErr as any)?.code === "23505") {
          result.skipped++;
          result.created--;
          logsToInsert.push({
            event_type: "leadgen_sync", page_id: PAGE_ID, leadgen_id: _leadgen_id,
            form_id: _form_id, status: "skipped_duplicate",
            payload: { form_name: _form_name, reason: "unique_constraint_phone" },
          });
          continue;
        }
        result.errors.push(`insert err (${_leadgen_id}): ${insertErr?.message || "falha"}`);
        result.created--;
        continue;
      }

      logsToInsert.push({
        event_type: "leadgen_sync", page_id: PAGE_ID, leadgen_id: _leadgen_id,
        form_id: _form_id, status: "success", lead_id: inserted.id,
        payload: { form_name: _form_name, platform: _platform, fields: { name: row.name, phone: row.phone, email: row.email, city: row.city, interest: row.interest }, created_time: _created_time },
      });
    }

    // 4. Batch insert webhook logs (chunks of 100)
    for (let i = 0; i < logsToInsert.length; i += 100) {
      const chunk = logsToInsert.slice(i, i + 100);
      await cloudAdmin.from("webhook_logs").insert(chunk);
    }

    console.log("Sync completed", result);
    return json({ ok: true, status: "completed", filter: sinceTimestamp ? { since: new Date(sinceTimestamp * 1000).toISOString(), today_only: !!body.today_only } : "all", ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Sync failed", msg);
    return json({ ok: false, status: "failed", error: msg, ...result }, 500);
  }
});
