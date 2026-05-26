// Deploys named functions from this repo to the external Supabase project
// using SB_DEPLOY_ACCESS_TOKEN (Supabase Management API).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXTERNAL_PROJECT_REF = "gycrprnkuwlzntqvpoxl";

const ADMIN_RESET_PASSWORD_SRC = `import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");
    const admin = createClient(SB_URL, SB_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "master").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Apenas o usuário Master pode redefinir senhas" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const targetUserId = (body.user_id || "").trim();
    const newPassword = body.new_password || "";
    if (!targetUserId) return new Response(JSON.stringify({ error: "user_id obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }});
    if (newPassword.length < 6) return new Response(JSON.stringify({ error: "A senha precisa ter pelo menos 6 caracteres" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }});

    const { error: updErr } = await admin.auth.admin.updateUserById(targetUserId, { password: newPassword });
    if (updErr) return new Response(JSON.stringify({ error: updErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }});

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
`;

const AUTO_FILL_LEADS_SRC = `import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_LEADS_NOVO = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const SB_URL = Deno.env.get("SUPABASE_URL")!;
    const SB_ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(SB_URL, SB_ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida", detail: userErr?.message }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SB_URL, SB_SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: corretores } = await admin
      .from("profiles").select("id, name").eq("is_active", true)
      .order("last_received_at", { ascending: true, nullsFirst: true });

    if (!corretores?.length) {
      return new Response(JSON.stringify({ ok: true, message: "Nenhum corretor ativo", assigned: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: novoLeads } = await admin
      .from("leads").select("tenant_id").eq("status", "lead_novo").not("tenant_id", "is", null);

    const counts = new Map();
    (novoLeads || []).forEach((l) => counts.set(l.tenant_id, (counts.get(l.tenant_id) || 0) + 1));

    const needs = [];
    for (const c of corretores) {
      const need = MAX_LEADS_NOVO - (counts.get(c.id) || 0);
      if (need > 0) needs.push({ id: c.id, need });
    }
    if (needs.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "Todos os corretores já têm 10 leads novos", assigned: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const totalNeeded = needs.reduce((s, n) => s + n.need, 0);
    const { data: unassigned } = await admin
      .from("leads").select("id").eq("status", "lead_novo").is("tenant_id", null)
      .order("created_at", { ascending: true }).limit(totalNeeded);

    if (!unassigned?.length) {
      return new Response(JSON.stringify({ ok: true, message: "Sem leads novos não atribuídos disponíveis", assigned: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let idx = 0, totalAssigned = 0;
    const assignments = [];
    for (const lead of unassigned) {
      if (idx >= needs.length) break;
      const corretor = needs[idx];
      assignments.push({ lead_id: lead.id, corretor_id: corretor.id });
      corretor.need--;
      totalAssigned++;
      if (corretor.need <= 0) idx++;
    }

    for (const a of assignments) {
      await admin.from("leads").update({ tenant_id: a.corretor_id }).eq("id", a.lead_id);
    }
    const brokerIds = [...new Set(assignments.map((a) => a.corretor_id))];
    for (const bId of brokerIds) {
      await admin.from("profiles").update({ last_received_at: new Date().toISOString() }).eq("id", bId);
    }

    return new Response(JSON.stringify({ ok: true, assigned: totalAssigned, brokers: brokerIds.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
`;

const SOURCES: Record<string, string> = {
  "admin-reset-password": ADMIN_RESET_PASSWORD_SRC,
  "auto-fill-leads": AUTO_FILL_LEADS_SRC,
};

async function deployFn(slug: string, src: string, token: string) {
  const meta = { name: slug, verify_jwt: false, entrypoint_path: "index.ts" };
  const boundary = "----deploy" + crypto.randomUUID();
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  parts.push(enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n`));
  parts.push(enc.encode(JSON.stringify(meta)));
  parts.push(enc.encode(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="index.ts"\r\nContent-Type: application/typescript\r\n\r\n`));
  parts.push(enc.encode(src));
  parts.push(enc.encode(`\r\n--${boundary}--\r\n`));
  const total = parts.reduce((s, p) => s + p.length, 0);
  const bodyBuf = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { bodyBuf.set(p, off); off += p.length; }

  const url = `https://api.supabase.com/v1/projects/${EXTERNAL_PROJECT_REF}/functions/deploy?slug=${slug}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/form-data; boundary=${boundary}` },
    body: bodyBuf,
  });
  return { slug, status: res.status, body: await res.text() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const token = Deno.env.get("SB_DEPLOY_ACCESS_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "SB_DEPLOY_ACCESS_TOKEN missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let slugs: string[] = Object.keys(SOURCES);
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body?.slugs) && body.slugs.length) slugs = body.slugs;
      else if (typeof body?.slug === "string") slugs = [body.slug];
    } else {
      const url = new URL(req.url);
      const q = url.searchParams.get("slug");
      if (q) slugs = [q];
    }
  } catch (_) { /* ignore */ }

  const results = [];
  for (const s of slugs) {
    if (!SOURCES[s]) { results.push({ slug: s, status: 404, body: "unknown slug" }); continue; }
    results.push(await deployFn(s, SOURCES[s], token));
  }
  const ok = results.every((r) => r.status >= 200 && r.status < 300);
  return new Response(JSON.stringify({ ok, results }), {
    status: ok ? 200 : 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
