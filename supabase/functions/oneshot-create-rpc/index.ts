// ONE-SHOT: cria função registrar_atribuicao_roleta no CRM externo via
// Supabase Management API. SERÁ DELETADA logo após execução.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MGMT_TOKEN = Deno.env.get("SB_DEPLOY_ACCESS_TOKEN")!;
const EXT_REF = "gycrprnkuwlzntqvpoxl"; // CRM externo

async function runSql(query: string) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${EXT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MGMT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );
  const text = await res.text();
  let json: unknown;
  try { json = JSON.parse(text); } catch { json = text; }
  return { ok: res.ok, status: res.status, body: json };
}

const SQL_DROP_OLD = `
drop function if exists public.registrar_atribuicao_roleta(uuid,uuid,text);
`;

const SQL_CREATE = `
create or replace function public.registrar_atribuicao_roleta(
  p_lead_id uuid,
  p_corretor_id uuid,
  p_source text,
  p_skip_assignment boolean default false
) returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if p_source not in ('webhook','reimport','auto_fill') then
    raise exception 'source invalido: %', p_source;
  end if;
  if p_corretor_id is null then
    raise exception 'corretor_id obrigatorio';
  end if;

  update public.profiles
     set last_received_at = now(),
         total_received   = coalesce(total_received, 0) + 1
   where id = p_corretor_id;

  if not p_skip_assignment then
    insert into public.lead_assignments (lead_id, corretor_id, source, assigned_at)
    values (p_lead_id, p_corretor_id, p_source, now());
  end if;
end;
$fn$;
`;

const SQL_GRANT = `
grant execute on function public.registrar_atribuicao_roleta(uuid,uuid,text,boolean)
  to authenticated, service_role, anon;
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const out: Record<string, unknown> = {};

  // 1) Inspeciona distribute_lead
  out.distribute_lead = await runSql(`
    select proname, pg_get_functiondef(oid) as src
      from pg_proc
     where proname = 'distribute_lead'
       and pronamespace = 'public'::regnamespace;
  `);

  // 2) Schema profiles + lead_assignments
  out.columns = await runSql(`
    select table_name, column_name, data_type
      from information_schema.columns
     where table_schema = 'public'
       and table_name in ('profiles','lead_assignments')
     order by table_name, ordinal_position;
  `);

  // 3) Cria a RPC (dropa assinatura antiga sem boolean)
  out.drop_old = await runSql(SQL_DROP_OLD);
  out.create_rpc = await runSql(SQL_CREATE);
  out.grant = await runSql(SQL_GRANT);

  // 4) Verifica
  out.verify = await runSql(`
    select proname, pg_get_functiondef(oid) as src
      from pg_proc
     where proname = 'registrar_atribuicao_roleta'
       and pronamespace = 'public'::regnamespace;
  `);

  return new Response(JSON.stringify(out, null, 2), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
