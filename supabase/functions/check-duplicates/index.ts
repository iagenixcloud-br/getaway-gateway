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
  const { data: leads, error } = await crmAdmin.from("leads").select("id, name, phone, email, status, created_at").order("created_at", { ascending: false }).limit(2000);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const total = leads?.length || 0;

  // Count by status
  const statusCounts: Record<string, number> = {};
  leads?.forEach((l: any) => {
    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
  });

  // Find phone duplicates
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
    if (entries.length > 1) {
      duplicatePhones.push({ phone, count: entries.length, entries });
    }
  });

  // Find email duplicates
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
    if (entries.length > 1) {
      duplicateEmails.push({ email, count: entries.length, entries });
    }
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
