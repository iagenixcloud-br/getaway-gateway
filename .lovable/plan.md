## Mudança

No `supabase/functions/auto-fill-leads/index.ts` (e no template embutido em `supabase/functions/deploy-to-external/index.ts`), substituir:

```ts
const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
if (claimsErr || !claims?.claims?.sub) { ... "Sessão inválida" ... }
```

por:

```ts
const { data: { user }, error: userErr } = await userClient.auth.getUser(token);
if (userErr || !user) { ... "Sessão inválida" ... }
```

## Passos

1. Atualizar `auto-fill-leads/index.ts` (cópia local do repo).
2. Atualizar a string `AUTO_FILL_LEADS_SRC` em `deploy-to-external/index.ts` com a mesma troca.
3. Redeployar `auto-fill-leads` no projeto externo via `deploy-to-external`.

Observação: a versão do SDK (`@supabase/supabase-js@2.57.4`) é mantida — `getUser(token)` funciona em ambas as versões.
