// One-shot: adiciona coluna `origem` em public.leads no CRM externo (gycrprnkuwlzntqvpoxl)
// e ajusta RLS de INSERT para permitir corretor (próprio tenant_id) e admin (qualquer tenant_id).
// Roda via Supabase Management API usando SB_DEPLOY_ACCESS_TOKEN.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXTERNAL_PROJECT_REF = "gycrprnkuwlzntqvpoxl";

const SQL = `
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'trafego_pago';

CREATE INDEX IF NOT EXISTS leads_origem_idx ON public.leads(origem);

-- Garante que a coluna arquivado existe (default false) para a UI filtrar corretamente
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS arquivado boolean NOT NULL DEFAULT false;

-- Policies de INSERT para indicação manual
-- 1) corretor comum: pode inserir apenas com tenant_id = auth.uid()
DROP POLICY IF EXISTS "Corretor insere indicacao propria" ON public.leads;
CREATE POLICY "Corretor insere indicacao propria"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = auth.uid()
  AND origem = 'manual_indicacao'
);

-- 2) admin: pode inserir indicação manual com qualquer tenant_id
DROP POLICY IF EXISTS "Admin insere indicacao qualquer corretor" ON public.leads;
CREATE POLICY "Admin insere indicacao qualquer corretor"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND origem = 'manual_indicacao'
);
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = Deno.env.get("SB_DEPLOY_ACCESS_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "SB_DEPLOY_ACCESS_TOKEN missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = `https://api.supabase.com/v1/projects/${EXTERNAL_PROJECT_REF}/database/query`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: SQL }),
    });
    const body = await res.text();
    return new Response(JSON.stringify({ ok: res.ok, status: res.status, body }), {
      status: res.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
