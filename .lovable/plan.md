# Entrada Manual de Leads (Indicação) — com regra de role

Funcionalidade isolada do fluxo de tráfego pago. Nada do `fb-lead-webhook`, roleta, auto-fill ou n8n é alterado.

## 1. Banco — coluna `origem` em `public.leads` (CRM externo)

Tabela vive no Supabase externo (`gycrprnkuwlzntqvpoxl`). Adicionar nova edge function one-shot `deploy-origem-column` ao painel de fontes do `supabase/functions/deploy-to-external/index.ts` (mesmo padrão dos slugs `admin-reset-password` / `auto-fill-leads`), que ao ser invocada roda via service role do externo:

```sql
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'trafego_pago';

CREATE INDEX IF NOT EXISTS leads_origem_idx ON public.leads(origem);
```

Idempotente. Default `'trafego_pago'` preserva os leads existentes e os do FB **sem alterar uma linha** do `fb-lead-webhook`. Leads manuais entram com `origem = 'manual_indicacao'`.

Pré-checagem das policies de INSERT em `public.leads` no CRM externo:
- corretor comum precisa poder inserir com `tenant_id = auth.uid()`
- admin precisa poder inserir com qualquer `tenant_id` (via `has_role(auth.uid(),'admin')`)

Se faltar policy, gerar SQL adicional rodado pela mesma function one-shot.

## 2. UI — Botão `+ Indicação` no header da coluna `lead_novo`

Em `src/components/KanbanBoard.tsx`:
- localizar o header da coluna cujo `status === 'lead_novo'`
- inserir botão pill gold `+ Indicação` (estilo discreto, alinhado à direita do título)
- visível para qualquer usuário logado
- onClick abre `<NovaIndicacaoModal />`
- state local `indicacaoOpen: boolean`

## 3. Novo componente `src/components/NovaIndicacaoModal.tsx`

Estilo glass/blur dos modais existentes. Props: `open`, `onClose`.

Lê `{ isAdmin, user }` de `useAuth()`. Quando `isAdmin`, lê `corretores` ativos de `useCorretores()`.

Cabeçalho: **+ Nova Indicação** (sem campo de status/etapa — `lead_novo` é forçado, nunca exposto).

Campos comuns:
| Campo | Tipo | Regras |
|---|---|---|
| Nome completo | input text | obrigatório, `trim()`, max 120 |
| Telefone | input com máscara `(DD) 9XXXX-XXXX` | obrigatório, 11 dígitos após desmáscara |
| Observações | textarea | opcional, max 1000 |

Campo condicional (`isAdmin === true`):
| Campo | Tipo | Regras |
|---|---|---|
| Vincular ao Corretor | `<select>` | obrigatório p/ admin, placeholder "Selecione um corretor", lista corretores ativos |

Botão **Salvar** desabilitado enquanto:
- nome inválido, **ou**
- telefone inválido (≠ 11 dígitos limpos), **ou**
- (admin) corretor não selecionado

Estados: `saving`, `error`. Em sucesso: `toast.success("Indicação cadastrada")`, fecha modal, reseta form.

## 4. Hook — novo método `createIndicacao` em `src/hooks/useLeads.ts`

Contrato separado de `createLead` (não reutiliza, evita acoplamento com tráfego pago):

```ts
const createIndicacao = async (input: {
  name: string;
  phone: string;
  observacoes?: string;
  assignedTo?: string | null; // só usado quando admin
}): Promise<{ error: string | null; lead: LeadRow | null }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado", lead: null };

  const tenantId = isAdmin ? (input.assignedTo ?? null) : user.id;
  if (isAdmin && !tenantId) {
    return { error: "Admin deve selecionar um corretor", lead: null };
  }

  const payload = {
    name: input.name.trim(),
    phone: sanitizePhone(input.phone),
    observacoes: input.observacoes?.trim() || null,
    status: "lead_novo",          // forçado
    tenant_id: tenantId,          // próprio id (corretor) ou seleção (admin)
    origem: "manual_indicacao",   // forçado
    arquivado: false,
  };

  const { data, error } = await supabase
    .from("leads").insert(payload).select().single();

  if (!error && data) {
    // insert otimista no estado local (mesmo padrão do createLead)
    setLeads((prev) => [data as LeadRow, ...prev]);
  }
  return { error: error?.message ?? null, lead: (data as LeadRow) ?? null };
};
```

Regras imutáveis nunca expostas na UI:
- `status` sempre `'lead_novo'`
- `origem` sempre `'manual_indicacao'`
- `tenant_id` = próprio id (corretor) ou seleção (admin) — nunca digitado livre
- `arquivado` sempre `false`

## 5. UI após salvar

- `useLeads` já tem realtime INSERT → confirma o card.
- Insert otimista garante card imediato.
- Card renderizado pelo `LeadCard` existente — layout idêntico aos da imagem `image_75b4d8.png`, com a tag do corretor lida via `useCorretores().corretores.find(c => c.id === lead.tenant_id)`.
- Toast de sucesso e fechamento do modal.

## 6. O que NÃO é tocado

- `supabase/functions/fb-lead-webhook/index.ts`
- `supabase/functions/auto-fill-leads/index.ts`
- `supabase/functions/roleta-redistribute/index.ts`
- `supabase/functions/reassign-lead/index.ts`
- Trigger n8n / webhooks
- Estrutura de `leads` além da nova coluna `origem`
- `createLead` existente

## Ordem de execução

1. Adicionar slug `deploy-origem-column` em `deploy-to-external` + invocar uma vez
2. Conferir/ajustar RLS de INSERT em `leads` (corretor e admin) no CRM externo
3. Criar `src/components/NovaIndicacaoModal.tsx`
4. Adicionar `createIndicacao` em `src/hooks/useLeads.ts`
5. Adicionar botão `+ Indicação` no header de `lead_novo` em `KanbanBoard.tsx`
6. Smoke test:
   - logar como corretor → criar indicação → card aparece atribuído a ele com tag própria
   - logar como admin → criar indicação escolhendo outro corretor → card aparece com tag do corretor escolhido
   - conferir no banco: `origem = 'manual_indicacao'`, `status = 'lead_novo'`
