import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
const EXT_SERVICE = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
const crmAdmin = createClient(EXT_URL, EXT_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Fetch all leads
  const { data: leads, error } = await crmAdmin.from("leads").select("id, phone, created_at").order("created_at", { ascending: true }).limit(5000);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Group by normalized phone, keep the FIRST (oldest)
  const phoneMap = new Map<string, string>(); // norm_phone -> kept_id
  const toDelete: string[] = [];

  for (const lead of leads || []) {
    const norm = (lead.phone || "").replace(/\D/g, "").replace(/^0+/, "");
    if (!norm) continue;
    if (phoneMap.has(norm)) {
      toDelete.push(lead.id); // duplicate - delete this one
    } else {
      phoneMap.set(norm, lead.id); // keep this one
    }
  }

  // Delete duplicates in batches
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 50) {
    const batch = toDelete.slice(i, i + 50);
    const { error: delErr } = await crmAdmin.from("leads").delete().in("id", batch);
    if (!delErr) deleted += batch.length;
  }

  return new Response(JSON.stringify({
    total_before: leads?.length || 0,
    unique_kept: phoneMap.size,
    duplicates_deleted: deleted,
    total_after: (leads?.length || 0) - deleted,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
