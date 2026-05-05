
## Plano: Perda + Cliente Futuro com Substatus (dropdown)

### Resumo
- Renomear "Não-Qualificado" para **"Perda"** (`perda`)
- Adicionar nova etapa **"Cliente Futuro"** (`cliente_futuro`) após Perda
- Exibir o `substatus` (já existe no banco) nos cards do Kanban
- Ao mover para Perda ou Cliente Futuro, exibir dropdown com opções fixas

**Sem migration** — a coluna `substatus` já existe na tabela `leads`.

---

### Opções fixas do substatus

**Perda:**
- Não gostou da localização
- Não gostou da planta
- Sem perfil financeiro
- Prazo longo
- Fora do momento de compra

**Cliente Futuro:**
- Busca outra região
- Busca imóvel maior
- Busca imóvel mais barato
- Busca imóvel pronto
- Entrada menor
- Parcela menor

---

### Arquivos a alterar

#### 1. `src/data/mockData.ts`
- Remover `nao_qualificado` do tipo `LeadStatus`, adicionar `perda` e `cliente_futuro`
- Adicionar `substatus: string` na interface `Lead`

#### 2. `src/lib/supabase.ts`
- Adicionar `substatus: string | null` na interface `LeadRow`

#### 3. `src/hooks/useLeads.ts`
- Atualizar `mapStatus`: mapear "perda", "cliente_futuro" e redirecionar variações de "nao_qualificado" para "perda"
- Incluir `substatus` no `rowToLead` e no `updateLead`

#### 4. `src/components/KanbanBoard.tsx`
- Substituir coluna `nao_qualificado` por `perda` (vermelha, ✕) e adicionar `cliente_futuro` (azul-clara, 🔄)
- Criar mini-modal com dropdown de substatus que aparece ao mover lead para `perda` ou `cliente_futuro` (drag-and-drop e botões do modal)
- Nos cards dessas duas colunas, exibir o substatus com bullet (• motivo) abaixo do imóvel
- No modal de edição, mostrar substatus como campo somente-leitura ou dropdown quando status for perda/cliente_futuro

#### 5. `src/pages/Dashboard.tsx`
- Trocar `nao_qualificado` por `perda` + adicionar `cliente_futuro`

#### 6. `src/pages/Leads.tsx`
- Atualizar labels e cores

#### 7. `src/pages/Desempenho.tsx`
- Atualizar labels e cores
