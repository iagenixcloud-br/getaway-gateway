## Diagnóstico confirmado

Inspecionei diretamente o projeto **Andrade Mob** (`gycrprnkuwlzntqvpoxl`) com acesso admin e descobri:

| Item | Estado |
|---|---|
| Tabelas (`profiles`, `leads`, `lead_assignments`, `user_roles`, `roleta_state`, `report_logs`, `report_settings`) | ✅ Existem |
| Colunas da Roleta (`is_active`, `total_received`, `last_received_at`) em `profiles` | ✅ Já existem |
| Edge Functions deployadas | ❌ **ZERO** |

**Causa raiz do "Failed to send a request to the Edge Function":** as 7 functions nunca foram deployadas no Andrade Mob. Estavam apenas no projeto Lovable Cloud (`lzgdvvapzmuogtlivzxa`), que o app não usa.

## O que vou fazer

### 1. Configurar os secrets do Andrade Mob como secrets das functions
As functions usam `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_ANON_KEY`. Hoje os secrets do projeto Lovable apontam para `lzgdvvapzmuogtlivzxa`. Vou trocar por valores do `gycrprnkuwlzntqvpoxl` (busco via API com o token admin) para que as functions, ao serem deployadas via tooling do Lovable, fiquem com o ambiente correto.

> Alternativa caso a infraestrutura de deploy do Lovable esteja rigidamente atrelada ao projeto Cloud: faço deploy das 7 functions diretamente no Andrade Mob via API admin do Supabase (`POST /v1/projects/{ref}/functions`), usando o `SB_DEPLOY_ACCESS_TOKEN` que você já configurou. Esse caminho é o mais provável de funcionar e não depende dos secrets do Lovable.

### 2. Deploy das 7 Edge Functions no Andrade Mob
Functions a deployar (código já existe em `supabase/functions/`):
- `create-corretor` — corrige o erro reportado
- `update-corretor`
- `delete-corretor`
- `toggle-corretor-active`
- `roleta-redistribute`
- `fb-lead-webhook`
- `send-daily-report`

Todas serão deployadas com `verify_jwt = false` (validação JWT já é feita no código com `getClaims()`).

### 3. Validação pós-deploy
- Listar functions no Andrade Mob via API e confirmar que as 7 aparecem com status `ACTIVE`
- Testar `create-corretor` com um payload de teste e verificar resposta 200
- Verificar logs da function para garantir que não há erro de import/runtime

### 4. Limpeza do projeto Lovable Cloud antigo
Como você pediu, vou:
- Deletar as 7 Edge Functions do projeto `lzgdvvapzmuogtlivzxa` (via `supabase--delete_edge_functions`)
- Deixar uma anotação no código indicando que o app usa o projeto `gycrprnkuwlzntqvpoxl` (Andrade Mob), não o Lovable Cloud

> **Observação:** o projeto Lovable Cloud em si (`lzgdvvapzmuogtlivzxa`) continua existindo e listado nas configurações. Não tenho como "desconectar" ele do Lovable, mas ele ficará inerte (sem functions, sem dados). O `.env` continua apontando para ele, mas isso **não afeta o app em runtime** porque `src/lib/supabase.ts` usa URLs hardcoded do Andrade Mob.

### 5. Nada que vou alterar
- **Não** mexo no `src/lib/supabase.ts` (já aponta corretamente)
- **Não** rodo migration nenhuma — schema já está completo
- **Não** mexo nos dados existentes (leads, profiles, user_roles)
- **Não** toco no `src/integrations/supabase/client.ts` nem no `.env` (são auto-gerenciados)

## Resultado esperado
Depois que eu rodar isto, você abre `/corretores`, clica "Adicionar corretor", preenche e salva → função `create-corretor` responde 200 → corretor aparece na lista. A Roleta também passa a funcionar 100% (a function `roleta-redistribute` ficará disponível e o schema já está OK).

## Riscos / pontos de atenção
- **Cold start na primeira chamada:** após deploy, a primeira invocação de cada function pode levar 2-5s. Comportamento normal.
- **Service role key:** as functions precisam do `SUPABASE_SERVICE_ROLE_KEY` do Andrade Mob para criar usuários no `auth.users`. Vou buscar via `GET /v1/projects/{ref}/api-keys` e configurar como secret das functions no Andrade Mob.
- **Caso o deploy via API admin falhe** por restrição de plano ou config faltando, faço fallback para gerar um script `supabase functions deploy` que você roda 1x no terminal — mas não acho que será necessário.