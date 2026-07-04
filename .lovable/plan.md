# Corrigir extrato retornando 0 corretores

## Diagnóstico

O código atual em `src/pages/Assinaturas.tsx` (linhas 43–63) **já está correto** nos pontos citados:

1. ✅ Chamada usa exatamente `mes_referencia`:
   ```ts
   supabase.rpc("extrato_mensal", { mes_referencia: ymd })
   ```
2. ✅ `ymd` é formatado como `YYYY-MM-01`:
   ```ts
   const ymd = `${ano}-${String(mes).padStart(2, "0")}-01`;
   ```
3. ✅ Erro é tratado e mostrado via `toast.error(...)`, mas silenciosamente descartado no console.

Se está exibindo "0 corretores encontrados" **sem toast de erro**, então `error` é `null` e `data` é `[]`. Como a mesma função retorna 16 registros no SQL Editor (que roda como `postgres`/service_role, ignorando RLS), a causa mais provável é **RLS na tabela `profile_status_historico` bloqueando o role `authenticated`**. A função foi criada como `LANGUAGE sql STABLE` (sem `SECURITY DEFINER`), então roda no contexto do usuário chamador e respeita RLS.

## Ações

### 1. Frontend — instrumentação (src/pages/Assinaturas.tsx)

Trocar o `handleGerar` para logar payload, resposta e erro completos no console, e trazer a mensagem/detalhes do erro para o toast quando houver:

```ts
const handleGerar = async () => {
  setGerando(true);
  setExtrato(null);
  console.log("[extrato_mensal] request", { mes_referencia: ymd });
  const { data, error, status } = await supabase.rpc("extrato_mensal", {
    mes_referencia: ymd,
  });
  console.log("[extrato_mensal] response", { status, error, count: data?.length, data });
  setGerando(false);
  if (error) {
    toast.error(`Erro ao gerar extrato: ${error.message}${error.details ? ` — ${error.details}` : ""}`);
    return;
  }
  // ...restante igual
};
```

Isso confirma no console do navegador se está vindo `[]` sem erro (aponta RLS/permissão) ou algum erro sendo engolido.

### 2. Backend — tornar a função `SECURITY DEFINER`

No Supabase externo (onde a função já existe), rodar no SQL Editor:

```sql
CREATE OR REPLACE FUNCTION public.extrato_mensal(mes_referencia date)
RETURNS TABLE (profile_id uuid, nome text, email text, valor numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.email, 50.00::numeric AS valor
  FROM profiles p
  JOIN profile_status_historico h ON h.profile_id = p.id
  WHERE h.is_active = true
    AND h.data_inicio <= (date_trunc('month', mes_referencia) + interval '1 month - 1 day')::date
    AND (h.data_fim IS NULL OR h.data_fim >= date_trunc('month', mes_referencia)::date)
  GROUP BY p.id, p.name, p.email
  ORDER BY p.name;
$$;

GRANT EXECUTE ON FUNCTION public.extrato_mensal(date) TO authenticated;
```

Com `SECURITY DEFINER`, a função roda como o owner (que tem bypass de RLS via `postgres`) e retorna as mesmas 16 linhas para o usuário autenticado.

### 3. Validação

Após aplicar (1) e (2):

1. Recarregar a aba **Assinaturas**, selecionar **Junho / 2026**, clicar em **Gerar extrato**.
2. Abrir o console do navegador: os logs `[extrato_mensal] request` e `[extrato_mensal] response` devem aparecer, com `count: 16`.
3. Toast: "16 corretores encontrados". Tabela renderizada com os 16 nomes, totais = 16 × R$ 50 + R$ 600 = R$ 1.400,00.
4. Clicar em **Baixar PDF** e confirmar que o PDF sai com as 16 linhas.

## Arquivos afetados

- `src/pages/Assinaturas.tsx` — instrumentação em `handleGerar`.
- Backend externo (via SQL Editor do usuário) — recriar `extrato_mensal` com `SECURITY DEFINER`.
