
# Master volta a ver todos os leads

## Causa
- O front-end já trata `master` como tendo acesso total (alteração anterior em `AuthContext.tsx` faz `isAdmin = admin || master`, e `useLeads` não aplica filtro de `tenant_id` quando `isAdmin` é `true`).
- Mesmo assim o master vê **0 leads** porque as policies RLS no banco externo (Supabase `gycrprnkuwlzntqvpoxl`) só reconhecem o role `admin`. Sem ser dono dos leads e sem ser `admin`, o Postgres devolve lista vazia.

## Objetivo
Fazer com que qualquer usuário com role `master` enxergue exatamente o que um `admin` enxerga, em **todas** as tabelas relevantes (leads, métricas, logs, perfis, roleta etc.), **sem alterar nenhum dado de lead em produção**.

## Abordagem (apenas RLS, zero mutação de dados)

Atualizar a função `public.has_role` no banco externo para que ela retorne `true` quando o usuário consultar o role `'admin'` **e** já possuir o role `'master'`. Assim:

- Todas as policies existentes que usam `has_role(auth.uid(), 'admin')` passam a aceitar master automaticamente.
- Nenhuma policy precisa ser reescrita uma a uma.
- Nenhum INSERT/UPDATE/DELETE em `leads` ou qualquer outra tabela de produção.
- Reversível com um único `CREATE OR REPLACE FUNCTION`.

```sql
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
```

Esse SQL será aplicado no banco externo através de uma edge function descartável (`apply-master-rls`) que usa o `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY` já existente em secrets — mesma mecânica usada por `deploy-to-external` / `deploy-origem-column`.

## Passos
1. Confirmar com o usuário que o login master atual tem o role `master` cadastrado em `user_roles` no banco externo (rápido check via edge function de leitura). Se não tiver, criar o vínculo do master existente (sem alterar leads).
2. Criar edge function `apply-master-rls` que apenas executa o `CREATE OR REPLACE FUNCTION` acima no banco externo.
3. Invocar a função uma vez; remover/desabilitar depois.
4. Pedir ao usuário um hard-refresh e validar:
   - Kanban mostra leads de todos os corretores.
   - Dashboard agrega todos os leads.
   - Aba "Logs de Webhook" (master-only) continua acessível.
   - Corretores comuns continuam vendo só os próprios leads.

## Garantias / o que NÃO será tocado
- Tabela `leads`: nenhum INSERT, UPDATE, DELETE, nenhum ALTER de schema.
- Webhook `fb-lead-webhook`: nenhuma alteração.
- Distribuição da roleta, status, atribuições: nenhuma alteração.
- Policies de corretor: não mudam — corretor continua restrito ao próprio `tenant_id`.
- Único objeto alterado: a função `public.has_role` (substituição idempotente, reversível).
