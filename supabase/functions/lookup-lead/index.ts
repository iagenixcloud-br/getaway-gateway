import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
const EXT_SERVICE = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
const crmAdmin = createClient(EXT_URL, EXT_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

function norm(p: string) {
  let d = (p || "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { phones } = await req.json();
  const targets = (phones || []).map(norm).filter(Boolean);

  const { data: leads } = await crmAdmin
    .from("leads")
    .select("id, name, phone, status, tenant_id, created_at")
    .limit(5000);

  const { data: profiles } = await crmAdmin.from("profiles").select("id, name");
  const pmap = new Map((profiles || []).map((p: any) => [p.id, p.name]));

  const results: Record<string, any[]> = {};
  for (const t of targets) {
    results[t] = (leads || [])
      .filter((l: any) => norm(l.phone || "") === t)
      .map((l: any) => ({ ...l, corretor: pmap.get(l.tenant_id) || null }));
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
