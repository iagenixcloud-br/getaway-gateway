// ============================================================
// Edge Function: create-corretor
// ------------------------------------------------------------
// Cria um novo corretor (usuário no auth + role 'corretor')
// SEM trocar a sessão do admin que está chamando.
//
// Segurança:
//  1) Exige Authorization Bearer (JWT do admin logado)
//  2) Valida que o chamador tem role 'admin' usando has_role()
//  3) Usa SERVICE_ROLE_KEY apenas no servidor para criar o usuário
//
// Variáveis de ambiente necessárias (já existem por padrão no Supabase):
//   - SUPABASE_URL
//   - SUPABASE_ANON_KEY
//   - SUPABASE_SERVICE_ROLE_KEY
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CreateCorretorBody {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1) Verifica auth do chamador
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Cliente "como o usuário" — para validar a sessão e checar role
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Confere que é admin (via função has_role criada na migration)
    const { data: isAdminData, error: roleErr } = await userClient.rpc(
      "has_role",
      { _user_id: user.id, _role: "admin" },
    );

    if (roleErr) {
      return new Response(
        JSON.stringify({ error: `Erro ao verificar role: ${roleErr.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    if (!isAdminData) {
      return new Response(
        JSON.stringify({ error: "Apenas administradores podem cadastrar corretores" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 3) Lê e valida payload
    const body = (await req.json()) as CreateCorretorBody;
    const name = (body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const phone = (body.phone || "").trim() || null;

    if (!name || name.length > 100) {
      return new Response(JSON.stringify({ error: "Nome inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Senha precisa ter pelo menos 6 caracteres" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 4) Cliente admin — usa SERVICE_ROLE para criar o usuário
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 4a) Cria usuário já com email confirmado
    const { data: created, error: createErr } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, phone },
      });

    if (createErr || !created.user) {
      return new Response(
        JSON.stringify({ error: createErr?.message || "Falha ao criar usuário" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const newUserId = created.user.id;

    // 4b) Garante o profile (o trigger handle_new_user já deve ter criado;
    //     fazemos upsert por segurança caso o trigger falhe ou esteja desativado)
    const { error: profileErr } = await adminClient
      .from("profiles")
      .upsert(
        { id: newUserId, name, email, phone },
        { onConflict: "id" },
      );

    if (profileErr) {
      // Faz rollback: remove o usuário criado
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: `Falha ao salvar profile: ${profileErr.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 4c) Atribui role 'corretor'
    const { error: roleInsertErr } = await adminClient
      .from("user_roles")
      .insert({ user_id: newUserId, role: "corretor" });

    if (roleInsertErr) {
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ error: `Falha ao atribuir role: ${roleInsertErr.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 5) Sucesso
    return new Response(
      JSON.stringify({
        success: true,
        user: { id: newUserId, name, email, phone },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
