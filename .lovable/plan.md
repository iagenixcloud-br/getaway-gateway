## Diagnóstico

Confirmado: o banco externo tem **770 leads totais**, sendo **636 inseridos hoje (25/06)** entre 00:59 e 01:21 UTC (≈ 22h BR do dia 24). Antes desse bloco eram ~134 leads. Todos os 636 estão com `tenant_id: null` (não entraram na roleta).

Distribuição por campanha (top):
- 145 — Recreio - Parcela R$1.500 • IG
- 140 — Recreio 01 - Parcela Alta • IG
- 115 — WOOD - DOUBLE SUÍTES • IG
- 105 — Contratação Mar. 2026 • IG
- 79 — Form Arte Wood 01.2026 • IG
- … (e outras menores)

Esse volume não é compatível com captação real de um dia — são leads antigos do Facebook que entraram em massa, provavelmente porque o guard de data que coloquei no `fb-lead-webhook` / `fb-sync-leads` não está bloqueando, ou alguma chamada manual disparou um sync amplo.

## Plano

1. **Investigar a origem da entrada em massa**
   - Ler logs do edge function `fb-sync-leads` e `fb-lead-webhook` no projeto externo no intervalo 00:55–01:25 UTC de 25/06.
   - Conferir o `created_time` real desses leads no Facebook (amostra de 5 IDs) para confirmar se são antigos.

2. **Corrigir o guard de data definitivamente**
   - Revisar a comparação `leadTs < sinceTimestamp` no `fb-lead-webhook` (provável bug de timezone/parse de `created_time`).
   - Adicionar log explícito mostrando `lead.created_time`, `sinceTimestamp` e decisão (`skipped_old_lead` / `accepted`) em cada chamada.
   - Garantir que `fb-sync-leads` aceite apenas leads com `created_time >= hoje 00:00 BRT`, mesmo quando o Facebook devolve histórico.

3. **Limpar os leads injetados indevidamente**
   - Apagar do banco externo os 636 leads inseridos entre `2026-06-25 00:59 UTC` e `2026-06-25 01:21 UTC` (todos com `tenant_id IS NULL`, status `lead_novo`).
   - Não mexer nos ~134 leads anteriores nem em leads atribuídos.

4. **Validar**
   - Conferir contagem volta a ~134.
   - Rodar `fb-sync-leads` manualmente e confirmar via log que nada antigo entra.
   - Confirmar com você se a roleta volta a operar normalmente com leads novos reais.

## Detalhes técnicos

- Critério de limpeza (SQL no externo):
  ```sql
  DELETE FROM public.leads
  WHERE created_at >= '2026-06-25 00:55:00+00'
    AND created_at <= '2026-06-25 01:25:00+00'
    AND tenant_id IS NULL
    AND status = 'lead_novo';
  ```
- Antes de deletar, exportarei CSV de backup desses leads em `/mnt/documents/leads_removidos_2026-06-25.csv`.
- Guard reforçado: comparar em **segundos UTC** com `Math.floor(Date.parse(lead.created_time)/1000)` e logar todos os rejeitados em `webhook_logs` (interno) com payload mínimo para auditoria.

## Confirmação necessária

Posso seguir e **deletar os 636 leads** (após backup)? Ou prefere revisar a lista antes?