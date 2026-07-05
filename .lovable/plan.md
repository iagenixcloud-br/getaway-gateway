## Filtro "Incluir arquivados" na tela Exportar & Arquivar

Arquivo único: `src/pages/Exportar.tsx`. Nenhuma outra tela/query é tocada.

### Alterações

1. **Estado**: novo `const [incluirArquivados, setIncluirArquivados] = useState(false)`.

2. **Interface `LeadRow`** (local do arquivo): adicionar `arquivado: boolean`.

3. **Query em `fetchLeads`** (linhas ~97-102):
   - Incluir `arquivado` na lista de colunas do `.select(...)`.
   - Aplicar `.eq("arquivado", false)` **somente quando** `!incluirArquivados`. Quando marcado, remove o filtro (traz ativos + arquivados).

4. **UI de filtro**: adicionar um checkbox "Incluir arquivados" no bloco de filtros, ao lado de Corretor/Período (nova coluna no grid, ou logo abaixo com mesmo estilo dos labels existentes). Marcar/desmarcar não dispara fetch automaticamente — segue o padrão atual (usuário clica "Aplicar filtros"). Alternativamente, disparar `fetchLeads()` on-change; vou seguir o padrão manual para consistência.

5. **Tabela desktop**:
   - Renderizar coluna extra **"Arquivado"** (após "Substatus") **apenas quando `incluirArquivados` for true**, exibindo "Sim" / "Não".
   - Ajustar `colSpan` do estado vazio e a contagem de células do skeleton dinamicamente (`7` ou `8`).

6. **Cards mobile**: quando `incluirArquivados` e o lead estiver `arquivado === true`, exibir uma pequena badge "Arquivado" no card (mesmo estilo da badge de status, cor neutra) para diferenciar visualmente.

7. **CSV (`exportCsv`)**:
   - Quando `incluirArquivados` for true, incluir header **"Arquivado"** logo após "Substatus" e o valor "Sim"/"Não" em cada linha. Quando false, CSV permanece idêntico ao atual.

### Fora do escopo

- Dashboard, Pipeline (`useLeads`), Desempenho, `metricas_funil`: intocados.
- Ação de "Arquivar" continua funcionando igual (UPDATE `arquivado = true`).

### Validação

- Desmarcado: resultado idêntico ao atual (só ativos).
- Marcado + "Aplicar filtros": lista traz arquivados junto, coluna "Arquivado" aparece com Sim/Não corretos, CSV inclui a coluna extra.
