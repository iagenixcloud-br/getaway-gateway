// ============================================================
// Edge Function: auto-fill-leads
// Redistribui leads não atribuídos (tenant_id IS NULL) para
// manter cada corretor ativo com até 10 leads em "lead_novo".
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_LEADS_NOVO = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Auth: validate caller is authenticated on external CRM
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
    const EXT_SERVICE = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");

    const crmAdmin = createClient(EXT_URL, EXT_SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Validate token
    const { data: { user }, error: userErr } = await crmAdmin.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Get active brokers ordered by round-robin (least recently received first)
    const { data: corretores } = await crmAdmin
      .from("profiles")
      .select("id, name")
      .eq("is_active", true)
      .order("last_received_at", { ascending: true, nullsFirst: true });

    if (!corretores?.length) {
      return new Response(JSON.stringify({ ok: true, message: "Nenhum corretor ativo", assigned: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Count lead_novo per corretor
    const { data: novoLeads } = await crmAdmin
      .from("leads")
      .select("tenant_id")
      .eq("status", "lead_novo")
      .not("tenant_id", "is", null);

    const counts = new Map<string, number>();
    (novoLeads || []).forEach((l: any) => {
      counts.set(l.tenant_id, (counts.get(l.tenant_id) || 0) + 1);
    });

    // 3. Calculate how many leads each corretor needs
    const needs: { id: string; need: number }[] = [];
    for (const c of corretores) {
      const current = counts.get(c.id) || 0;
      const need = MAX_LEADS_NOVO - current;
      if (need > 0) {
        needs.push({ id: c.id, need });
      }
    }

    if (needs.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "Todos os corretores já têm 10 leads novos", assigned: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Get unassigned leads (lead_novo with no tenant)
    const totalNeeded = needs.reduce((sum, n) => sum + n.need, 0);
    const { data: unassigned } = await crmAdmin
      .from("leads")
      .select("id")
      .eq("status", "lead_novo")
      .is("tenant_id", null)
      .order("created_at", { ascending: true })
      .limit(totalNeeded);

    if (!unassigned?.length) {
      return new Response(JSON.stringify({ ok: true, message: "Sem leads novos não atribuídos disponíveis", assigned: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Distribute leads round-robin among brokers that need them
    let idx = 0;
    let totalAssigned = 0;
    const assignments: { lead_id: string; corretor_id: string }[] = [];

    for (const lead of unassigned) {
      if (idx >= needs.length) break;

      const corretor = needs[idx];
      assignments.push({ lead_id: lead.id, corretor_id: corretor.id });
      corretor.need--;
      totalAssigned++;

      if (corretor.need <= 0) {
        idx++;
      }
    }

    // 6. Execute assignments
    for (const a of assignments) {
      await crmAdmin
        .from("leads")
        .update({ tenant_id: a.corretor_id })
        .eq("id", a.lead_id);
    }

    // Update last_received_at for brokers that got leads
    const brokerIds = [...new Set(assignments.map((a) => a.corretor_id))];
    for (const bId of brokerIds) {
      await crmAdmin
        .from("profiles")
        .update({ last_received_at: new Date().toISOString() })
        .eq("id", bId);
    }

    console.log(`Auto-fill: ${totalAssigned} leads distribuídos para ${brokerIds.length} corretores`);

    return new Response(JSON.stringify({ ok: true, assigned: totalAssigned, brokers: brokerIds.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-fill-leads error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
