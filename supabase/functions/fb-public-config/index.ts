import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(
    JSON.stringify({ fb_app_id: Deno.env.get("FB_APP_ID") ?? null }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
