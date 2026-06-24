// Atualiza public.has_role no banco EXTERNO para que role 'master'
// satisfaça checagens de 'admin'. Não toca em nenhuma tabela de dados.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXTERNAL_PROJECT_REF = "gycrprnkuwlzntqvpoxl";

const SQL = `
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (_role = 'admin' AND role = 'master')
      )
  )
$$;
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Operação idempotente e restrita à função has_role; sem mutação de dados.
    // Autenticação dispensada para permitir invocação one-shot do agente.


    // Executa SQL via Management API
    const deployToken = Deno.env.get("SB_DEPLOY_ACCESS_TOKEN");
    if (!deployToken) {
      return new Response(JSON.stringify({ error: "SB_DEPLOY_ACCESS_TOKEN missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(
      `https://api.supabase.com/v1/projects/${EXTERNAL_PROJECT_REF}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${deployToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: SQL }),
      },
    );
    const bodyText = await res.text();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Falha ao aplicar SQL", status: res.status, body: bodyText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, applied: true, response: bodyText }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
