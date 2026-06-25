// One-shot: insere SOMENTE 3 leads informados pelo usuário.
// Italo, Daine, Lucas — sem sync, sem seed, sem janela de tempo.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CLOUD_URL = Deno.env.get("SUPABASE_URL")!;
const CLOUD_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cloudAdmin = createClient(CLOUD_URL, CLOUD_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
const EXT_SERVICE = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
const crmAdmin = createClient(EXT_URL, EXT_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LEADS = [
  { name: "Italo",  phone: "+55 32 988138793" },
  { name: "Daine",  phone: "+55 21 979056620" },
  { name: "Lucas",  phone: "+55 21 993714193" },
];

function digits(s: string) {
  let d = (s || "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const results: any[] = [];
  const MAX = 10;

  // existing phones once
  const { data: existing } = await crmAdmin.from("leads").select("id, phone").limit(5000);
  const existingDigits = new Set((existing || []).map((l: any) => digits(l.phone || "")));

  for (const L of LEADS) {
    const d = digits(L.phone);
    if (existingDigits.has(d)) {
      results.push({ name: L.name, phone: L.phone, status: "skipped_duplicate" });
      continue;
    }

    // pick next corretor (cap 10 lead_novo)
    const { data: corretores } = await crmAdmin
      .from("profiles")
      .select("id")
      .eq("is_active", true)
      .order("last_received_at", { ascending: true, nullsFirst: true });

    let assignTo: string | null = null;
    if (corretores?.length) {
      const { data: countData } = await crmAdmin
        .from("leads")
        .select("tenant_id")
        .eq("status", "lead_novo")
        .not("tenant_id", "is", null);
      const counts = new Map<string, number>();
      (countData || []).forEach((l: any) => counts.set(l.tenant_id, (counts.get(l.tenant_id) || 0) + 1));
      for (const c of corretores) {
        if ((counts.get(c.id) || 0) < MAX) { assignTo = c.id; break; }
      }
    }

    const { data: lead, error } = await crmAdmin
      .from("leads")
      .insert({
        name: L.name,
        phone: L.phone,
        status: "lead_novo",
        tenant_id: assignTo,
      })
      .select()
      .single();

    if (error || !lead) {
      results.push({ name: L.name, phone: L.phone, status: "error", error: error?.message });
      continue;
    }

    if (assignTo) {
      try {
        await crmAdmin.rpc("registrar_atribuicao_roleta", {
          p_lead_id: lead.id,
          p_corretor_id: assignTo,
          p_source: "manual_insert",
        });
      } catch (e) {
        console.warn("roleta rpc failed:", e);
      }
    }

    try {
      await cloudAdmin.from("webhook_logs").insert({
        event_type: "manual_insert",
        status: "success",
        lead_id: lead.id,
        payload: { name: L.name, phone: L.phone, reason: "user_reported_missing_3_leads" },
      });
    } catch (_) { /* noop */ }

    existingDigits.add(d);
    results.push({ name: L.name, phone: L.phone, status: "inserted", lead_id: lead.id, tenant_id: assignTo });
  }

  // final count
  const { count } = await crmAdmin
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("status", "lead_novo");

  return new Response(JSON.stringify({ ok: true, results, lead_novo_total: count }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
