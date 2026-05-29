# Plano — Aba "Conversão por Etapa" em `/desempenho`

## Escopo
Adicionar uma nova aba dentro da página existente `src/pages/Desempenho.tsx` chamada **"Conversão por Etapa"**, mantendo a tela atual intacta como aba "Visão Geral". A nova aba lê exclusivamente da tabela `metricas_funil` (já criada, com RLS e trigger ativos — não mexer no banco).

## Estrutura de arquivos

- `src/pages/Desempenho.tsx` — envolver conteúdo atual em `<Tabs>` com duas abas raiz: **Visão Geral** (atual) e **Conversão por Etapa** (novo).
- `src/components/conversao/ConversaoPanel.tsx` — componente principal da nova aba (barra superior, KPIs, sub-abas Funil/Perdas).
- `src/components/conversao/FunilCard.tsx` — card de etapa com barra de progresso, número absoluto, % e conector.
- `src/components/conversao/PerdasTab.tsx` — listagem de perdas "Sem contato".
- `src/hooks/useMetricasFunil.ts` — fetch + agregação de `metricas_funil` filtrando por período/corretor, respeitando role.

Nenhum arquivo novo de banco. Nenhuma migration.

## Comportamento

### Filtros (topo da aba)
- **Período** (default: mês atual). Opções: mês atual, mês anterior, últimos 3 meses. Cada opção vira lista de meses (`date_trunc('month')`) usada como `.in('mes', [...])`.
- **Corretor** (apenas admin): dropdown com `profiles` (já existe `useCorretores`). Default "Todos".
- **Badge vermelho**: soma `perdas_sem_contato` do período filtrado.
- Role lido via `useAuth().isAdmin` (já existente — equivale a `user_roles.role = 'admin'`).

### Query base
```ts
supabase.from('metricas_funil')
  .select('leads,negocios,agendamentos,visitas,propostas,vendas,perdas_sem_contato,corretor_id,mes')
  .in('mes', mesesDoPeriodo)
  .maybeEq('corretor_id', corretorSelecionado) // admin filtra; corretor RLS já restringe
```
Agregação client-side: soma de cada coluna sobre todas as linhas retornadas (vários meses × vários corretores).

### KPIs (6 cards na ordem)
1. Lead → Negócio — `(negocios/leads)*100` + `negocios` absolutos
2. Negócio → Agendamento — `(agendamentos/negocios)*100`
3. Agendamento → Visita — `(visitas/agendamentos)*100`
4. Visita → Proposta — `(propostas/visitas)*100`
5. Proposta → Venda — `(vendas/propostas)*100`
6. Total de leads — `leads` absoluto

Divisões por zero → exibir `—`.

### Sub-aba "Funil"
Cards verticais conectados por seta (`ChevronDown`/SVG). Para cada etapa:
- Header colorido com cor da etapa.
- Linha principal: número absoluto + origem (ex. "dos 89 negócios").
- Barra de progresso (`<div>` com largura `%`).
- % em destaque com cor:
  - verde `#1D9E75` se ≥ 65
  - amarelo `#D4AF37` se 50–64
  - vermelho `#D85A30` se < 50
- "Não converteu: N" (diff da etapa anterior).
- Entre cards: texto contextual (ex. "54 agendamentos → quantos compareceram?").
- Card final **Venda** com borda/glow verde.

### Sub-aba "Perdas"
- Filtra apenas `perdas_sem_contato`.
- **Admin**: agrupa por `corretor_id`, faz join com `profiles` para nome, mostra tabela `Corretor | Perdas | % sobre leads`.
- **Corretor**: mostra um card único com seu total + `% / leads`.

### Loading
Skeletons (`<div class="animate-pulse bg-[#112236]">`) em cada card e cada KPI enquanto a query roda. Sem fallback "vazio" antes de carregar.

### Cores por etapa (passar via prop)
`lead_novo #1D9E75`, `negocio #0F6E56`, `agendamento #185FA5`, `visita #534AB7`, `proposta #993556`, `venda #3C3489`, `perda #D85A30`.

### Estilo
- Fundo painel `#0d1b2a`, cards `#112236`, borda `0.5px solid rgba(255,255,255,0.08)`.
- Fonte Inter (já default do projeto).
- Responsivo: KPIs `grid-cols-2 md:grid-cols-3 lg:grid-cols-6`; funil em coluna única centralizada `max-w-2xl`.

## Detalhes técnicos

- **Tabs**: usar `@/components/ui/tabs` (shadcn) — já disponível no projeto via shadcn. Se não existir, fallback para estado local `useState<'overview'|'conversao'>`.
- **Períodos**: helper `getMesesDoPeriodo(key)` retorna array de strings ISO `YYYY-MM-01`.
- **Tipos**: criar `MetricaFunilRow` espelhando colunas da tabela.
- **RLS**: nada extra no client — confiar nas policies (`admin_vê_tudo`, `corretor_vê_próprio`).
- Sem novas dependências.

## Fora do escopo
- Criação/alteração de tabelas, triggers ou edge functions.
- Mudança na aba "Visão Geral" atual.
- Exportações/PDF.
