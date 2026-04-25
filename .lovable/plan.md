## Problema

O Supabase está retornando `purpose` capitalizado (ex.: `"Moradia"`, `"Investimento"`), mas:

- O tipo `LeadPurpose` (`src/data/mockData.ts:16`) só aceita `"investimento" | "moradia" | ""`.
- O `<select>` em `src/components/KanbanBoard.tsx:255-256` tem `value="moradia"` / `value="investimento"` (lowercase). Quando o lead vem com `"Moradia"`, nenhum `<option>` casa e o campo aparece como "—".
- A comparação `form.purpose !== lead.purpose` em `KanbanBoard.tsx:98` fica inconsistente.

## Solução

Normalizar o valor **uma única vez no ponto de entrada**, em `rowToLead` (`src/hooks/useLeads.ts`). O restante do app já assume lowercase e não precisa mudar.

### Mudança em `src/hooks/useLeads.ts`

Adicionar um helper:

```ts
const normalizePurpose = (p: string | null): LeadPurpose => {
  const v = (p || "").toLowerCase().trim();
  if (v === "moradia" || v === "investimento") return v;
  return "";
};
```

E na linha 96, trocar:

```ts
purpose: (row.purpose as LeadPurpose) ?? "",
```

por:

```ts
purpose: normalizePurpose(row.purpose),
```

## Por que essa abordagem

- **Um único ponto de normalização** evita espalhar `.toLowerCase()` por componentes, comparações e selects.
- O tipo `LeadPurpose` já é lowercase — manter o invariante "estado sempre lowercase" preserva a integridade de tipo.
- Quando o usuário salvar o lead pelo modal, o valor reescrito no banco será lowercase, corrigindo registros antigos gradualmente.

## Fora de escopo

- Não vou rodar `UPDATE` em massa no banco (ex.: `UPDATE leads SET purpose = lower(purpose)`). Se quiser corrigir todos os registros existentes de uma vez, me avise e adiciono uma migration.
- Não vou alterar `LeadPurpose` para aceitar capitalizado — isso espalharia o problema em vez de resolver.