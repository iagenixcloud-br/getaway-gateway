## Objetivo
Adicionar campo **Observações** (texto livre) ao lead, editável no modal e visível como ícone de nota no card do Kanban.

## Mudanças

### 1) Banco (Supabase externo — você roda o SQL)
```sql
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS observacoes TEXT;
```
Campo opcional, sem default. Nenhuma policy nova necessária (herda as existentes da tabela `leads`).

### 2) Tipo `Lead` — `src/data/mockData.ts`
Adicionar: `observacoes: string;` (string vazia = sem observação).

### 3) Hook `src/hooks/useLeads.ts`
- **Leitura (linha ~119):** `observacoes: row.observacoes ?? "",`
- **Update (próximo à linha 312):** `if (patch.observacoes !== undefined) dbPatch.observacoes = toStr(patch.observacoes);`
- **Create input type + insert (linhas 333 e 353):** incluir `observacoes` no tipo e gravar `observacoes: input.observacoes?.trim() || null`.

### 4) Modal de edição — `src/components/KanbanBoard.tsx` (LeadModal)
Logo abaixo do bloco "Imóvel de Interesse" (linha 468–475), adicionar:
```
<div className="md:col-span-2">
  <label>Observações</label>
  <textarea
    rows={3}
    value={form.observacoes}
    onChange={(e) => set("observacoes", e.target.value)}
    placeholder="Ex.: Agendamento para 12/06 às 14h | Retornar ligação em 2 dias"
  />
</div>
```
Incluir `observacoes` na verificação de `dirty` e no payload de `handleSave`/`onUpdate`.

### 5) Card do Kanban (mesmo arquivo)
Logo abaixo do bloco "Imóvel" (linha ~726, e equivalente na variação editável ~868), renderizar **somente se** `lead.observacoes` não estiver vazio:
```
<div className="flex items-center gap-2 mb-2">
  <svg> {/* ícone de nota (note/sticky) */} </svg>
  <span style={{fontSize:12,color:'var(--text-muted)',
    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
    {lead.observacoes}
  </span>
</div>
```
Ícone: linhas horizontais dentro de um retângulo (padrão "note") em `stroke=currentColor`, cor `var(--text-muted)`, mesmas dimensões 12×12 do ícone de imóvel para consistência visual.

Na versão editável do card (Roleta), usar `<EditableField multiline value={lead.observacoes} onSave={(v) => onUpdate!({ observacoes: v })} placeholder="Observações" />`.

## Ordem de execução
1. Você roda o `ALTER TABLE` no Supabase externo.
2. Eu aplico as mudanças nos 3 arquivos do frontend (`mockData.ts`, `useLeads.ts`, `KanbanBoard.tsx`).
3. Validação: abrir um lead, preencher observação, salvar, ver o texto aparecer no card.

## Fora de escopo
- Sincronização com Alfred / webhook (campo só pelo CRM por enquanto).
- Histórico de observações (só guarda o texto atual).