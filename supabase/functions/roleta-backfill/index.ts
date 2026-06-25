// Repara a roleta: para cada lead com tenant_id mas sem linha em lead_assignments,
// chama registrar_atribuicao_roleta para avançar last_received_at + total_received
// e criar o registro de auditoria. Idempotente.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
const EXT_SERVICE = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
const crmAdmin = createClient(EXT_URL, EXT_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { error: json({ ok: false, error: "Não autenticado" }, 401) };
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const { data: userData, error: userErr } = await crmAdmin.auth.getUser(token);
  if (userErr || !userData?.user) return { error: json({ ok: false, error: "Sessão inválida" }, 401) };
  const { data: roleRows } = await crmAdmin.from("user_roles").select("role").eq("user_id", userData.user.id);
  const roles = (roleRows || []).map((r: any) => r.role);
  if (!roles.includes("admin") && !roles.includes("master")) {
    return { error: json({ ok: false, error: "Apenas administradores" }, 403) };
  }
  return { user: userData.user };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  try {
    // 1. Leads com tenant_id mas sem assignment
    const { data: assignedLeads } = await crmAdmin
      .from("lead_assignments").select("lead_id");
    const known = new Set((assignedLeads || []).map((r: any) => r.lead_id));

    const { data: leads, error: leadsErr } = await crmAdmin
      .from("leads")
      .select("id, tenant_id, created_at, name")
      .not("tenant_id", "is", null)
      .order("created_at", { ascending: true })
      .limit(2000);
    if (leadsErr) return json({ ok: false, error: leadsErr.message }, 500);

    const toFix = (leads || []).filter((l: any) => !known.has(l.id));

    let fixed = 0;
    const errors: string[] = [];
    for (const lead of toFix) {
      try {
        await crmAdmin.rpc("registrar_atribuicao_roleta", {
          p_lead_id: lead.id,
          p_corretor_id: lead.tenant_id,
          p_source: "backfill",
          p_skip_assignment: true,
        });
        fixed++;
      } catch (e) {
        errors.push(`${lead.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return json({
      ok: true,
      total_assigned_leads: leads?.length || 0,
      missing_from_roleta: toFix.length,
      fixed,
      errors,
      sample: toFix.slice(0, 10).map((l: any) => ({ id: l.id, name: l.name, created_at: l.created_at })),
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
