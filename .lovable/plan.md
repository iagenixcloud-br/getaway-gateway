## Objetivo
Adicionar diferenciação visual nos cards de leads manuais (indicações) no Kanban, isoladamente do fluxo de tráfego pago.

## Alterações

### 1. Tipagem / Dados
- **`src/lib/supabase.ts`**: adicionar `origem: string | null;` em `LeadRow`.
- **`src/data/mockData.ts`**: adicionar `origem?: string;` na interface `Lead`.
- **`src/hooks/useLeads.ts`**: mapear `origem: row.origem ?? undefined` no `rowToLead`.

### 2. Componente `LeadCard` (`src/components/KanbanBoard.tsx`)
Quando `lead.origem === 'manual_indicacao'`:
- **Tag de identificação**: badge "INDICAÇÃO" no canto superior direito do card, estilo pill dourado (texto gold, fundo semi-transparente escuro / borda sutil dourada).
- **Borda lateral esquerda**: 3px solid gold (`var(--gold)` / `#D4AF37`) no lado esquerdo do card.

Quando `origem !== 'manual_indicacao'` (incluindo `trafego_pago`):
- Nenhuma alteração visual. Card permanece exatamente como está hoje.

### 3. O que NÃO muda
- `FollowUpCard` não é alterado.
- `NovaIndicacaoModal`, `fb-lead-webhook`, roleta, auto-fill, n8n: intocados.
- Regras de negócio de criação/atribuição: inalteradas.

## Smoke-test esperado
1. Criar uma indicação manual → card aparece na coluna "Lead Novo" com badge "INDICAÇÃO" no canto superior direito e borda dourada à esquerda.
2. Leads de tráfego pago existentes → cards sem badge e sem borda extra, exatamente como antes.