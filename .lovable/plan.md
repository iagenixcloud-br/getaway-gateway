## Objetivo
Esconder o filtro de período do topo (Últimos 7 dias / 30 dias / 90 dias / Tudo) quando o usuário estiver na aba "Conversão por Etapa", pois essa aba já possui seu próprio seletor interno (Mês atual / Mês anterior / Últimos 3 meses).

## O que será alterado
1. **`src/pages/Desempenho.tsx`**
   - Envolver o bloco do filtro superior (com os botões 7d / 30d / 90d / Tudo) em uma condicional `{tab === "overview" && ...}`.
   - Nenhuma outra lógica será alterada — a aba "Conversão por Etapa" continua com o `ConversaoPanel` e seu seletor próprio funcionando normalmente.

## Resultado esperado
- Na aba **Visão Geral**: filtro 7d/30d/90d/Tudo visível no topo.
- Na aba **Conversão por Etapa**: filtro do topo some, e só aparece o seletor interno do painel (Mês atual / anterior / Últimos 3 meses).