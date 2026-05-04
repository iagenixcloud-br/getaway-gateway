import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
  const EXT_SERVICE = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
  const crm = createClient(EXT_URL, EXT_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

  const body = await req.json().catch(() => ({}));
  const fix = body.fix === true; // If true, unassign excess leads
  const MAX = 10;

  // Get all corretores
  const { data: profiles } = await crm.from("profiles").select("id, name").order("name");

  // Get all assigned leads with status "lead_novo" (only these count toward cap)
  const { data: allLeads } = await crm.from("leads").select("id, tenant_id, created_at").eq("status", "lead_novo").not("tenant_id", "is", null).order("created_at", { ascending: true });

  // Group by corretor
  const grouped = new Map<string, { id: string; created_at: string }[]>();
  (allLeads || []).forEach((l: any) => {
    const arr = grouped.get(l.tenant_id) || [];
    arr.push({ id: l.id, created_at: l.created_at });
    grouped.set(l.tenant_id, arr);
  });

  const report: any[] = [];
  const unassigned: string[] = [];

  for (const [corretorId, leads] of grouped.entries()) {
    const name = (profiles || []).find((p: any) => p.id === corretorId)?.name || "Desconhecido";
    const excess = leads.length - MAX;
    const entry: any = { corretor: name, corretor_id: corretorId, total: leads.length, limit: MAX, excess: Math.max(0, excess) };

    if (fix && excess > 0) {
      // Keep the oldest 10, unassign the rest
      const sorted = leads.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const toUnassign = sorted.slice(MAX);
      const ids = toUnassign.map(l => l.id);

      const { error } = await crm.from("leads").update({ tenant_id: null }).in("id", ids);
      entry.unassigned_count = ids.length;
      entry.unassigned_error = error?.message || null;
      unassigned.push(...ids);
    }
    report.push(entry);
  }

  report.sort((a, b) => b.total - a.total);

  return new Response(JSON.stringify({
    total_corretores: report.length,
    total_assigned_leads: (allLeads || []).length,
    over_limit: report.filter(r => r.excess > 0).length,
    fix_applied: fix,
    leads_unassigned: unassigned.length,
    details: report,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
