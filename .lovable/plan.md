
## Problema

O Supabase retorna no maximo 1000 linhas por request. O hook `useLeads` faz uma unica query `select("*")`, entao so carrega 1000 dos 3080 leads. Isso causa:
1. Dashboard mostra "Total de Leads: 1000" em vez de 3080
2. Leads com corretores atribuidos nao aparecem porque estao alem do limite

## Solucao

Implementar paginacao automatica no `useLeads.ts` para buscar TODOS os leads em lotes de 1000.

### Alteracoes

**Arquivo: `src/hooks/useLeads.ts`**

- Criar uma funcao auxiliar `fetchAllLeads` que faz queries em loop com `.range(from, to)` ate nao haver mais resultados
- Substituir a query simples `supabase.from("leads").select("*")` pela funcao paginada
- Manter os filtros existentes (admin ve tudo, corretor ve so os dele)
- Manter o `order("created_at", { ascending: false })`

Logica da paginacao:
```
async function fetchAllLeads(baseQuery) {
  const PAGE_SIZE = 1000;
  let allRows = [];
  let from = 0;
  while (true) {
    const { data, error } = await baseQuery.range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return allRows;
}
```

Nenhuma outra alteracao necessaria — Dashboard, Kanban, etc. ja consomem o array `leads` do hook.
