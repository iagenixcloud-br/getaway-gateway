## Objetivo

Aceitar telefones internacionais no CRM mantendo a normalização brasileira. Foco: **leads novos** do tráfego pago. Lead sempre é criado — telefone inválido cai no fallback (número original), nunca rejeita.

## Nova função `formatPhoneE164(raw): string | null`

Substitui `formatPhoneBR` nas edge functions de ingestão. Regras:

1. **Limpa entrada** mantendo `+` inicial e dígitos.
2. **BR** (começa com `+55`, ou 10–13 dígitos sem `+` que pareçam BR):
   - Aplica a regra atual (strip `55`/`0`, valida DDD 11–99, garante `9` no assinante).
   - Sucesso → `+55 DD 9XXXXXXXX`. Falha → `null`.
3. **Estrangeiro** (começa com `+` e DDI ≠ 55):
   - Valida E.164: `+` + 8 a 15 dígitos, primeiro dígito 1–9.
   - Sucesso → `+DDIXXXXXXXX` (sem espaços). Falha → `null`.
4. **Resto** → `null`.

## Uso nas edge functions (comportamento de fallback)

Em **todas** as funções abaixo, o padrão é:

```ts
phone: formatPhoneE164(fields.phone) || fields.phone
```

Ou seja: se a normalização retornar `null`, **grava o telefone original como veio** — lead **nunca é rejeitado** por causa de telefone.

Arquivos:

- `supabase/functions/fb-lead-webhook/index.ts`
- `supabase/functions/fb-sync-leads/index.ts`
- `supabase/functions/reimport-leads/index.ts`
- `supabase/functions/normalize-leads-phones/index.ts` — atualizar para preservar estrangeiros (não vamos rodar agora)
- `supabase/functions/seed-test-leads/index.ts` — segue gerando só BR

`normalizePhone` (digits-only, dedup) não muda.

## Testes após implementar

Simular 3 leads via `fb-lead-webhook` (payload com `_test_data`) usando `curl_edge_functions`, depois consultar `webhook_logs` + `leads`:

| Caso | Telefone enviado | Esperado |
|---|---|---|
| BR válido | `11 96191-5034` | lead criado, `phone = "+55 11 961915034"` |
| Estrangeiro PT | `+351 912345678` | lead criado, `phone = "+351912345678"` |
| Inválido | `1234` | lead **criado mesmo assim**, `phone = "1234"` (fallback) |

Para evitar sujar o CRM real com nomes de teste, vou usar nomes prefixados `__TEST_E164_…` para você identificar e remover depois se quiser.

## Fora de escopo

- Backfill dos leads existentes.
- Mudanças no front.
- Alterações de schema.
