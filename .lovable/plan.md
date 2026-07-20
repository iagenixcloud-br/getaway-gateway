
## Objetivo

Parar o loop da Marcia/Daniele (mesmo lead entrando várias vezes por dia) sem bloquear reentradas legítimas do mesmo cliente em datas diferentes.

## Regra nova de deduplicação

Para cada lead que chega (via `fb-lead-webhook` ou `fb-sync-leads`):

- Chave = **telefone normalizado + interest (nome do formulário)**
- Se já existe lead com essa chave criado nas **últimas 24 horas** → **ignora** (marca como `skipped_duplicate_24h` no `webhook_logs`).
- Se o lead mais recente com essa chave tem **mais de 24 horas** → **deixa entrar** (reentrada legítima).
- Se nunca existiu → entra normal.

Isso substitui o dedup atual "telefone+interest para sempre" que estava deixando passar duplicatas em execuções concorrentes do cron e/ou webhook.

## Mudanças

### 1. `supabase/functions/fb-sync-leads/index.ts`
- Trocar o `Set<string>` de `existingPhones` (que hoje carrega todos os leads históricos) por um `Map<string, string>` onde a chave é `phone::interest` e o valor é o `created_at` **mais recente** desse par.
- Ao popular: buscar `leads` filtrando `created_at >= now() - 24h` (não precisa dos 5000 históricos).
- No loop de processamento: se `map.has(key)` → skip com motivo `duplicate_last_24h`. Senão insere e adiciona ao map com `created_at = now()` para dedup intra-batch.
- Manter o retry do insert que trata `23505` como skip (fallback caso a constraint UNIQUE seja adicionada depois).

### 2. `supabase/functions/fb-lead-webhook/index.ts`
- Mesma lógica: antes de inserir, `SELECT id, created_at FROM leads WHERE phone = ? AND interest = ? AND created_at >= now() - interval '24 hours' LIMIT 1`.
- Se retornar linha → responde 200 e loga `skipped_duplicate_24h` no `webhook_logs`.
- Senão insere normalmente e chama a RPC da roleta.

### 3. Limpeza dos duplicados atuais (one-shot via psql no banco externo)
- Manter a **cópia mais antiga** de cada `(phone, interest)` das últimas 24h e deletar as demais.
- Antes de deletar: reverter `last_received_at`/`total_received` dos corretores que receberam as cópias extras, para a roleta não ficar enviesada.
- Rodar como comandos SQL no chat de build; sem migration (é banco externo).

## Detalhes técnicos

- Normalização de telefone continua via `normalizePhone` (só dígitos, sem prefixo 0).
- `interest` é comparado exatamente como está gravado (ex: `Lumiere Parcela Alta 14.07.26 • IG`) — é o mesmo valor gerado pelo `parseLead`, então bate.
- Janela de 24h calculada em UTC no servidor (`new Date(Date.now() - 24*3600*1000).toISOString()`).
- Não altera schema. A constraint UNIQUE composta continua fora de escopo (banco externo, sem migration tool aqui).

## Fora de escopo

- Não mexe em telas do frontend.
- Não altera lógica da roleta em si (só reverte contadores dos leads deletados).
- Não adiciona constraint no banco externo neste passo.
