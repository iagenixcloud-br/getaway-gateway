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

  const { data: leads } = await crmAdmin.from("leads").select("interest").limit(5000);

  const counts: Record<string, number> = {};
  (leads || []).forEach((l: any) => {
    const key = l.interest || "(sem interesse)";
    counts[key] = (counts[key] || 0) + 1;
  });

  // Sort by count desc
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return new Response(JSON.stringify({ total: leads?.length, by_interest: Object.fromEntries(sorted) }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
