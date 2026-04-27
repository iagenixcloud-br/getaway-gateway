# Ajuste no rodapé do FollowUpCard

## O que muda

No card da coluna **Follow-up**, no rodapé:

- **Remover** a etiqueta "Sem contato há Xd" (laranja, à direita).
- **Aumentar** o nome do corretor responsável para ficar em destaque, ocupando todo o rodapé.

## Detalhes técnicos

Arquivo único: `src/components/KanbanBoard.tsx`, dentro do componente `FollowUpCard`.

- Trocar o container `flex justify-between` por um `flex` simples.
- Remover o `<span>` do `waitingLabel(lead.waitingHours)`.
- Ajustar o nome do corretor: fonte de **10.5px → 13px**, peso **600**, cor `var(--text-primary)` (em vez de `--text-muted`), e ícone de pessoa um pouco maior (10px → 13px) na cor dourada (`var(--gold)`) para combinar com o resto do app.

O ícone vermelho de alerta no canto superior direito (urgência > 72h) **continua igual**, sem mudança.
