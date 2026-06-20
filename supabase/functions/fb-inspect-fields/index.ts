// Read-only: inspeciona campos dos formulários do Facebook Lead Ads.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAGE_ID = "101491475744542";

async function getToken(): Promise<string> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (url && key) {
    try {
      const admin = createClient(url, key);
      const { data } = await admin.from("integration_secrets").select("value").eq("name", "FB_PAGE_TOKEN").maybeSingle();
      if (data?.value) return data.value;
    } catch (_) {}
  }
  return Deno.env.get("FB_PAGE_TOKEN") || "";
}

function matchKey(key: string, needles: string[]): boolean {
  const k = (key || "").toLowerCase();
  return needles.some((n) => k.includes(n));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = await getToken();
  if (!token) {
    return new Response(JSON.stringify({ error: "FB_PAGE_TOKEN ausente" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const formsRes = await fetch(
    `https://graph.facebook.com/v21.0/${PAGE_ID}/leadgen_forms?fields=id,name,status&limit=100&access_token=${encodeURIComponent(token)}`
  );
  const formsData = await formsRes.json();
  if (formsData.error) {
    return new Response(JSON.stringify({ error: formsData.error }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const activeForms = (formsData.data || []).filter((f: any) => f.status === "ACTIVE");
  const results: any[] = [];

  for (const form of activeForms) {
    // Schema
    const schemaRes = await fetch(
      `https://graph.facebook.com/v21.0/${form.id}?fields=questions{key,label,type}&access_token=${encodeURIComponent(token)}`
    );
    const schema = await schemaRes.json();
    const questions: Array<{ key: string; label: string; type?: string }> = schema.questions || [];

    // Leads recentes
    const leadsRes = await fetch(
      `https://graph.facebook.com/v21.0/${form.id}/leads?fields=id,created_time,field_data&limit=3&access_token=${encodeURIComponent(token)}`
    );
    const leadsData = await leadsRes.json();
    const leads = leadsData.data || [];

    // Coleta nomes que apareceram em field_data dos leads
    const fieldNamesInLeads = new Set<string>();
    for (const l of leads) {
      for (const fd of l.field_data || []) {
        if (fd?.name) fieldNamesInLeads.add(fd.name);
      }
    }

    const needlesEntrada = ["entrada"];
    const needlesInveste = ["investe", "investir", "investimento"];

    const entradaInSchema = questions.filter((q) => matchKey(q.key, needlesEntrada) || matchKey(q.label, needlesEntrada));
    const investeInSchema = questions.filter((q) => matchKey(q.key, needlesInveste) || matchKey(q.label, needlesInveste));

    const entradaInLeads = [...fieldNamesInLeads].filter((n) => matchKey(n, needlesEntrada));
    const investeInLeads = [...fieldNamesInLeads].filter((n) => matchKey(n, needlesInveste));

    // Sample dos valores preenchidos pra esses campos
    const sampleFor = (names: string[]) => {
      const out: any[] = [];
      for (const l of leads) {
        for (const fd of l.field_data || []) {
          if (names.includes(fd.name)) {
            out.push({ lead_id: l.id, created_time: l.created_time, name: fd.name, values: fd.values });
          }
        }
      }
      return out;
    };

    results.push({
      form_id: form.id,
      form_name: form.name,
      qual_entrada_desejada: {
        in_schema: entradaInSchema,
        in_recent_leads_field_names: entradaInLeads,
        sample_values: sampleFor(entradaInLeads),
      },
      ja_investe_em_imoveis: {
        in_schema: investeInSchema,
        in_recent_leads_field_names: investeInLeads,
        sample_values: sampleFor(investeInLeads),
      },
      all_question_keys: questions.map((q) => ({ key: q.key, label: q.label, type: q.type })),
      all_field_names_in_recent_leads: [...fieldNamesInLeads],
      recent_leads_count: leads.length,
    });
  }

  return new Response(JSON.stringify({ page_id: PAGE_ID, forms: results }, null, 2), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
