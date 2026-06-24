## Confirmações antes de executar

**1) Indicação manual já está correta — nada a alterar**

`createIndicacao` (`src/hooks/useLeads.ts:403-449`) só faz `insert` em `leads` com `tenant_id` escolhido manualmente e `origem: "manual_indicacao"`. **Não** atualiza `profiles.last_received_at`, **não** incrementa `total_received`, **não** insere em `lead_assignments`. A fila automática (round-robin por `last_received_at`) não é afetada por indicação manual. O "um pra um" (lead automático cai → próximo da fila) está preservado.

Nenhum dos 3 callers que o plano altera (`fb-lead-webhook`, `reimport-leads`, `auto-fill-leads`) toca em indicação manual. A RPC `registrar_atribuicao_roleta` só é chamada nos caminhos de tráfego pago.

**2) Os 50 leads com `source` nulo — corrigido daqui pra frente, sem retroagir**

Após o deploy, todo lead de tráfego pago gera linha em `lead_assignments` com `source` granular:
- `webhook` → entrada real-time via `fb-lead-webhook`
- `reimport` → pull manual via `reimport-leads`
- `auto_fill` → redistribuição via `auto-fill-leads`

Os 50 leads antigos permanecem como estão. Sem backfill, sem update retroativo.

## Plano (inalterado — o de `.lovable/plan.md`)

1. RPC `registrar_atribuicao_roleta(p_lead_id, p_corretor_id, p_source)` no CRM externo via one-shot `oneshot-create-rpc` (já criada, falta executar + deletar).
2. `fb-lead-webhook` → substitui `update profiles set last_received_at` por chamada à RPC com `source: 'webhook'`.
3. `reimport-leads` → mantém `distribute_lead` intocado. Após ele, lê `tenant_id` resultante e chama RPC com `source: 'reimport'` + flag `p_skip_assignment=true` (porque `distribute_lead` já inseriu em `lead_assignments` com `source='roleta'`) — **ou** ajuste equivalente para evitar dupla escrita. A decisão sobre `p_skip_assignment` vs alternativa foi a última pendente; reconfirmar antes do build.
4. `auto-fill-leads` → troca o batch de `last_received_at` por chamada à RPC por atribuição com `source: 'auto_fill'`.
5. Deleta `oneshot-create-rpc` imediatamente após sucesso.

## Entrega final

1. Confirmação de que `oneshot-create-rpc` foi deletada.
2. Diff de `reimport-leads` mostrando que não há escrita dupla de `tenant_id` nem de `lead_assignments`.
3. Teste e2e: invocar `fb-lead-webhook` com payload de teste, mostrar `total_received` do corretor escolhido subindo N → N+1 e a linha em `lead_assignments` com `source='webhook'`.

## Pendência única para destravar o build

Você ainda precisa escolher como `reimport-leads` evita a dupla linha em `lead_assignments` (já que `distribute_lead` insere com `source='roleta'`):

- **A)** RPC ganha `p_skip_assignment boolean default false`. Reimport passa `true`. Preserva granularidade — mas a linha existente fica com `source='roleta'`, não `'reimport'`.
- **B)** RPC separada `incrementar_total_recebido(p_corretor_id)` só pra `profiles`. Reimport chama essa. Mesma consequência: linha fica `'roleta'`.
- **C)** Reimport não chama nada. `total_received` não conta leads reimportados.

Recomendo **A** pela simetria de API. Confirma A (ou escolhe outra) e eu sigo pro build.
