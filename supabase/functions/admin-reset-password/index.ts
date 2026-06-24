// ============================================================
// Edge Function: admin-reset-password
// ------------------------------------------------------------
// Permite que um usuário com role 'master' redefina a senha
// de qualquer usuário no CRM externo.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  user_id: string;
  new_password: string;
}

Deno.serve(async (req) => {
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL")!;
    const EXT_SERVICE = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY")!;
    const token = authHeader.replace("Bearer ", "");

    const admin = createClient(EXT_URL, EXT_SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerRoles, error: roleErr } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "master"]);

    if (roleErr) {
      return new Response(
        JSON.stringify({ error: `Erro ao verificar role: ${roleErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const callerRoleSet = new Set((callerRoles ?? []).map((r) => r.role));
    if (!callerRoleSet.has("master")) {
      return new Response(
        JSON.stringify({ error: "Apenas o Admin Master pode redefinir senhas" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const callerIsMaster = true;

    const body = (await req.json()) as Body;
    const targetUserId = (body.user_id || "").trim();
    const newPassword = body.new_password || "";

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "user_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha precisa ter pelo menos 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Admin comum não pode redefinir a senha de um Admin Master
    if (!callerIsMaster) {
      const { data: targetRoles, error: targetRoleErr } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", targetUserId)
        .eq("role", "master");
      if (targetRoleErr) {
        return new Response(
          JSON.stringify({ error: `Erro ao verificar usuário alvo: ${targetRoleErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if ((targetRoles ?? []).length > 0) {
        return new Response(
          JSON.stringify({ error: "Apenas o Admin Master pode redefinir a senha de outro Admin Master." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    });

    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
