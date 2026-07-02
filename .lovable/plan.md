# Cards clicáveis no Dashboard (admin) → modal com leads da etapa

## O que muda

No `src/pages/Dashboard.tsx`, apenas para admin, cada quadrado da seção **"Leads por Etapa"** (os 10: Lead Novo, Curioso, Follow-up, Negócio, Agendamento, Visita, Proposta, Venda, Perda, Cliente Futuro) vira clicável. Ao clicar, abre um **modal responsivo** listando todos os leads daquela etapa com **nome e telefone**.

Para não-admin: comportamento atual, cards não-clicáveis.

## Modal

- Header: ícone + label da etapa + contagem (ex: "💼 Negócio — 14 leads").
- Lista rolável: avatar, nome, telefone (com botão copiar), tempo de espera ("há 2d 3h"), e link clicável para abrir o lead no Kanban (`/leads?leadId=<id>`) — se essa rota já suporta deep-link; senão só fecha o modal.
- Ordenação: mais recentes primeiro (`createdAt desc`).
- Vazio: "Nenhum lead nesta etapa."
- Fechar: botão X no canto, clique no backdrop, tecla ESC.

## Responsividade (celular, tablet, iPad, notebook, PC)

- Backdrop `fixed inset-0` com blur + overlay escuro.
- Container: `w-[95vw] max-w-2xl max-h-[85vh]` centralizado, com `overflow-y-auto` no corpo e header/footer fixos.
- Lista com `flex` que quebra em telas estreitas (nome em cima, telefone embaixo em `< sm`; lado a lado em `≥ sm`).
- Alvo de toque mínimo 44px nos itens.
- Testado nos breakpoints do projeto (mobile 375, tablet 768, desktop 1280+) — sem scroll horizontal.

## Arquivos

- **Editar** `src/pages/Dashboard.tsx`:
  - Importar `useAuth` pra pegar `isAdmin`.
  - Estado local `openStatus: LeadStatus | null`.
  - Nos cards da seção "Leads por Etapa": se `isAdmin`, envolve em `<button>` com `onClick={() => setOpenStatus(col.key)}`, `cursor-pointer`, `aria-label`, e leve `hover:brightness-110`. Senão, mantém `<div>` atual.
  - Renderiza `<LeadsPorEtapaModal>` quando `openStatus` não-null.
- **Criar** `src/components/LeadsPorEtapaModal.tsx`: componente do modal descrito acima. Recebe `status`, `leads` (já filtrados), `label`, `color`, `icon`, `onClose`.
- Nada muda em rotas, hooks, backend, RLS, edge functions ou tipos.

## O que NÃO faço

- ❌ Não mexo nos outros blocos do Dashboard (KPIs de topo, "Tempo Médio", "Últimos Leads").
- ❌ Não crio nova query — reuso `leads` já carregado por `useLeads()` e filtro em memória por `status`.
- ❌ Não altero permissões/RLS — admin já vê todos os leads via `useLeads`.
- ❌ Não toco em roleta, webhook, dedup, nada de backend.

Aprovo e executo?
