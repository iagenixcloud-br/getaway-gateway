
# Ajustes de Responsividade Mobile

Foco em melhorar UX em telas < 768px sem mexer em queries, RLS, triggers ou lógica de banco. Apenas CSS, layouts e pequenas interações de UI.

## 1. Kanban (Pipeline) — `src/components/KanbanBoard.tsx`

- **Top stats bar**: em mobile usar `grid-cols-2`, fonte menor e padding compacto. Esconder colunas menos críticas em telas < 380px (mantém via scroll do grid).
- **Colunas**: ajustar `min-width`/`max-width` da `.kanban-column` no `index.css` para `85vw` em mobile (já existe parcialmente) e snap horizontal mais firme (`scroll-snap-type: x mandatory`).
- **DroppableArea**: trocar `maxHeight: calc(100vh - 340px)` por valor responsivo (`calc(100vh - 240px)` em mobile) para mais espaço vertical de scroll por coluna.
- **Drag em mobile (touch)**: adicionar `TouchSensor` do @dnd-kit ao lado do `PointerSensor` com `activationConstraint: { delay: 180, tolerance: 8 }` — long-press para iniciar drag sem bloquear scroll lateral.
- **Fallback "Mover para →"**: novo botão discreto (ícone ⋮) no canto do `LeadCard` e `FollowUpCard`, visível apenas em `md:hidden`. Abre um sheet/popover com a lista de etapas. Ao escolher, chama `moveLeadWithSubstatus` (mesmo fluxo do drag, mesmo modal de substatus para perda/cliente_futuro). Botão com 44×44px de alvo de toque.
- **Cards**: aumentar padding vertical mínimo e garantir altura ≥ 44px nos botões de ação.
- **Substatus/Lead modal**: já tem `mx-3`, garantir `max-h-[92vh]` e scroll interno em mobile.

## 2. Lista de Leads — `src/pages/Leads.tsx`

- Filtros (busca, status, sort): empilhar em coluna em mobile (`flex-col md:flex-row`), inputs `w-full`.
- Tabela: em < 768px renderizar como **lista de cards** (um card por lead com nome, status badge, telefone, data, ações), escondendo a tabela. Em ≥ md mantém tabela atual.
- Garantir `overflow-x-auto` no wrapper da tabela para evitar quebra horizontal residual.

## 3. Desempenho — `src/pages/Desempenho.tsx` + `src/components/conversao/*`

- Header/tabs (`Visão Geral` / `Conversão por Etapa`): tabs scrolláveis horizontalmente em mobile, fonte 13px.
- Filtros (período, corretor): empilhar em coluna, selects `w-full`.
- KPI grid: `grid-cols-2` em mobile (atualmente algumas grids vão para `grid-cols-3`/`4` muito apertadas).
- Gráficos Recharts: garantir altura fixa (`h-64`) e `ResponsiveContainer width="100%"`; reduzir tick fontSize e rotacionar labels do eixo X em mobile.
- `FunilCard`, `PerdasTab`, `ConversaoPanel`: padding reduzido (`p-4` → `p-3` em mobile), número grande com `text-2xl md:text-3xl`, barras de progresso full width.
- Tabela de perdas por corretor (admin): virar lista de cards em mobile, como na Lista de Leads.

## 4. Exportar & Arquivar — `src/pages/Exportar.tsx`

- Filtros (status multiselect, corretor, período): empilhar em coluna em mobile.
- Botões "Exportar CSV" e "Arquivar selecionados": full-width em mobile, altura 44px, empilhados.
- Tabela de preview: virar lista de cards em mobile (checkbox + nome + status + corretor + data).
- Modal de confirmação de arquivamento: `max-w-md`, padding reduzido, input full-width, botões empilhados em mobile.

## 5. Globais — `src/index.css` e `src/components/Layout.tsx`

- Confirmar que o conteúdo principal tem `px-3 md:px-6` e `py-4 md:py-6` para evitar respiro insuficiente.
- Ajustar `.kanban-column` em mobile (`min-width: 85vw`, snap mandatory).
- Adicionar utilitário `.no-scrollbar-x` e `overflow-x-hidden` no `<body>` para eliminar scroll horizontal acidental.
- Garantir headings com `clamp()` ou classes responsivas (`text-lg md:text-2xl`) onde estiverem fixos em px.

## Fora de escopo

- Nenhuma alteração em: `useLeads.ts`, `useMetricasFunil.ts`, hooks de corretores, edge functions, RLS, migrations, lógica de assignment, roleta ou Supabase em geral.

## Arquivos a editar

- `src/components/KanbanBoard.tsx` (TouchSensor + botão "Mover para" + ajustes responsivos)
- `src/pages/Leads.tsx` (filtros + tabela→cards mobile)
- `src/pages/Desempenho.tsx` (tabs, filtros, KPIs, charts responsivos)
- `src/components/conversao/ConversaoPanel.tsx`, `FunilCard.tsx`, `PerdasTab.tsx` (padding/tipografia/lista mobile)
- `src/pages/Exportar.tsx` (filtros, botões, tabela→cards, modal)
- `src/index.css` (kanban-column, snap, overflow global)
- `src/components/Layout.tsx` (paddings do container principal, se necessário)
