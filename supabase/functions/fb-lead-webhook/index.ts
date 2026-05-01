// ============================================================
// Edge Function: fb-lead-webhook
// ------------------------------------------------------------
// Recebe leads do Facebook Lead Ads (webhook) e:
//  1) Insere o lead na tabela `leads`
//  2) Atribui automaticamente ao próximo corretor ativo
//     usando a função SQL `distribute_lead` (round-robin atômico)
//
// Endpoints:
//  GET  → verificação do webhook (hub.challenge)
//  POST → recebe payload de leadgen
//
// Variáveis necessárias (já existem no Supabase por padrão):
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//
// Variáveis a adicionar manualmente:
//   - FB_VERIFY_TOKEN  (string que você define ao registrar o webhook no Meta)
//   - FB_PAGE_TOKEN    (Page Access Token p/ buscar dados do lead via Graph API)
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FB_VERIFY_TOKEN = Deno.env.get("FB_VERIFY_TOKEN") || "";
const FB_PAGE_TOKEN_ENV = Deno.env.get("FB_PAGE_TOKEN") || "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function getFbToken(): Promise<string> {
  try {
    const { data } = await admin.from("integration_secrets").select("value").eq("name", "FB_PAGE_TOKEN").maybeSingle();
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

  try {
    const payload = await req.json();
    const entries = payload?.entry ?? [];
    const created: string[] = [];

    for (const entry of entries) {
      const changes = entry.changes ?? [];
      for (const change of changes) {
        if (change.field !== "leadgen") continue;
        const leadgenId = change.value?.leadgen_id;
        if (!leadgenId) continue;

        // Busca dados completos do lead na Graph API
        const details = await fetchLeadDetails(leadgenId);
        const fields = details?.field_data
          ? parseFields(details.field_data)
          : { name: "Lead Facebook", phone: "", email: null, city: null, interest: null };

        // Insere o lead
        const { data: lead, error: insertErr } = await admin
          .from("leads")
          .insert({
            name: fields.name,
            phone: fields.phone,
            email: fields.email,
            city: fields.city,
            interest: fields.interest,
            status: "novo",
          })
          .select()
          .single();

        if (insertErr || !lead) {
          console.error("insert lead failed:", insertErr);
          continue;
        }

        // Round-robin: pega próximo corretor ativo
        const { data: assignedTo, error: distErr } = await admin.rpc("distribute_lead", {
          _lead_id: lead.id,
        });
        if (distErr) console.error("distribute_lead failed:", distErr);

        created.push(lead.id);
        console.log(`Lead ${lead.id} criado e atribuído a ${assignedTo}`);
      }
    }

    return new Response(JSON.stringify({ ok: true, created }), {
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
