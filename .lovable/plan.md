Ajustar o layout do badge "Telefone divergente" para que fique sempre na mesma linha do número de telefone, sem quebrar o card.

Problema atual
--------------
O componente `PhoneDivergentBadge` já usa `display: inline-flex` internamente, mas nos cards ele é colocado dentro de containers `flex` com `flexWrap: "wrap"` e `gap`. Em larguras pequenas o badge quebra para uma nova linha, empurrando o conteúdo abaixo e aumentando a altura do card.

Onde aplicar
------------
1. `src/pages/Leads.tsx`
   - Card mobile (linha ~215): o telefone e o badge estão em uma `<div>` com `display: "flex"`, `flexWrap: "wrap"`.  
     → Remover `flexWrap: "wrap"` e garantir que o número e o badge fiquem em linha única.
   - Tabela desktop (linha ~276): já está em `display: "inline-flex"`, mas o container `<td>` usa `whiteSpace: "nowrap"`. Verificar se está OK; se o badge estiver quebrando, aplicar o mesmo padrão inline.

2. `src/components/KanbanBoard.tsx`
   - Card do kanban (linha ~755): o telefone e o badge estão dentro de `<div className="flex items-center gap-1.5 flex-wrap">` (ícone + telefone + badge).  
     → Agrupar o número e o badge em um wrapper inline (por exemplo `<span style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>`) e deixar o ícone fora desse wrapper, ou remover `flex-wrap` do container e garantir que o wrapper interno não quebre.
   - Modal/detalhes do lead (linha ~938): o telefone e o badge estão dentro de `<div className="flex items-center gap-2 mb-2 flex-wrap">`.  
     → Mesmo ajuste: telefone + badge dentro de um wrapper inline, mantendo o ícone no container externo, para evitar que o badge vá para nova linha sozinho.

Técnico
-------
- Manter o componente `PhoneDivergentBadge` inalterado (ele já é inline-flex).
- Usar `display: inline-flex`, `alignItems: "center"`, `gap` pequeno e `whiteSpace: "nowrap"` no wrapper que junta telefone + badge.
- Verificar visualmente no preview que o badge não aumenta a altura do card nem empurra outros elementos.

Não envolve backend, banco de dados ou edge functions.