// ============================================================
// Edge Function: roleta-redistribute
// ------------------------------------------------------------
// Admin reatribui um lead a outro corretor manualmente.
// Body: { lead_id: string, corretor_id: string | null }
//   - corretor_id null = desatribui
// Loga a operação em lead_assignments com source='manual'.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// External CRM credentials (same as used by the app client)
const APP_AUTH_URL = "https://gycrprnkuwlzntqvpoxl.supabase.co";
const APP_AUTH_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5Y3Jwcm5rdXdsem50cXZwb3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNzEyMzQsImV4cCI6MjA5MjY0NzIzNH0.w7RiS6L4gir4KIKWAZxdmXutyp7EDxIu9z62n0QUoRM";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check against the CRM Supabase (where users/roles live)
    const userClient = createClient(APP_AUTH_URL, APP_AUTH_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleRow } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Apenas admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const leadId = body?.lead_id as string;
    const corretorId = (body?.corretor_id ?? null) as string | null;
    if (!leadId) {
      return new Response(JSON.stringify({ error: "lead_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use external CRM service role for data operations
    const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
    const EXT_SERVICE = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
    const crmAdmin = createClient(EXT_URL, EXT_SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Validação: máximo 10 leads por corretor ──
    const MAX_LEADS_PER_CORRETOR = 10;
    if (corretorId) {
      const { count, error: countErr } = await crmAdmin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", corretorId);
      if (countErr) {
        return new Response(JSON.stringify({ error: countErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if ((count ?? 0) >= MAX_LEADS_PER_CORRETOR) {
        return new Response(
          JSON.stringify({ error: `Corretor já atingiu o limite de ${MAX_LEADS_PER_CORRETOR} leads atribuídos.` }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const { error: updErr } = await crmAdmin
      .from("leads")
      .update({ tenant_id: corretorId })
      .eq("id", leadId);
    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await crmAdmin.from("lead_assignments").insert({
      lead_id: leadId,
      corretor_id: corretorId,
      source: "manual",
      assigned_by: user.id,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
