// Deploys a named function from this repo to the external Supabase project
// using the SB_DEPLOY_ACCESS_TOKEN (personal access token / management API).
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const token = Deno.env.get("SB_DEPLOY_ACCESS_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "SB_DEPLOY_ACCESS_TOKEN missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const slug = "admin-reset-password";
  const meta = {
    name: slug,
    verify_jwt: false,
    entrypoint_path: "index.ts",
  };
  const boundary = "----deploy" + crypto.randomUUID();
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const pushField = (name: string, value: string, contentType = "text/plain") => {
    parts.push(enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\nContent-Type: ${contentType}\r\n\r\n`));
    parts.push(enc.encode(value));
    parts.push(enc.encode("\r\n"));
  };
  pushField("metadata", JSON.stringify(meta), "application/json");
  parts.push(enc.encode(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="index.ts"\r\nContent-Type: application/typescript\r\n\r\n`));
  parts.push(enc.encode(ADMIN_RESET_PASSWORD_SRC));
  parts.push(enc.encode(`\r\n--${boundary}--\r\n`));
  const total = parts.reduce((s, p) => s + p.length, 0);
  const bodyBuf = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { bodyBuf.set(p, off); off += p.length; }

  const url = `https://api.supabase.com/v1/projects/${EXTERNAL_PROJECT_REF}/functions/deploy?slug=${slug}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: bodyBuf,
  });
  const text = await res.text();
  return new Response(JSON.stringify({ status: res.status, body: text }), {
    status: res.ok ? 200 : 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
