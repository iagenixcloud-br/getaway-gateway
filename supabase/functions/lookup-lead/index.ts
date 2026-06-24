import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
const EXT_SERVICE = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
const crmAdmin = createClient(EXT_URL, EXT_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const CLOUD_URL = Deno.env.get("SUPABASE_URL")!;
const CLOUD_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const CLOUD_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function requireAdmin(req: Request): Promise<Response | null> {
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
  if (!(set.has("admin") || set.has("master"))) {
    return new Response(JSON.stringify({ error: "Acesso negado" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return null;
}

function norm(p: string) {
  let d = (p || "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const denied = await requireAdmin(req);
  if (denied) return denied;

  let body: any;
  try { body = await req.json(); } catch { body = {}; }
  const phonesRaw = body?.phones;
  if (!Array.isArray(phonesRaw) || phonesRaw.length === 0 || phonesRaw.length > 200) {
    return new Response(JSON.stringify({ error: "phones must be a non-empty array (max 200)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const targets = phonesRaw
    .filter((p: any) => typeof p === "string" && p.length <= 30)
    .map(norm)
    .filter(Boolean);

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
