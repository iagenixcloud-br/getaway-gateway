## Problema
A aba **Assinaturas** está contando TODOS os corretores cadastrados (qualquer `user_roles.role = 'corretor'`), inclusive os marcados como **inativos** na aba Corretores. O cálculo deveria considerar apenas os corretores **ativos** (`profiles.is_active = true`), assim como a aba Corretores faz.

## Mudança (apenas em `src/pages/Assinaturas.tsx`)

1. Ao carregar profiles, incluir o campo `is_active` no SELECT.
2. Filtrar a lista final para manter apenas corretores com `is_active === true` (tratando `null`/`undefined` como ativo, igual ao restante do app).
3. Como consequência automática:
   - **Corretores Ativos** = nº de corretores realmente ativos.
   - **Licença por Usuário** = `ativos × R$ 50,00`.
   - **TOTAL DO MÊS** = `R$ 600 + ativos × R$ 50`.
   - A tabela "Corretores Assinantes" passa a listar somente os ativos (o badge "Ativo" deixa de ser enganoso).

## Fora de escopo
- Não mexer em Corretores, roleta, leads, telefones ou qualquer lógica de negócio.
- Não criar migrations — `profiles.is_active` já existe e já é usado por `useRoleta`/Corretores.
