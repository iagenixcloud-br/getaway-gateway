# Inserir apenas 3 leads (manual, um a um)

## O que vou fazer

Inserir exatamente 3 linhas na tabela `leads` do CRM externo, via `crmAdmin` (ou edge function dedicada), com estes dados e nada mais:

| Nome   | Telefone           | Status     |
|--------|--------------------|------------|
| Italo  | +55 32 988138793   | lead_novo  |
| Daine  | +55 21 979056620   | lead_novo  |
| Lucas  | +55 21 993714193   | lead_novo  |

Para cada um:
1. Checar dedup por telefone normalizado — se já existir, **pula** (não duplica)
2. Escolher próximo corretor da roleta (cap 10, `last_received_at ASC`)
3. `INSERT` 1 linha
4. `registrar_atribuicao_roleta` (avança fila + total_received + lead_assignments)
5. Log em `webhook_logs` com `status=success`, `event_type=manual_insert`

## O que NÃO vou fazer

- ❌ Não rodar `fb-sync-leads`, `seed-test-leads`, `auto-fill-leads`, `seed-pt-wagner`
- ❌ Não puxar nada da Graph API por janela de tempo
- ❌ Não inserir nenhum lead além desses 3
- ❌ Não mexer em mais nada (corretores, profiles, status de outros leads)

## Validação final

Depois rodo:
```sql
SELECT count(*) FROM leads WHERE status='lead_novo';
-- esperado: 18 (15 atuais + 3)

SELECT name, phone, tenant_id, created_at
FROM leads
WHERE phone IN ('+55 32 988138793','+55 21 979056620','+55 21 993714193')
ORDER BY created_at DESC;
-- esperado: exatamente 3 linhas
```

Se contagem ≠ 18 ou aparecer 4ª linha, eu reverto.

## Depois disso

Diagnóstico separado do porquê o webhook da Meta não disparou (token/inscrição) — **só depois** que você confirmar que os 3 entraram certos. Sem mexer em mais nada antes disso.

Aprovo e executo?
