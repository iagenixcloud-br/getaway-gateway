
## Plano: Adicionar status "Não-Qualificado" na Pipeline

Será criado um novo status de lead chamado "nao_qualificado" (Não-Qualificado), posicionado após "Venda" no Kanban e em todas as telas que referenciam os status.

### Alterações

1. **Banco de dados** — Adicionar o valor `nao_qualificado` ao enum `lead_status` (ou à coluna status, dependendo do tipo atual). Migration SQL.

2. **`src/data/mockData.ts`** — Adicionar `"nao_qualificado"` ao tipo `LeadStatus`.

3. **`src/components/KanbanBoard.tsx`** — Adicionar a coluna `{ id: "nao_qualificado", label: "Não-Qualificado", color: "#ef4444", icon: "✕" }` após "Venda" no array de colunas.

4. **`src/pages/Dashboard.tsx`** — Adicionar entrada correspondente no array `COLUMNS`.

5. **`src/pages/Leads.tsx`** — Adicionar entrada em `STATUS_LABELS` e `STATUS_COLORS`.

6. **Qualquer outro arquivo** que liste os status (ex.: hooks, edge functions) será atualizado para reconhecer o novo valor.
