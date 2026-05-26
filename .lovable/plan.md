## Objetivo
Adicionar o motivo "Sem contato" à lista de substatus do modal "Mover para Perda".

## Alteração
No arquivo `src/components/KanbanBoard.tsx`, dentro da constante `SUBSTATUS_OPTIONS.perda`, inserir `"Sem contato"` como último item (após `"Fora do momento de compra"`).

Lista final:
- Não gostou da localização
- Não gostou da planta
- Sem perfil financeiro
- Prazo longo
- Fora do momento de compra
- Sem contato

## Notas técnicas
- Nenhuma outra alteração necessária (RLS, schema, tipos, etc.).
- O modal já renderiza dinamicamente a lista `SUBSTATUS_OPTIONS.perda`.
