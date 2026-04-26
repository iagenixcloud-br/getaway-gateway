// ============================================================
// Edge Function: send-daily-report
// ------------------------------------------------------------
// Monta o relatório do dia (contagem por status, desempenho por
// corretor, alertas e métricas) e dispara um POST para o webhook
// do n8n configurado em report_settings. O n8n cuida de enviar
// o WhatsApp para cada número da lista.
//
// Modos:
//   - manual:     chamada com Authorization Bearer (admin)
//   - scheduled:  chamada pelo pg_cron com header x-cron-secret
//
// Body (opcional): { mode?: "manual" | "scheduled" }
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("REPORT_CRON_SECRET") || "";

interface LeadRow {
  id: string;
  name: string;
  status: string | null;
  tenant_id: string | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  name: string;
}

const STATUS_ORDER = [
  "novo",
  "atrasado",
  "visitar",
  "agendados",
  "favoritos",
  "fechado",
  "arquivados",
] as const;

const STATUS_LABEL: Record<string, string> = {
  novo: "🆕 Novos",
  atrasado: "⏰ Atrasados",
  visitar: "🚗 A Visitar",
  agendados: "📅 Agendados",
  favoritos: "⭐ Favoritos",
  fechado: "✅ Fechados",
  arquivados: "📁 Arquivados",
};

function normalizeStatus(s: string | null): string {
  const n = (s || "").toLowerCase().trim();
  if (n === "novo lead" || n === "new") return "novo";
  if (n === "agendado") return "agendados";
  if (n === "favorito") return "favoritos";
  if (n === "negocio fechado" || n === "negócio fechado") return "fechado";
  if (n === "arquivado") return "arquivados";
  return STATUS_ORDER.includes(n as typeof STATUS_ORDER[number]) ? n : "novo";
}

function hoursSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
}

function buildReport(leads: LeadRow[], profiles: ProfileRow[]) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  // Contagem por status (TODOS leads do pipeline)
  const porStatus: Record<string, number> = {};
  for (const s of STATUS_ORDER) porStatus[s] = 0;
  for (const l of leads) {
    const s = normalizeStatus(l.status);
    porStatus[s] = (porStatus[s] || 0) + 1;
  }

  // Métricas do dia
  const novosHoje = leads.filter((l) => new Date(l.created_at).getTime() >= startOfDay).length;
  const fechadosHoje = leads.filter(
    (l) => normalizeStatus(l.status) === "fechado" &&
      new Date(l.created_at).getTime() >= startOfDay,
  ).length;
  const totalAtivos = leads.filter(
    (l) => !["fechado", "arquivados"].includes(normalizeStatus(l.status)),
  ).length;
  const conversao = leads.length > 0
    ? ((leads.filter((l) => normalizeStatus(l.status) === "fechado").length / leads.length) * 100).toFixed(1)
    : "0.0";

  // Desempenho por corretor
  const profileById = new Map(profiles.map((p) => [p.id, p.name]));
  const porCorretor = new Map<string, { name: string; total: number; ativos: number; fechados: number }>();
  for (const l of leads) {
    if (!l.tenant_id) continue;
    const name = profileById.get(l.tenant_id) || "—";
    const row = porCorretor.get(l.tenant_id) || { name, total: 0, ativos: 0, fechados: 0 };
    row.total++;
    const s = normalizeStatus(l.status);
    if (s === "fechado") row.fechados++;
    else if (!["arquivados"].includes(s)) row.ativos++;
    porCorretor.set(l.tenant_id, row);
  }
  const corretoresArr = Array.from(porCorretor.values()).sort((a, b) => b.ativos - a.ativos);

  // Alertas: leads ativos sem contato há > 8h e atrasados
  const atrasados = leads.filter((l) => normalizeStatus(l.status) === "atrasado").length;
  const urgentes = leads.filter((l) => {
    const s = normalizeStatus(l.status);
    return !["fechado", "arquivados"].includes(s) && hoursSince(l.created_at) > 24;
  }).length;

  // Monta texto formatado pro WhatsApp
  const data = today.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  const hora = today.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const linhas: string[] = [];
  linhas.push(`*📊 RELATÓRIO DIÁRIO — ANDRADE IMOBILIÁRIA*`);
  linhas.push(`_${data} • ${hora}_`);
  linhas.push("");
  linhas.push(`*📈 MÉTRICAS DO DIA*`);
  linhas.push(`• Novos leads hoje: *${novosHoje}*`);
  linhas.push(`• Fechados hoje: *${fechadosHoje}*`);
  linhas.push(`• Pipeline ativo: *${totalAtivos}*`);
  linhas.push(`• Conversão geral: *${conversao}%*`);
  linhas.push("");
  linhas.push(`*📋 PIPELINE POR STATUS*`);
  for (const s of STATUS_ORDER) {
    if (porStatus[s] > 0) linhas.push(`${STATUS_LABEL[s]}: *${porStatus[s]}*`);
  }
  if (atrasados > 0 || urgentes > 0) {
    linhas.push("");
    linhas.push(`*🚨 ALERTAS*`);
    if (atrasados > 0) linhas.push(`⚠️ Leads atrasados: *${atrasados}*`);
    if (urgentes > 0) linhas.push(`🔥 Sem contato há +24h: *${urgentes}*`);
  }
  if (corretoresArr.length > 0) {
    linhas.push("");
    linhas.push(`*👥 DESEMPENHO POR CORRETOR*`);
    for (const c of corretoresArr.slice(0, 10)) {
      linhas.push(`• ${c.name}: ${c.ativos} ativos / ${c.fechados} fechados`);
    }
  }
  linhas.push("");
  linhas.push(`_Gerado automaticamente pelo sistema._`);

  return {
    text: linhas.join("\n"),
    summary: {
      data: today.toISOString(),
      novosHoje,
      fechadosHoje,
      totalAtivos,
      conversao: parseFloat(conversao),
      porStatus,
      porCorretor: corretoresArr,
      atrasados,
      urgentes,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === "scheduled" ? "scheduled" : "manual";

    // Auth
    if (mode === "scheduled") {
      const cronHeader = req.headers.get("x-cron-secret");
      if (!CRON_SECRET || cronHeader !== CRON_SECRET) {
        return new Response(JSON.stringify({ error: "Cron secret inválido" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Não autenticado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) {
        return new Response(JSON.stringify({ error: "Sessão inválida" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: isAdmin } = await userClient.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Apenas admin" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Carrega config
    const { data: settings, error: setErr } = await admin
      .from("report_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (setErr) throw setErr;
    if (!settings) {
      return new Response(JSON.stringify({ error: "Configuração não encontrada. Configure em /relatorios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const webhookUrl = settings.webhook_url as string | null;
    const numbers = (settings.recipient_numbers as string[] | null) ?? [];
    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: "Webhook do n8n não configurado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (numbers.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhum número cadastrado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carrega leads + profiles
    const [{ data: leads }, { data: profiles }] = await Promise.all([
      admin.from("leads").select("id,name,status,tenant_id,created_at"),
      admin.from("profiles").select("id,name"),
    ]);

    const report = buildReport((leads as LeadRow[]) || [], (profiles as ProfileRow[]) || []);

    // Dispara webhook n8n
    const payload = {
      mode,
      generated_at: new Date().toISOString(),
      recipients: numbers,
      message: report.text,
      summary: report.summary,
    };
    const n8nRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const n8nBody = await n8nRes.text();

    // Loga envio
    await admin.from("report_logs").insert({
      mode,
      recipients: numbers,
      message: report.text,
      success: n8nRes.ok,
      n8n_status: n8nRes.status,
      n8n_response: n8nBody.slice(0, 500),
    });

    if (!n8nRes.ok) {
      return new Response(
        JSON.stringify({ error: `n8n respondeu ${n8nRes.status}: ${n8nBody.slice(0, 200)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, recipients: numbers.length, preview: report.text }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("send-daily-report error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
