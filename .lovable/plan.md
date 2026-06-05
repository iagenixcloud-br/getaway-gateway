# Corrigir campos cortados no mobile — Editar Lead

## Causa
O modal `EditLeadModal` em `src/components/KanbanBoard.tsx` (linha 345) usa `grid grid-cols-1 sm:grid-cols-2`. O breakpoint `sm:` do Tailwind ativa em ≥640px, então em celulares de 360–430px o layout vai pra 2 colunas quando o navegador reporta ≥640px de CSS width (caso do screenshot), cortando Telefone, E-mail, Entrada/Parcela ideal.

## Mudança (apenas CSS, sem tocar em lógica)

Arquivo: `src/components/KanbanBoard.tsx`

1. Linha 345 — trocar breakpoint do grid:
   - de: `grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4`
   - para: `grid grid-cols-1 md:grid-cols-2 gap-3 mb-4`

2. Todos os wrappers `col-span-2` dentro desse grid (Nome, Profissão, Imóvel de Interesse, etc., linhas 346, 396, 468 e demais ocorrências dentro do mesmo grid) — trocar para `md:col-span-2` para que em mobile (coluna única) não tentem ocupar 2 colunas inexistentes.

## Resultado
- Mobile (<768px): todos os campos em coluna única, largura 100%, sem corte.
- Desktop (≥768px): pares lado a lado (Telefone/E-mail, Idade/Gênero, Renda/Investimento, Entrada/Parcela, Metragem/Região), exatamente como hoje.

## Fora de escopo
Nenhuma alteração em queries, hooks, validação, estado do formulário ou estilos inline (`inputStyle`, `labelStyle`).
