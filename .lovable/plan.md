## Padronizar telefones dos leads

Normalizar todos os telefones da tabela `leads` (CRM externo) para o formato:

```
+55 DD 9XXXXXXXX
```

- `+55` fixo (Brasil)
- `DD` = DDD de 2 dígitos
- Número de 9 dígitos sempre iniciado por `9`

### 1. Regra de normalização

Para cada telefone existente:

1. Remover tudo que não for dígito.
2. Tirar `55` inicial se já existir (para reaplicar depois).
3. Tirar `0` inicial (ex: 021…).
4. Identificar DDD (2 primeiros dígitos) e o restante (assinante).
5. Ajustar o assinante:
   - Se tiver 8 dígitos → adicionar `9` na frente.
   - Se tiver 9 dígitos e começar com `9` → manter.
   - Se tiver 9 dígitos e **não** começar com `9` → forçar `9` no início (descarta o 1º dígito) — ou marcar como inválido (ver pergunta abaixo).
6. Formato final: `+55 {DDD} 9XXXXXXXX`.

Casos que **não** dá para corrigir automaticamente (ex: faltando DDD, número muito curto, lixo) → manter como está e listar em um relatório.

### 2. Onde aplicar

Duas frentes — fazer as duas para não voltar a sujar:

**a) Backfill dos leads atuais**
- Migration SQL com função `public.normalize_br_phone(text)` no CRM externo.
- `UPDATE leads SET phone = normalize_br_phone(phone) WHERE phone IS NOT NULL;`
- Retorna contagem de: normalizados / já corretos / inválidos.

**b) Entrada de novos leads (para não regredir)**
Aplicar a mesma normalização em:
- `supabase/functions/fb-lead-webhook/index.ts`
- `supabase/functions/fb-sync-leads/index.ts`
- `supabase/functions/reimport-leads/index.ts`
- `supabase/functions/seed-test-leads/index.ts` (gerar já no formato correto)

### 3. Detalhes técnicos

- A função `normalize_br_phone` fica em PL/pgSQL no banco externo, usada pelo UPDATE e disponível para qualquer ajuste futuro.
- Nas edge functions, replicar a mesma lógica em TypeScript (`normalizePhoneBR(raw: string): string | null`) — retorna `null` quando não dá para normalizar, e nesse caso grava o telefone original (para você revisar depois) ou rejeita o lead (ver pergunta).
- Não mexer em `tenant_id`, status, distribuição, roleta, etc. Só o campo `phone`.

### 4. Antes de implementar — preciso confirmar 2 pontos

1. Quando o número tem **9 dígitos mas não começa com 9** (ex: `21 3456-7890` — fixo antigo), prefere:
   - (a) forçar o `9` na frente mesmo assim (vai gerar telefone inválido em alguns casos), ou
   - (b) marcar como inválido e deixar como está para revisão manual?
2. Quando o número vem **sem DDD** (só 8 ou 9 dígitos), prefere:
   - (a) descartar/deixar como está, ou
   - (b) assumir um DDD padrão (ex: 11 ou 21)?

Me responde essas duas e eu já gero a migration + ajusto as edge functions.
