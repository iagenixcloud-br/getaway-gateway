## Respostas rápidas

**1. Webhook do Facebook — precisa ficar ativando?**
Não. A inscrição da página no evento `leadgen` é permanente do lado do Facebook. Os botões "Verificar status" e "Ativar/Reativar" são só ferramentas de manutenção. Você só precisa usar de novo se:
- alguém desconectar/reconectar a página no Facebook,
- o token da página for revogado,
- a permissão `leads_retrieval` cair.

No dia a dia, depois de ativado uma vez, os leads entram sozinhos.

**2. "Reparar roleta" — Failed to fetch**
"Failed to fetch" no navegador = a requisição não chegou a receber resposta HTTP. O frontend chama `https://gycrprnkuwlzntqvpoxl.supabase.co/functions/v1/roleta-backfill` (projeto externo do CRM). Causa mais provável: a função `roleta-backfill` foi criada no repositório, mas **não foi efetivamente deployada no projeto externo** — só foi deployada no projeto gerenciado (Lovable Cloud). As outras funções (`fb-sync-leads`, `fb-subscribe`) já existiam no externo, por isso funcionam.

## O que fazer

### Passo 1 — Diagnosticar
Fazer um `curl` direto pra `https://gycrprnkuwlzntqvpoxl.supabase.co/functions/v1/roleta-backfill` pra confirmar se retorna 404 (não deployada) ou outro erro.

### Passo 2 — Corrigir
Como o deploy automático do Lovable só publica no projeto gerenciado, e a função precisa rodar no projeto externo (onde estão `leads`, `lead_assignments` e a RPC `registrar_atribuicao_roleta`), há duas opções:

**Opção A (recomendada): mover o backfill para uma rota dentro de `fb-sync-leads`**
A função `fb-sync-leads` já está deployada no projeto externo e já tem acesso ao `crmAdmin` e à RPC. Adicionar um modo `?action=backfill-roleta` nela, e o frontend passa a chamar `fb-sync-leads?action=backfill-roleta` em vez de `roleta-backfill`. Zero infra nova, aproveita o que já está em produção.

**Opção B: deployar `roleta-backfill` manualmente no projeto externo**
Exigiria acesso de deploy ao projeto externo via `SB_DEPLOY_ACCESS_TOKEN`. Mais frágil — toda vez que a função mudar precisa redeployar manualmente lá.

### Passo 3 — Ajustar o frontend
Em `src/pages/Integracao.tsx`, `handleRepararRoleta()` passa a chamar:
```
POST /functions/v1/fb-sync-leads?action=backfill-roleta
```
com o mesmo `Authorization: Bearer <session>` que já usa.

### Passo 4 — Validar
Clicar "🛠 Reparar roleta" e confirmar mensagem `✅ Roleta reparada: N lead(s) corrigido(s)`. Em seguida, conferir na tabela `lead_assignments` que os 2 leads (João B → Roberta, Vladerson → Wellington) agora têm linha registrada, e que `last_received_at` de Roberta e Wellington avançou.

## Recomendação
Seguir **Opção A**. Quer que eu implemente?
