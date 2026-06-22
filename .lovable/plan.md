## Causa
O telefone no Kanban card é renderizado via `EditableField`, que força `overflow: hidden` + `textOverflow: ellipsis` no span de exibição (linhas 114-115 de `src/components/EditableField.tsx`). Como o card do Kanban tem largura limitada pela coluna, o `inline-block` é cortado mesmo com `width: auto`, gerando o "...".

## Mudanças

### `src/components/EditableField.tsx`
- Adicionar prop opcional `noTruncate?: boolean`.
- Quando `noTruncate` for `true`, NÃO aplicar `overflow: hidden` nem `textOverflow: ellipsis` no span de exibição (deixar o conteúdo expandir naturalmente).

### `src/components/KanbanBoard.tsx`
- Linha 937 (telefone do card editável do Kanban): passar `noTruncate` ao `EditableField` do `phone` para garantir telefone completo.

Nenhuma alteração em validação, backend ou outras usages do `EditableField` (nome, imóvel, observações continuam com o comportamento atual).