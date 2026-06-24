## Diagnóstico inicial (já feito)

Olhando `webhook_logs` dos últimos 7 dias:

- **789 eventos `success`** — mas ao filtrar `event_type='leadgen'` excluindo testes sintéticos (`__TEST_*`, `e2e_*`), o resultado é **zero eventos reais do Facebook**.
- Todos os leads "reais" que entraram vieram via `event_type='leadgen_sync'` — ou seja, **somente pelo pull manual do `reimport-leads` / `fb-sync-leads`**.
- A função `fb-lead-webhook` está respondendo (testes sintéticos passam), mas **a Meta nunca chamou ela com lead real**.

Conclusão: o endpoint está vivo, mas a Meta não está enviando eventos. É um problema de **configuração do webhook no lado do Facebook**, não do código.

## Plano — diagnosticar e consertar o webhook real-time

### 1) Rodar `fb-token-check` e ler o resultado

Já existe. Invocar via `supabase--curl_edge_functions` e checar:
- `me` → identifica se é user token ou page token, e qual página
- `permissions` → precisa ter `leads_retrieval`, `pages_manage_metadata`, `pages_show_list`, `pages_read_engagement`
- `debug_token` → validade (não pode estar expirado) e tipo
- `pages` → quais páginas o token alcança

Se faltar permissão ou o token estiver expirado, **esse já é o motivo** — webhook não dispara sem `leads_retrieval` + `pages_manage_metadata`.

### 2) Verificar subscription da página no app

Chamar Graph API direto (dentro de uma checagem read-only):
```
GET /{page_id}/subscribed_apps?access_token={PAGE_TOKEN}
```
Se o app não estiver na lista, ou estiver sem o campo `leadgen` subscrito, a Meta não envia nada. Conserto: `fb-subscribe` (já existe na codebase) faz o `POST /{page_id}/subscribed_apps` com `subscribed_fields=leadgen`.

### 3) Verificar webhook no nível do App (App Dashboard)

Isso só é visível pelo painel do Meta for Developers — não dá pra checar via Graph API com page token. Vou listar pro usuário **o que ele precisa conferir manualmente** no painel:
- App → Webhooks → Page → callback URL apontando pra `https://lzgdvvapzmuogtlivzxa.supabase.co/functions/v1/fb-lead-webhook`
- Verify token bate com `FB_VERIFY_TOKEN` (secret)
- Campo `leadgen` marcado como subscribed
- Status "Active" (não "Inactive" nem com erro de entrega)

### 4) Diagnóstico final + recomendação

Com base no resultado de 1) e 2), classificar:
- **Token expirado/sem permissão** → renovar token (`fb-token-extend` ou re-OAuth via `fb-oauth-callback`)
- **Página não subscrita no app** → rodar `fb-subscribe`
- **App não subscrito ao campo leadgen no Dashboard** → instruir o usuário a corrigir no painel da Meta (não há como fazer via API com permissões normais)
- **Tudo certo, mas eventos não chegam** → checar se a página de fato está gerando leads (formulário ativo, anúncio rodando) e pedir que dispare um lead de teste pela ferramenta da Meta (Lead Ads Testing Tool)

## Detalhe técnico

Tudo read-only nessa primeira passada. Nenhuma escrita em banco, nenhuma mudança de código. Se algum item precisar de correção (rodar `fb-subscribe`, renovar token, mexer em secret), volto com um segundo plano específico antes de executar.

## Entrega

Um relatório no chat com:
1. Saída resumida do `fb-token-check` (permissões OK/faltando, validade, página)
2. Resultado do `GET /{page_id}/subscribed_apps` (app subscrito? campo leadgen?)
3. Checklist do que o usuário precisa conferir no Meta App Dashboard
4. Diagnóstico final + próximo passo recomendado
