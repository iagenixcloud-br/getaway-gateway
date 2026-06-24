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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { data: leads, error } = await crmAdmin.from("leads").select("id, name, phone, email, status, created_at").order("created_at", { ascending: false }).limit(2000);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const total = leads?.length || 0;

  const statusCounts: Record<string, number> = {};
  leads?.forEach((l: any) => {
    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
  });

  const phoneMap = new Map<string, any[]>();
  leads?.forEach((l: any) => {
    const norm = (l.phone || "").replace(/\D/g, "").replace(/^0+/, "");
    if (norm) {
      if (!phoneMap.has(norm)) phoneMap.set(norm, []);
      phoneMap.get(norm)!.push({ id: l.id, name: l.name, phone: l.phone, created_at: l.created_at });
    }
  });

  const duplicatePhones: any[] = [];
  phoneMap.forEach((entries, phone) => {
    if (entries.length > 1) duplicatePhones.push({ phone, count: entries.length, entries });
  });

  const emailMap = new Map<string, any[]>();
  leads?.forEach((l: any) => {
    const norm = (l.email || "").toLowerCase().trim();
    if (norm) {
      if (!emailMap.has(norm)) emailMap.set(norm, []);
      emailMap.get(norm)!.push({ id: l.id, name: l.name, email: l.email, created_at: l.created_at });
    }
  });

  const duplicateEmails: any[] = [];
  emailMap.forEach((entries, email) => {
    if (entries.length > 1) duplicateEmails.push({ email, count: entries.length, entries });
  });

  return new Response(JSON.stringify({
    total,
    status_counts: statusCounts,
    unique_phones: phoneMap.size,
    duplicate_phones_groups: duplicatePhones.length,
    duplicate_phones_total_extra: duplicatePhones.reduce((s, d) => s + d.count - 1, 0),
    duplicate_phones: duplicatePhones,
    unique_emails: emailMap.size,
    duplicate_emails_groups: duplicateEmails.length,
    duplicate_emails: duplicateEmails,
  }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
