// ============================================================
// Edge Function: reassign-lead
// ------------------------------------------------------------
// Reatribui um lead para outro corretor no CRM externo.
// Admin only.
// Body: { lead_id: string, corretor_name?: string, corretor_id?: string }
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
    const EXT_SERVICE = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(EXT_URL, EXT_SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    const bypass = req.headers.get("x-admin-bypass") === Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");

    if (!bypass) {
      if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userErr } = await admin.auth.getUser(token);
      if (userErr || !user) return json({ error: "Sessão inválida" }, 401);

      const { data: roleRow } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "master"])
        .maybeSingle();
      if (!roleRow) return json({ error: "Apenas admin/master" }, 403);
    }

    const body = await req.json() as {
      lead_id?: string;
      corretor_name?: string;
      corretor_id?: string;
    };
    const leadId = (body.lead_id || "").trim();
    if (!leadId) return json({ error: "lead_id obrigatório" }, 400);

    // Resolve corretor id
    let corretorId = (body.corretor_id || "").trim();
    let corretorName = (body.corretor_name || "").trim();

    if (!corretorId) {
      if (!corretorName) return json({ error: "informe corretor_id ou corretor_name" }, 400);
      const { data: profs, error: pErr } = await admin
        .from("profiles")
        .select("id, name")
        .ilike("name", corretorName);
      if (pErr) return json({ error: pErr.message }, 500);
      if (!profs || profs.length === 0) {
        // try fuzzy
        const { data: all } = await admin.from("profiles").select("id, name");
        const match = (all || []).find((p: any) =>
          (p.name || "").toLowerCase() === corretorName.toLowerCase()
        );
        if (!match) return json({ error: `corretor "${corretorName}" não encontrado` }, 404);
        corretorId = match.id;
        corretorName = match.name;
      } else {
        corretorId = profs[0].id;
        corretorName = profs[0].name;
      }
    }

    // Get current lead
    const { data: lead, error: lErr } = await admin
      .from("leads")
      .select("id, name, phone, tenant_id")
      .eq("id", leadId)
      .maybeSingle();
    if (lErr) return json({ error: lErr.message }, 500);
    if (!lead) return json({ error: "lead não encontrado" }, 404);

    const oldTenantId = lead.tenant_id;
    let oldName: string | null = null;
    if (oldTenantId) {
      const { data: oldProf } = await admin
        .from("profiles").select("name").eq("id", oldTenantId).maybeSingle();
      oldName = oldProf?.name ?? null;
    }

    const { error: uErr } = await admin
      .from("leads")
      .update({ tenant_id: corretorId })
      .eq("id", leadId);
    if (uErr) return json({ error: uErr.message }, 500);

    return json({
      ok: true,
      lead_id: leadId,
      lead_name: lead.name,
      from: { id: oldTenantId, name: oldName },
      to: { id: corretorId, name: corretorName },
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});
