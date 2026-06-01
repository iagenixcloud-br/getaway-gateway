## Exportar & Arquivar — Nova aba admin

### 1. Roteamento e menu
- **`src/App.tsx`**: adicionar `<Route path="/exportar">` com `<ProtectedRoute requireAdmin>` envolvendo nova página `Exportar`.
- **`src/components/Layout.tsx`**: novo item de menu "Exportar & Arquivar" logo abaixo de "Desempenho", visível só com `isAdmin` (ícone de arquivo/caixa).
- **`src/pages/Exportar.tsx`** (novo): título "Exportar & Arquivar" + subtítulo "Gerencie, exporte e arquive leads".

### 2. Filtros (topo, lado a lado)
- **Status** — multiselect com todas as opções (`lead_novo`, `negocio`, `agendamento`, `visita`, `proposta`, `venda`, `perda`, `cliente_futuro`, `curioso`, `follow_up`). Padrão: `venda` + `cliente_futuro`.
- **Corretor** — dropdown via `useCorretores()` (padrão: "Todos").
- **Período** — select: mês / trimestre / semestre / ano. Padrão: últimos 90 dias (convertido em `created_at >= now() - 90d`).
- **Botão "Aplicar filtros"** — dispara fetch.

### 3. Fetch
- Query direta em `leads` (Supabase): `select id, name, phone, email, status, substatus, city, interest, created_at, tenant_id` com `.eq('arquivado', false)`, `.in('status', statusSelecionados)`, range de data, e opcional `.eq('tenant_id', corretorId)`.
- Para coluna "Corretor" da tabela, fazer lookup via `useCorretores()` mapeando `tenant_id` → nome (mantém compatibilidade com o resto do app, que usa `tenant_id` como dono do lead). Observação: o brief menciona `lead_assignments`, mas o app inteiro hoje usa `leads.tenant_id` como corretor (ver `useLeads.ts`); seguir esse padrão para evitar inconsistência.

### 4. Card de resumo
"X leads encontrados com os filtros selecionados" + breakdown: `X Vendas | X Cliente Futuro | X Outros`.

### 5. Ações
- **Exportar CSV** (azul `#185FA5`): gera CSV no cliente com colunas Nome, Telefone, Email, Status, Substatus, Corretor, Data entrada, Cidade, Interesse. Download via `Blob` + `<a download>`. Exporta apenas linhas atualmente filtradas (ou só selecionadas se houver seleção — confirmar com tooltip).
- **Arquivar selecionados** (vermelho `#D85A30`): habilitado só se houver checkboxes marcados. Abre modal de confirmação obrigatório com input de texto: usuário precisa digitar exatamente `ARQUIVAR` para liberar o botão "Confirmar". Texto exato do brief.
  - UPDATE: `supabase.from('leads').update({ arquivado: true }).in('id', ids).eq('tenant_id', userId)`.
  - Após sucesso: toast `"X leads arquivados com sucesso"`, limpa seleção, refaz fetch.

### 6. Tabela preview
Colunas: checkbox | Nome | Telefone | Status | Corretor | Data | (sem coluna ações extra — operações em lote). Header com "Selecionar todos". Skeleton (`animate-pulse bg-[#112236]`) enquanto carrega.

### 7. Filtrar arquivados em todo o app
Adicionar `.eq('arquivado', false)` em:
- `src/hooks/useLeads.ts` — query paginada principal. Filtro também no handler de realtime (ignorar UPDATE que torna `arquivado = true` mantém remoção via `eventType` UPDATE: se `row.arquivado === true`, remover da lista local).
- Verificar se `src/pages/Leads.tsx` faz query própria; se sim, adicionar mesmo filtro. (Vou ler durante implementação.)

### 8. Design
- Fundo `#0d1b2a`, cards `#112236`, bordas 0.5px, fonte Inter — consistente com `ConversaoPanel`.
- Modal: overlay escuro + card `#112236`, input controlado, botão Confirmar desabilitado até `value === "ARQUIVAR"`.
- Toast via `sonner` (já usado no projeto, se aplicável) ou alert simples seguindo padrão existente — verificar durante build.

### 9. Segurança
- Rota protegida por `ProtectedRoute requireAdmin` (redirect para `/` se não-admin, padrão atual do app — o brief pede `/dashboard` mas o padrão do projeto é `/`; seguir padrão).
- UPDATE de arquivamento sempre com `.eq('tenant_id', user.id)` no client (RLS no banco continua sendo a defesa real).
- Sem alterações de schema, migrations, RLS ou triggers — o brief confirma que `arquivado` e trigger já existem.

### Arquivos
- Novo: `src/pages/Exportar.tsx`
- Editado: `src/App.tsx`, `src/components/Layout.tsx`, `src/hooks/useLeads.ts` (filtro `arquivado=false`)
- Possivelmente editado: `src/pages/Leads.tsx` (se tiver query própria)
