
## Plano: Edge function `seed-test-leads` para popular o Kanban

### O que faz
Cria **100 leads de teste** no CRM externo, todos com `status = 'lead_novo'`, distribuídos em round-robin entre **todos os corretores ativos**. Não vai mexer em nada da roleta real (webhook, auto-fill, n8n).

### Arquivo novo
`supabase/functions/seed-test-leads/index.ts`

### Comportamento

1. **Auth**: exige `Authorization: Bearer <token>` e valida que o usuário é admin (consulta `user_roles` no CRM externo). Sem isso, retorna 401/403.
2. **Lê corretores ativos** no CRM externo (`profiles` onde `is_active = true`).
3. **Gera 100 leads sintéticos**:
   - `name`: `"Teste Seed #001"` … `"Teste Seed #100"`
   - `phone`: `+5511` + timestamp em ms + índice (garante unicidade contra o índice único de telefone)
   - `email`: `seed-001@teste.local` …
   - `city`: rotativa entre 4 cidades (São Paulo, Rio, BH, Curitiba)
   - `interest`: rotativa entre 3 tipos (Apartamento, Casa, Cobertura)
   - `budget`: aleatório entre 300k e 2M
   - `status`: `'lead_novo'` (todos)
   - `origem`: `'seed_teste'` (para você identificar / apagar depois facilmente no Supabase)
   - `tenant_id`: round-robin entre corretores ativos
   - `arquivado`: `false`
4. **Insere em batch único** com `.insert(payload).select('id')` — uma única ida ao banco.
5. **NÃO atualiza** `last_received_at` dos corretores nem grava em `lead_assignments` — é seed de teste, não passa pela roleta.
6. Retorna `{ ok: true, created: 100, perCorretor: { "nome1": 25, "nome2": 25, ... } }`.

### Como você dispara
Depois de deploy, no console do navegador (logado como admin) ou via curl:
```js
await supabase.functions.invoke('seed-test-leads', { body: { count: 100 } })
```
O `count` é opcional (default 100, máx 500 por chamada para segurança).

### Como limpar depois
Como você vai zerar tudo pelo Supabase mesmo, sem problema. Mas o `origem='seed_teste'` permite no futuro:
```sql
DELETE FROM leads WHERE origem = 'seed_teste';
```

### config.toml
A função entra com `verify_jwt = false` (padrão Lovable) e fazemos a validação de admin **dentro** do código.

### O que NÃO muda
- `fb-lead-webhook`, `auto-fill-leads`, `roleta-redistribute`, `useLeads`, `useRoleta`, `NovaIndicacaoModal`, `KanbanBoard` — todos intocados.
- Cap de 10 da roleta automática continua valendo para o fluxo de tráfego pago. Esse seed simplesmente não passa pela roleta (insere direto, igual à indicação manual).

Posso prosseguir e criar essa edge function?
