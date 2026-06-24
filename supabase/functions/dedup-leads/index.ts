import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
const EXT_SERVICE = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
const crmAdmin = createClient(EXT_URL, EXT_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const CLOUD_URL = Deno.env.get("SUPABASE_URL")!;
const CLOUD_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const CLOUD_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function requireAdmin(req: Request, requireMaster = false): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const token = authHeader.slice("Bearer ".length);
  const userClient = createClient(CLOUD_URL, CLOUD_ANON, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: claims, error } = await userClient.auth.getClaims(token);
  if (error || !claims?.claims?.sub) {
    return new Response(JSON.stringify({ error: "Sessão inválida" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const admin = createClient(CLOUD_URL, CLOUD_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", claims.claims.sub);
  const set = new Set((roles ?? []).map((r: any) => r.role));
  const ok = requireMaster ? set.has("master") : (set.has("master") || set.has("admin"));
  if (!ok) {
    return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const denied = await requireAdmin(req, true);
  if (denied) return denied;

  // Fetch all leads
  const { data: leads, error } = await crmAdmin.from("leads").select("id, phone, created_at").order("created_at", { ascending: true }).limit(5000);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Group by normalized phone, keep the FIRST (oldest)
  const phoneMap = new Map<string, string>();
  const toDelete: string[] = [];

  for (const lead of leads || []) {
    const norm = (lead.phone || "").replace(/\D/g, "").replace(/^0+/, "");
    if (!norm) continue;
    if (phoneMap.has(norm)) {
      toDelete.push(lead.id);
    } else {
      phoneMap.set(norm, lead.id);
    }
  }

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
