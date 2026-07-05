## Adicionar coluna "Substatus" na tela Exportar & Arquivar

Arquivo: `src/pages/Exportar.tsx`

O campo `substatus` já é carregado do banco e já está incluído no CSV exportado (header `"Substatus"` entre Status e Corretor). Faltam apenas as exibições visuais.

### Alterações

1. **Tabela desktop** (`<table>` dentro do bloco `hidden md:block`):
   - Adicionar `<th>Substatus</th>` entre "Status" e "Corretor".
   - Adicionar `<td>{r.substatus || "—"}</td>` na mesma posição em cada linha.
   - Atualizar `colSpan` do estado vazio de `6` para `7`.
   - Atualizar o loading skeleton para gerar 7 células (em vez de 6).

2. **Cards mobile** (`md:hidden`):
   - Adicionar, abaixo da linha do telefone, uma linha com o substatus quando presente: `{r.substatus && <p style={{fontSize:11,color:"rgba(255,255,255,0.6)"}}>Substatus: {r.substatus}</p>}`.

3. **Exportação CSV**: já contempla o header `"Substatus"` na posição correta — nenhum ajuste necessário.

4. **Vazio/null**: renderizar `"—"` na tabela e omitir a linha nos cards; nenhum tratamento adicional.

### Validação

- Aplicar filtro "Perda" ou "Cliente Futuro" e confirmar que a coluna Substatus aparece preenchida (ex: "Sem perfil financeiro", "Busca imóvel mais barato").
- Exportar CSV e conferir que a coluna Substatus permanece na mesma posição relativa.
