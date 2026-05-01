// Dispara um lead de teste simulando o webhook do Facebook
// Bypassa a Lead Ads Testing Tool da Meta (que está com bug visual)
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const PAGE_ID = "101491475744542"; // Salles Imóveis
const PROJECT_REF = "lzgdvvapzmuogtlivzxa";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 1) Gera dados de teste
    const ts = Date.now();
    const fakeLead = {
      name: `Lead Teste ${new Date().toLocaleTimeString("pt-BR")}`,
      email: `teste+${ts}@andrademob.com.br`,
      phone: `+5511${String(ts).slice(-9)}`,
      interest: "Apartamento de teste (lead de validação)",
    };

    // 2) Monta o payload no formato exato do webhook do Facebook Leadgen
    const webhookPayload = {
      object: "page",
      entry: [
        {
          id: PAGE_ID,
          time: Math.floor(Date.now() / 1000),
          changes: [
            {
              field: "leadgen",
              value: {
                leadgen_id: `test_${ts}`,
                page_id: PAGE_ID,
                form_id: "test_form_simulado",
                adgroup_id: "test_ad",
                created_time: Math.floor(Date.now() / 1000),
                // Campos extras que o nosso webhook pode usar como fallback
                _test_data: fakeLead,
              },
            },
          ],
        },
      ],
    };

    // 3) Chama o webhook real (mesma URL que o Facebook chamaria)
    const webhookUrl = `https://${PROJECT_REF}.supabase.co/functions/v1/fb-lead-webhook`;
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    });

    const text = await res.text();

    // 4) Se o webhook não criou o lead (pq tentou buscar leadgen_id real na Meta), criamos direto
    let createdLead = null;
    let createdError = null;
    if (!res.ok || text.includes("error")) {
      const url = Deno.env.get("SUPABASE_URL");
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (url && key) {
        const admin = createClient(url, key);
        const { data, error } = await admin
          .from("leads")
          .insert({
            name: fakeLead.name,
            email: fakeLead.email,
            phone: fakeLead.phone,
            interest: fakeLead.interest,
            status: "lead_novo",
          })
          .select()
          .single();
        createdLead = data;
        createdError = error?.message ?? null;
      }
    }

    return new Response(
      JSON.stringify(
        {
          ok: true,
          message: "Lead de teste enviado.",
          fake_lead: fakeLead,
          webhook_response: { status: res.status, body: text.slice(0, 500) },
          fallback_insert: createdLead ? { ok: true, id: createdLead.id } : { ok: false, error: createdError },
        },
        null,
        2,
      ),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
