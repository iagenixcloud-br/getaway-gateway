## Objetivo
Reatribuir o lead **Antonio (+55 11 94591-0202)** de **Amauri da Roberta** para **Makcyne Pereira** no CRM externo.

## Situação atual
- O CRM externo guarda o corretor responsável em `leads.tenant_id` (FK para `profiles.id`).
- Não existe hoje uma edge function para reatribuir lead manualmente — só temos `roleta-redistribute` (automática) e `auto-fill-leads` (preenche não-atribuídos).
- Como provavelmente vamos precisar trocar corretor de outros leads no futuro, vale criar uma função reutilizável em vez de um UPDATE pontual.

## Passos

1. **Criar edge function `reassign-lead`** (admin-only)
   - Entrada: `{ lead_id: string, corretor_name?: string, corretor_id?: string }`
   - Valida JWT e checa role `admin`/`master`.
   - Resolve `corretor_id` buscando em `profiles` pelo nome (case-insensitive) quando só vier o nome.
   - Atualiza `leads.tenant_id` no Supabase externo e retorna o lead atualizado (nome do corretor antigo e novo).
   - Loga em `webhook_logs` (event_type = `lead_reassigned`) para auditoria.

2. **Executar a reatribuição agora**
   - Chamar `reassign-lead` com `lead_id = 61b213bb-...` e `corretor_name = "Makcyne Pereira"`.
   - Confirmar via `lookup-lead` que o `corretor` retornado virou Makcyne Pereira.

## Não incluído
- Não vou adicionar observação no lead (a observação que você mandou era um motivo para manter com Amauri — agora estamos trocando, então registrar isso confundiria).
- Não vou criar UI nova para reatribuir nesta passada — só a função + execução. Se quiser botão no Kanban, faço numa próxima.