// ============================================================
// Edge Function: seed-test-leads
// Cria leads sinteticos no CRM externo para teste do Kanban.
// NAO passa pela roleta (nao atualiza last_received_at, nao
// grava em lead_assignments). Apenas admin pode disparar.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CITIES = ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Curitiba"];
const INTERESTS = ["Apartamento 2 quartos", "Casa com quintal", "Cobertura"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const EXT_SERVICE = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
    if (!EXT_URL || !EXT_SERVICE) {
      return new Response(JSON.stringify({ error: "CRM externo nao configurado" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const crm = createClient(EXT_URL, EXT_SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Auth: precisa de Bearer e usuario precisa ser admin no CRM externo
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Nao autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await crm.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Sessao invalida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await crm
      .from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas admin pode gerar seed" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Body
    const body = await req.json().catch(() => ({}));
    const requested = Number(body?.count ?? 100);
    const count = Math.max(1, Math.min(500, Number.isFinite(requested) ? requested : 100));

    // Corretores ativos
    const { data: corretores, error: corrErr } = await crm
      .from("profiles").select("id, name").eq("is_active", true).order("name");
    if (corrErr) {
      return new Response(JSON.stringify({ error: corrErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!corretores?.length) {
      return new Response(JSON.stringify({ error: "Nenhum corretor ativo" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gera payloads
    const baseTs = Date.now();
    const perCorretor: Record<string, number> = {};
    const rows = Array.from({ length: count }, (_, i) => {
      const c = corretores[i % corretores.length];
      perCorretor[c.name] = (perCorretor[c.name] || 0) + 1;
      const idx = String(i + 1).padStart(3, "0");
      // Telefone sintetico unico: +5511 + (baseTs % 1e7) + idx
      const phoneSuffix = `${(baseTs % 10_000_000)}${idx}`.slice(-9);
      return {
        name: `Teste Seed #${idx}`,
        phone: `+5511${phoneSuffix}`,
        email: `seed-${idx}@teste.local`,
        city: CITIES[i % CITIES.length],
        interest: INTERESTS[i % INTERESTS.length],
        budget: 300_000 + Math.floor(Math.random() * 1_700_000),
        status: "lead_novo",
        origem: "seed_teste",
        tenant_id: c.id,
        arquivado: false,
      };
    });

    // Insert em batch unico
    const { data: inserted, error: insErr } = await crm
      .from("leads").insert(rows).select("id");

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message, hint: insErr.hint }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      created: inserted?.length ?? 0,
      perCorretor,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seed-test-leads error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
