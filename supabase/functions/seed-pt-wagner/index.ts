// One-shot: cria lead PT de teste atribuído ao Wagner L. Pode deletar depois.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
  const EXT_SERVICE = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
  const crm = createClient(EXT_URL, EXT_SERVICE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Encontra Wagner L
  const { data: profiles, error: pErr } = await crm
    .from("profiles")
    .select("id, name, email")
    .ilike("name", "%wagner%");

  if (pErr) {
    return new Response(JSON.stringify({ error: pErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Filtra por "wagner l" ou "wagner " (primeiro match)
  const wagner = (profiles || []).find((p: any) =>
    /wagner\s*l/i.test(p.name || "")
  ) || (profiles || [])[0];

  if (!wagner) {
    return new Response(JSON.stringify({ error: "Wagner não encontrado", profiles }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Remove qualquer lead anterior com o mesmo telefone (variações de formato)
  const phoneVariants = ["+351912345678", "351912345678", "+351 912345678"];
  await crm.from("leads").delete().in("phone", phoneVariants);

  const { data: lead, error: iErr } = await crm
    .from("leads")
    .insert({
      name: "__TEST_PT_Wagner",
      phone: "+351912345678",
      email: null,
      city: "Lisboa",
      interest: "Teste internacional PT",
      status: "lead_novo",
      tenant_id: wagner.id,
    })
    .select()
    .single();

  if (iErr) {
    return new Response(JSON.stringify({ error: iErr.message, wagner }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    wagner: { id: wagner.id, name: wagner.name, email: wagner.email },
    lead: { id: lead.id, name: lead.name, phone: lead.phone, tenant_id: lead.tenant_id, status: lead.status },
  }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
