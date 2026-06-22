Ajustar badge de telefone divergente para ícone-only e garantir que números sem divergência apareçam completos, sem truncamento.

## Problema
1. Números de telefone sem badge estão sendo truncados com "..." (ex: +5554981227...).
2. O badge de "Telefone divergente" está ocupando muito espaço no card, empurrando o layout.

## Mudanças propostas

### 1. Componente `PhoneDivergentBadge.tsx`
- Remover o texto "Telefone divergente" / "Divergente".
- Manter apenas o ícone `AlertTriangle` pequeno.
- Preservar o `title` com a explicação completa para hover/touch.
- Ajustar estilos (padding, gap, border radius) para um badge compacto de ícone apenas.

### 2. `src/pages/Leads.tsx`
- **Mobile card (linhas ~213-216):** manter telefone e badge em linha única (`inline-flex`), mas remover qualquer `overflow: hidden` / `textOverflow: "ellipsis"` no número para que ele apareça completo.
- **Desktop table (linhas ~273-277):** remover truncamento do telefone na célula; garantir que o número seja exibido por completo. A célula já tem `whiteSpace: "nowrap"`, então a tabela pode rolar horizontalmente se necessário, mas o número não será cortado.

### 3. `src/components/KanbanBoard.tsx`
- **Kanban card (linhas ~748-757):** remover `overflow: hidden` e `textOverflow: "ellipsis"` do span do telefone. O telefone deve aparecer completo ao lado do ícone-only. O card pode expandir horizontalmente conforme o conteúdo, mas o badge ícone minimiza o impacto.
- **Lead detail modal (linhas ~930-942):** mesma alteração — telefone completo sem truncamento, badge como ícone-only ao lado.

### 4. Verificação visual
- Revisar preview para confirmar:
  - Cards sem badge mostram telefone completo.
  - Cards com badge mostram apenas o triângulo de alerta pequeno ao lado do número.
  - Hover/touch no ícone exibe tooltip explicativo.

## Escopo
- Apenas frontend: componente de badge e locais onde ele é renderizado.
- Nenhuma alteração em lógica de validação (`phoneUtils.ts`), backend, banco ou edge functions.