import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
const EXT_SERVICE = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GOOGLE_SHEETS_API_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY");
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

const crmAdmin = createClient(EXT_URL, EXT_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { error: json({ ok: false, error: "Não autenticado" }, 401) };

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const { data: userData, error: userErr } = await crmAdmin.auth.getUser(token);
  if (userErr || !userData?.user) {
    return { error: json({ ok: false, error: "Sessão inválida" }, 401) };
  }

  const { data: roleRows, error: roleErr } = await crmAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);

  if (roleErr) {
    console.error("export-leads-to-sheets role lookup failed", roleErr);
    return { error: json({ ok: false, error: "Não foi possível validar permissões" }, 500) };
  }

  const roles = (roleRows || []).map((r: any) => r.role);
  if (!roles.includes("admin") && !roles.includes("master")) {
    return { error: json({ ok: false, error: "Apenas administradores podem exportar" }, 403) };
  }
  return { user: userData.user };
}

const statusLabels: Record<string, string> = {
  lead_novo: "Lead Novo",
  negocio: "Negócio",
  agendamento: "Agendamento",
  visita: "Visita",
  proposta: "Proposta",
  venda: "Venda",
  perda: "Perda",
  cliente_futuro: "Cliente Futuro",
  curioso: "Curioso",
  follow_up: "Follow-up",
};

function statusLabel(s: string | null) {
  return statusLabels[s || ""] || s || "—";
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  } catch {
    return iso;
  }
}

function normalizeRows(rows: any[]) {
  return rows.map((r) => [
    r.name || "",
    r.phone || "",
    r.email || "",
    statusLabel(r.status),
    r.substatus || "",
    r.arquivado ? "Sim" : "Não",
    r.corretor || "",
    formatDate(r.created_at),
    r.city || "",
    r.interest || "",
  ]);
}

async function fetchLeads(filters: {
  status: string[];
  tenant_id?: string;
  since: string;
  incluirArquivados: boolean;
}) {
  let q = crmAdmin
    .from("leads")
    .select("id,name,phone,email,status,substatus,city,interest,created_at,tenant_id,arquivado")
    .gte("created_at", filters.since)
    .order("created_at", { ascending: false })
    .limit(10000);

  if (!filters.incluirArquivados) q = q.eq("arquivado", false);
  if (filters.status.length > 0) q = q.in("status", filters.status);
  if (filters.tenant_id) q = q.eq("tenant_id", filters.tenant_id);

  const { data, error } = await q;
  if (error) throw new Error(`Erro ao buscar leads: ${error.message}`);
  return data || [];
}

async function fetchCorretorNames() {
  const { data, error } = await crmAdmin.from("profiles").select("id,name,email");
  if (error) {
    console.warn("export-leads-to-sheets: falha ao buscar corretores", error);
    return {};
  }
  const map: Record<string, string> = {};
  (data || []).forEach((p: any) => {
    map[p.id] = p.name || p.email || "";
  });
  return map;
}

async function createSpreadsheet(title: string) {
  const res = await fetch(`${GATEWAY_URL}/spreadsheets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": `${GOOGLE_SHEETS_API_KEY}`,
    },
    body: JSON.stringify({ properties: { title } }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Sheets create failed [${res.status}]: ${text}`);
  }
  return (await res.json()) as { spreadsheetId: string; spreadsheetUrl: string };
}

async function writeValues(spreadsheetId: string, values: any[][]) {
  const range = `A1:J${values.length}`;
  const res = await fetch(
    `${GATEWAY_URL}/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": `${GOOGLE_SHEETS_API_KEY}`,
      },
      body: JSON.stringify({ values }),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Sheets write failed [${res.status}]: ${text}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Método não permitido" }, 405);

  const admin = await requireAdmin(req);
  if (admin.error) return admin.error;

  if (!LOVABLE_API_KEY || !GOOGLE_SHEETS_API_KEY) {
    return json(
      {
        ok: false,
        error:
          "Conector Google Sheets não configurado. Vá em Configurações > Conectores > Google Sheets e crie/conecte uma conexão ao projeto.",
      },
      503,
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Corpo da requisição inválido" }, 400);
  }

  const filters = {
    status: Array.isArray(body.status) ? body.status : [],
    tenant_id: body.tenant_id || undefined,
    since: body.since || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    incluirArquivados: !!body.incluirArquivados,
  };

  try {
    const [leads, corretores] = await Promise.all([fetchLeads(filters), fetchCorretorNames()]);

    const rows = leads.map((r: any) => ({ ...r, corretor: r.tenant_id ? corretores[r.tenant_id] || "—" : "—" }));
    const headers = [["Nome", "Telefone", "Email", "Status", "Substatus", "Arquivado", "Corretor", "Data entrada", "Cidade", "Interesse"]];
    const values = headers.concat(normalizeRows(rows));

    if (values.length <= 1) {
      return json({ ok: false, error: "Nenhum lead encontrado com os filtros selecionados" }, 400);
    }

    const title = body.title || `Leads ${new Date().toLocaleDateString("pt-BR")}`;
    const { spreadsheetId, spreadsheetUrl } = await createSpreadsheet(title);
    await writeValues(spreadsheetId, values);

    return json({ ok: true, spreadsheetId, spreadsheetUrl, count: rows.length });
  } catch (e: any) {
    console.error("export-leads-to-sheets error", e);
    return json({ ok: false, error: e.message || "Erro interno" }, 500);
  }
});
