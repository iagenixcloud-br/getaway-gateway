// Temporary function to delete all mocked/test leads from external CRM DB
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL");
  const EXT_KEY = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
  if (!EXT_URL || !EXT_KEY) {
    return new Response(JSON.stringify({ error: "External DB not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const crm = createClient(EXT_URL, EXT_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Delete ALL leads (user wants clean slate for real FB leads)
  const { data, error } = await crm.from("leads").delete().neq("id", "00000000-0000-0000-0000-000000000000").select("id");

  return new Response(JSON.stringify({ ok: !error, deleted: data?.length ?? 0, error: error?.message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
