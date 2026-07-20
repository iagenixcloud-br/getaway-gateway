## Causa raiz (confirmada nos logs)

Marcia (leadgen_id `2183149779132525`) e Daniele (`1057397330276382`) estão sendo reinseridas a cada 10 min pelo cron `fb-sync-leads`, sempre com status `success` — ou seja, o dedup **não está pegando**.

Investigando os logs:
- Existem **18.676** registros em `webhook_logs` com `leadgen_id` preenchido; só nas últimas 24h são **3.569**.
- A função hoje faz:
  ```ts
  cloudAdmin.from("webhook_logs").select("leadgen_id").not("leadgen_id","is",null).limit(5000)
  ```
  **sem `order by`**. Postgres devolve as linhas na ordem física (mais antigas primeiro), então o `Set` de `existingLeadgenIds` carrega 5.000 IDs antigos e **não inclui os leadgen_ids inseridos hoje** — inclusive os da Marcia/Daniele. Por isso o cron reprocessa esses mesmos IDs a cada rodada.
- A dedup por telefone+interest também não segura porque a query de `existingLeads` no CRM externo tem o mesmo problema (`.limit(5000)` sem `order`), então em janelas com muitos leads a lista efetiva pode não conter os mais recentes.

## Correção

Editar `supabase/functions/fb-sync-leads/index.ts`:

1. **Dedup por leadgen_id** — buscar só a janela relevante e ordenar:
   ```ts
   cloudAdmin.from("webhook_logs")
     .select("leadgen_id")
     .not("leadgen_id","is",null)
     .gte("created_at", new Date(Date.now() - 7*24*3600*1000).toISOString())
     .order("created_at", { ascending: false })
     .limit(10000)
   ```
   (7 dias cobre com folga a janela de reprocessamento do Facebook.)

2. **Dedup por telefone+interest (24h)** — garantir ordenação para nunca perder recentes:
   ```ts
   crmAdmin.from("leads")
     .select("phone, interest, created_at")
     .gte("created_at", since24h)
     .order("created_at", { ascending: false })
     .limit(10000)
   ```

3. **Reforço** — antes de inserir cada lead, fazer um `select` pontual `phone=? AND interest=? AND created_at>=since24h limit 1` no CRM (mesmo padrão que já existe no `fb-lead-webhook`). Custo baixo (~1 query por lead novo) e elimina qualquer race entre execuções simultâneas do cron.

Não mexe em schema, frontend nem lógica da roleta.

## Limpeza dos duplicados de hoje (Marcia/Daniele/etc.)

Depois de publicar o fix, rodar o mesmo script de limpeza que já usamos:
- manter a cópia mais antiga de cada `(phone, interest)` das últimas 24h no CRM externo;
- arquivar/deletar as demais;
- decrementar `total_received` dos corretores que receberam as cópias extras.

## Fora de escopo

- Constraint UNIQUE no banco externo (segue pendente por não ter migration tool no CRM externo).
- Qualquer mudança de UI.
