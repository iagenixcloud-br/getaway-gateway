## Objetivo

Garantir que toda atribuição automática de lead da roleta (tráfego pago) registre de forma consistente: `profiles.last_received_at`, `profiles.total_received` e `lead_assignments`. Sem backfill. Sem duplicar lógica.

## Mudanças

### 1) RPC `registrar_atribuicao_roleta` no CRM externo

Função SQL, `SECURITY DEFINER`, atômica:

```sql
create or replace function public.registrar_atribuicao_roleta(
  p_lead_id uuid, p_corretor_id uuid, p_source text
) returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_source not in ('webhook','reimport','auto_fill') then
    raise exception 'source invalido: %', p_source;
  end if;
  update public.profiles
     set last_received_at = now(),
         total_received   = coalesce(total_received,0) + 1
   where id = p_corretor_id;
  insert into public.lead_assignments (lead_id, corretor_id, source, assigned_at)
  values (p_lead_id, p_corretor_id, p_source, now());
end;
$$;
grant execute on function public.registrar_atribuicao_roleta(uuid,uuid,text)
  to authenticated, service_role;
```

Importante: **a RPC NÃO toca em `leads.tenant_id`**. Cada caller continua responsável por isso da forma que já funciona hoje — assim evitamos a "escrita dupla" que você levantou no `reimport-leads` (onde quem carimba `tenant_id` é o `distribute_lead`).

### 2) Edge function one-shot `_oneshot_create_rpc`

Cria a RPC acima no CRM externo via `EXTERNAL_SUPABASE_DB_URL`, inspeciona `distribute_lead` e confirma a presença de `profiles.total_received` + colunas de `lead_assignments`. Após sucesso, **deleto via `supabase--delete_edge_functions`** e removo o diretório. Confirmação explícita antes de prosseguir.

### 3) `fb-lead-webhook/index.ts`

Mantém o `update leads set tenant_id = assignTo` já feito no `insert`. Substitui o bloco que faz `update profiles set last_received_at` (linhas ~360-369) por:

```ts
await crmAdmin.rpc("registrar_atribuicao_roleta", {
  p_lead_id: lead.id, p_corretor_id: assignTo, p_source: "webhook",
});
```

### 4) `reimport-leads/index.ts`

Mantém `distribute_lead` intocado (escolhe e carimba `tenant_id`). Depois da chamada, lê `tenant_id` resultante e chama:

```ts
const { data: assigned } = await crmAdmin
  .from("leads").select("tenant_id").eq("id", inserted.id).single();
if (assigned?.tenant_id) {
  await crmAdmin.rpc("registrar_atribuicao_roleta", {
    p_lead_id: inserted.id, p_corretor_id: assigned.tenant_id, p_source: "reimport",
  });
}
```

Zero reescrita da regra de seleção.

### 5) `auto-fill-leads/index.ts`

No loop final que faz `update leads set tenant_id` + `update profiles set last_received_at` em batch: mantém o update de `tenant_id` por lead, e troca o batch de `last_received_at` por uma chamada à RPC com `p_source: "auto_fill"` para cada atribuição.

## Garantias

- `total_received` reflete só leads da roleta após este deploy.
- Indicação manual e `roleta-redistribute` permanecem fora — não chamam a RPC.
- Sem backfill, sem retroativo.

## Entrega final (para sua validação)

1. Confirmação de que `_oneshot_create_rpc` foi deletada.
2. Diff de `reimport-leads` mostrando que não há escrita dupla de `tenant_id`.
3. Teste e2e: invocar `fb-lead-webhook` com `_test_data`, mostrar `total_received` do corretor escolhido subindo de N → N+1 e a linha em `lead_assignments`.

## Arquivos

- `supabase/functions/_oneshot_create_rpc/index.ts` (criar, executar, deletar)
- `supabase/functions/fb-lead-webhook/index.ts` (editar)
- `supabase/functions/reimport-leads/index.ts` (editar)
- `supabase/functions/auto-fill-leads/index.ts` (editar)
