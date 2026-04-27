# Adicionar coluna "Follow-up" ao Kanban de Leads

## Visão geral

Vamos criar uma nova etapa **Follow-up** no Kanban. Leads vão para essa coluna automaticamente quando `status = 'follow_up'` (definido por uma regra/trigger no banco). Os cards dessa coluna terão um layout próprio, mais detalhado, com indicação visual de urgência e a informação de "Vindo de:" (status anterior), para o corretor retomar a conversa do ponto em que parou. O drag-and-drop continua funcionando normalmente — é possível tirar o lead de Follow-up e levar para qualquer outra etapa.

## Onde a mudança acontece

- **Banco (projeto Andrade Mob — `gycrprnkuwlzntqvpoxl`)**: nova coluna `previous_status`, trigger que captura o status anterior toda vez que `status` muda, e CHECK ampliado para aceitar `follow_up`.
- **Frontend**: `src/data/mockData.ts`, `src/lib/supabase.ts`, `src/hooks/useLeads.ts`, `src/components/KanbanBoard.tsx`.

## Mudanças no banco (Andrade Mob)

Migration aplicada via SQL no projeto `gycrprnkuwlzntqvpoxl`:

1. Adicionar coluna `previous_status TEXT` (nullable) na tabela `leads`.
2. Atualizar o CHECK do `status` para incluir `'follow_up'`.
3. Criar **trigger BEFORE UPDATE** em `leads` que, sempre que `NEW.status IS DISTINCT FROM OLD.status`, faz `NEW.previous_status := OLD.status`. Sem CHECK constraints — apenas trigger (mais flexível).
4. (Opcional, automação solicitada pelo usuário) Documentar como o status `follow_up` é setado: hoje ele virá do n8n / regra externa. Se quiser uma regra automática "lead parado > N dias vira follow_up", podemos adicionar depois — não está no escopo deste plano até confirmar a regra exata.

## Mudanças no frontend

### `src/data/mockData.ts`
- Adicionar `"follow_up"` em `LeadStatus`.
- Adicionar campo `previousStatus: LeadStatus | null` na interface `Lead`.

### `src/lib/supabase.ts`
- Adicionar `previous_status: string | null` em `LeadRow`.

### `src/hooks/useLeads.ts`
- Adicionar `case "follow_up"` em `mapStatus`.
- Em `rowToLead`, mapear `previousStatus: row.previous_status ? mapStatus(row.previous_status) : null`.
- O `updateLeadStatus` já cobre o drag-and-drop de Follow-up para qualquer outra coluna (ele só faz `UPDATE status`); o trigger no banco cuida de gravar `previous_status`.

### `src/components/KanbanBoard.tsx`

1. Acrescentar a coluna no array `columns`:
   ```ts
   { id: "follow_up", label: "Follow-up", color: "#f97316", icon: "⏰" }
   ```
   Posição sugerida: entre `curioso` e `negocio` (ou no final — confirmar abaixo).

2. Criar um componente dedicado **`FollowUpCard`** com layout próprio:
   - **Cabeçalho**: nome (destaque) + telefone formatado, com botão WhatsApp inline.
   - **Imóvel**: campo `interest` (mapeado como `lead.property`) com ícone de casa.
   - **Badge "Vindo de:"**: pílula colorida usando a cor da coluna de origem (`columns.find(c => c.id === lead.previousStatus)`). Texto: `Vindo de: Agendamento`.
   - **Rodapé**: nome do corretor responsável (resolvido via `corretorNameById.get(lead.assignedTo)` — admin) ou simplesmente "Você" para corretor.
   - **Estilização de alerta**:
     - Borda lateral esquerda laranja sólida de 3px.
     - Ícone de relógio/sino no canto superior direito quando `waitingHours > 72` (3 dias), pulsando suavemente em vermelho.
     - Fundo levemente tingido com a cor da coluna.

3. Em `DraggableLeadCard`, escolher qual componente renderizar com base em `lead.status`:
   ```tsx
   {lead.status === "follow_up"
     ? <FollowUpCard ... />
     : <LeadCard ... />}
   ```

4. **Drag-and-drop**: nenhuma mudança lógica necessária. Como `"follow_up"` agora é um `LeadStatus` válido e está em `columns`, o `DroppableArea` é gerado automaticamente, e o `handleDragEnd` chama `updateLeadStatus(id, newStatus)` para qualquer destino. Sair de Follow-up para Negócio/Agendamento/etc. funciona naturalmente, e a trigger grava o histórico.

5. **Modal de edição**: o array `columns` no botão "Mover para etapa" também ganha Follow-up automaticamente.

## Detalhes técnicos

- **Tipos atualizados** propagam para `mapStatus`, `EditableField`, e o select de mover etapa — verificar `tsc` sem erros.
- **Cor da coluna Follow-up**: `#f97316` (laranja) para diferenciar visualmente das demais.
- **Threshold de urgência**: `waitingHours > 72` (3 dias) ativa o ícone pulsante. Ajustável via constante.
- **Realtime**: a subscription atual já cobre `UPDATE` de qualquer coluna, então `previous_status` será refletido sem mudanças.
- **Backwards compatibility**: leads antigos sem `previous_status` mostram apenas "Lead em follow-up" (sem badge "Vindo de:") em vez de quebrar.

## Perguntas para você confirmar antes de implementar

1. **Posição da coluna Follow-up**: entre `curioso` e `negocio`, ou no final (depois de `venda`)?
2. **Como um lead entra em `follow_up` automaticamente?** Você mencionou "via regra de banco" — isso já é uma automação externa (n8n) que vai atualizar o status, ou quer que eu crie uma function/cron no Supabase que move leads parados há X dias para `follow_up`? Se sim, qual o critério (X dias sem update? sem mensagem?).
3. **Threshold do alerta visual**: 3 dias está correto, ou prefere outro valor (ex.: 24h, 7 dias)?
