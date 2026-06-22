# Plano: corrigir telefones com DDI 55 duplicado

## Resumo
- O bug é que números salvos com `+55` duplicado (`+5555...`) passam pela validação de DDD atual (`[1-9][1-9]` aceita `55`) e a normalização desiste calada, devolvendo o original.
- Corrigir `normalizeBRPhone` para detectar/desfazer o duplo-55 e usar a lista real de DDDs brasileiros.
- Unificar `sanitizePhone` (em `useLeads.ts`) para reaproveitar `normalizeBRPhone` — uma única fonte de verdade.
- Replicar o mesmo guard na edge function `normalize-leads-phones` e rodar para limpar a base.
- Manter o badge de divergência quando o número, mesmo após tirar o duplo-55, não bater com padrão BR válido (ex.: dígito faltando). Esse é o comportamento certo: só some quando alguém corrigir o cadastro.

## Mudanças

### 1) `src/lib/phoneUtils.ts`
- No começo do fluxo de `normalizeBRPhone` e `isBRPhoneDivergent` (após extrair `digits` e remover zeros à esquerda):
  - Se `digits.length` ∈ {13, 14} e começa com `"5555"`, tirar o primeiro `"55"`.
- Trocar `if (!/^[1-9][1-9]$/.test(ddd)) return original` por checagem contra a lista oficial de DDDs:
  `11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,41,42,43,44,45,46,47,48,49,51,53,54,55,61,62,63,64,65,66,67,68,69,71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99`.
- Resto da função permanece igual. Números com dígito faltando continuam caindo no `return original` final → badge aparece. ✔

### 2) `src/hooks/useLeads.ts`
- Substituir `sanitizePhone(raw)` por uma versão que delega: pega `normalizeBRPhone(raw)`; se o retorno ainda não bater com padrão E.164 (`+` + 11+ dígitos), devolve um fallback razoável (`+` + dígitos) só pra não quebrar inserts, mas SEM duplicar `55`. Aplicado em `updateLead`, `createLead`, `createIndicacao`.

### 3) `supabase/functions/normalize-leads-phones/index.ts`
- Adicionar o mesmo guard de duplo-55 no início de `formatPhoneE164`.
- Manter `dry_run` para revisão prévia.

### 4) Limpar a base
- Rodar a edge function 2x:
  - primeiro `dry_run=true` para você ver `update_sample` e `invalid_sample`,
  - depois `dry_run=false` para aplicar.
- Resultado esperado para o card mostrado: `+5555218200691` → após tirar duplo-55 vira `+55218200691` (11 dígitos), tenta validar → DDD `21` ok, mas `sub` começa com `2`/comprimento errado → `formatPhoneE164` devolve `null` → fica como **inválido**, lead aparece em `invalid_sample` e o badge continua marcando divergência. Comportamento conforme o que você pediu.

## Fora do escopo
- Não vou criar UI para o master rodar a normalização (disparo via curl/edge function direta).
- Não vou tentar "adivinhar" dígitos faltantes.
- Não mexo no fluxo de criação de indicação além do `sanitizePhone`.

## Arquivos
- `src/lib/phoneUtils.ts` (editar)
- `src/hooks/useLeads.ts` (editar `sanitizePhone`)
- `supabase/functions/normalize-leads-phones/index.ts` (editar)
