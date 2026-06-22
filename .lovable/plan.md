## Corrigir telefones com `0` na frente do DDD

### 1. Ajustar `formatPhoneE164` (fb-sync-leads e normalize-leads-phones)

Adicionar tratamento pro caso de 12 dígitos sem `+` que começam com `0`:

- Se `digits.length === 12` e começa com `0` → remover o `0` inicial → vira 11 dígitos BR → segue o fluxo normal.
- Exemplo: `021990027771` → `21990027771` → `+55 21 990027771`.

Aplicar essa mesma lógica nas duas funções pra ficarem consistentes.

### 2. Corrigir o lead do Bruno no banco

Update direto via insert tool:

```sql
UPDATE leads
SET phone = '+55 21 990027771'
WHERE id = '9383b82d-969f-4065-83e4-99823151a43d';
```

### 3. Lead do Erick (`+55219823236274`)

Telefone inválido de fato (14 dígitos). Vou **deixar como está** — não dá pra adivinhar qual é o correto. Se quiser corrigir depois, me passa o número certo.

### 4. Redeploy

Redesployar `fb-sync-leads` e `normalize-leads-phones` pra que a correção valha pros próximos sync.

### Detalhes técnicos

Mudança em `formatPhoneE164` (ambos arquivos):

```ts
// novo: tratar 12 dígitos com 0 inicial (ex: 021990027771)
if (!hasPlus && digits.length === 12 && digits.startsWith("0")) {
  const d = digits.slice(1); // remove o 0 → 21990027771
  // segue fluxo BR normal de 11 dígitos
  ...
}
```

Arquivos alterados:
- `supabase/functions/fb-sync-leads/index.ts`
- `supabase/functions/normalize-leads-phones/index.ts`

E um UPDATE no lead do Bruno.
