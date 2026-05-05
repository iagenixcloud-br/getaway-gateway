
## Plano — Aba "Assinaturas"

### Observação sobre o schema
A tabela `profiles` tem os campos `name` e `email` (não `full_name` nem `avatar_url`). O avatar será gerado via DiceBear (iniciais do nome), como já feito no Layout.

### 1. Nova página `src/pages/Assinaturas.tsx`
- Busca corretores: query em `user_roles` com `.eq('role', 'corretor')`, join com `profiles` para trazer `name` e `email`.
- 4 cards no topo:
  - Licença CRM: R$ 600,00
  - Corretores Ativos: count dinâmico
  - Licença por Usuário: R$ (count × 50)
  - Total do Mês: R$ (600 + count × 50) com borda dourada
- Tabela: Avatar (iniciais) | Nome | Email | Membro desde (created_at formatado) | Mensalidade R$ 50,00 | Status "Ativo"
- Loading spinner durante carregamento
- Visual dark consistente com o projeto

### 2. Rota em `src/App.tsx`
- Adicionar rota `/assinaturas` com proteção: apenas o email `iagenixcloud@gmail.com` acessa. Outros são redirecionados para `/dashboard`.

### 3. Menu lateral em `src/components/Layout.tsx`
- Adicionar link "Assinaturas" com ícone de cifrão (DollarSign do SVG inline, mantendo o padrão existente)
- Posicionado abaixo de "Administradores"
- Visível apenas quando `user?.email === 'iagenixcloud@gmail.com'`

### 4. Segurança
- A página `Assinaturas` verifica `user.email` no componente e redireciona se não autorizado.
- O menu oculta o item para outros usuários.
