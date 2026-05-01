// ============================================================
// Edge Function: fb-lead-webhook
// ------------------------------------------------------------
// Recebe leads do Facebook Lead Ads (webhook) e grava no
// Supabase PRINCIPAL do CRM (projeto externo gycrprnkuwlzntqvpoxl)
// usando as variáveis EXTERNAL_SUPABASE_URL e
// EXTERNAL_SUPABASE_SERVICE_ROLE_KEY.
//
// Endpoints:
//  GET  → verificação do webhook (hub.challenge)
//  POST → recebe payload de leadgen
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const FB_VERIFY_TOKEN = Deno.env.get("FB_VERIFY_TOKEN") || "";
const FB_PAGE_TOKEN_ENV = Deno.env.get("FB_PAGE_TOKEN") || "";

// Supabase do Lovable Cloud (apenas para ler o FB_PAGE_TOKEN salvo em integration_secrets)
const CLOUD_URL = Deno.env.get("SUPABASE_URL")!;
const CLOUD_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cloudAdmin = createClient(CLOUD_URL, CLOUD_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Supabase PRINCIPAL (CRM) — onde gravamos os leads
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

async function fetchLeadDetails(leadgenId: string) {
  const token = await getFbToken();
  if (!token) return null;
  const url = `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${token}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return await res.json();
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
  };
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
    return new Response(
      JSON.stringify({ error: "CRM database not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const payload = await req.json();
    const entries = payload?.entry ?? [];
    const created: string[] = [];
    const errors: unknown[] = [];

    for (const entry of entries) {
      const changes = entry.changes ?? [];
      for (const change of changes) {
        if (change.field !== "leadgen") continue;
        const leadgenId = change.value?.leadgen_id;
        if (!leadgenId) continue;

        // Tenta buscar dados completos do lead na Graph API
        const details = await fetchLeadDetails(leadgenId);

        let fields: ReturnType<typeof parseFields>;
        if (details?.field_data) {
          fields = parseFields(details.field_data);
        } else if (change.value?._test_data) {
          // Fallback para leads de teste enviados pela função fb-test-lead
          const t = change.value._test_data;
          fields = {
            name: t.name || "Lead Teste",
            phone: t.phone || "",
            email: t.email || null,
            city: t.city || null,
            interest: t.interest || null,
          };
        } else {
          fields = { name: "Lead Facebook", phone: "", email: null, city: null, interest: null };
        }

        // Insere o lead no Supabase do CRM
        const { data: lead, error: insertErr } = await crmAdmin
          .from("leads")
          .insert({
            name: fields.name,
            phone: fields.phone,
            email: fields.email,
            city: fields.city,
            interest: fields.interest,
            status: "lead_novo",
          })
          .select()
          .single();

        if (insertErr || !lead) {
          console.error("insert lead failed:", insertErr);
          errors.push(insertErr?.message || "insert failed");
          continue;
        }

        // Round-robin: pega próximo corretor ativo (se a função existir no CRM)
        try {
          const { error: distErr } = await crmAdmin.rpc("distribute_lead", {
            _lead_id: lead.id,
          });
          if (distErr) console.warn("distribute_lead skipped:", distErr.message);
        } catch (e) {
          console.warn("distribute_lead not available:", e);
        }

        created.push(lead.id);
        console.log(`Lead ${lead.id} criado no CRM (${fields.name})`);
      }
    }

    return new Response(JSON.stringify({ ok: true, created, errors }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("webhook error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
