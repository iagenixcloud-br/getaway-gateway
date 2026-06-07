## Mudanças

### 1. `src/pages/Corretores.tsx`
- Após carregar `profiles` + `user_roles`, montar também um `Set` de `masterIds` (role = "master"). Se o usuário logado **não** for master, filtrar a lista removendo qualquer linha cujo `id` esteja em `masterIds` — assim a linha do Admin Master (iagenixcloud@gmail.com) desaparece para o Bruno.
- Trocar a condição do botão "Senha" de `{isMaster && !isSelf && ...}` para `{isAdmin && !isSelf && ...}`. Como o filtro acima já remove o Master da lista para o Bruno, ele só vê o botão Senha para seus próprios corretores.

### 2. `supabase/functions/admin-reset-password/index.ts`
- Permitir que tanto `admin` quanto `master` redefinam senhas (hoje só `master`):
  - Buscar todas as roles do caller (`.in("role", ["admin","master"])`).
  - Se não tiver nenhuma, retorna 403.
- Camada de segurança: se o caller **não** for master, verificar as roles do `target user_id`. Se o alvo for master, retornar 403 com mensagem "Apenas o Admin Master pode redefinir a senha de outro Admin Master." Isso impede que o Bruno (admin) resete a senha do iagenix mesmo se chamar a função direto.

## Arquivos afetados
- `src/pages/Corretores.tsx`
- `supabase/functions/admin-reset-password/index.ts`

## Não vou mexer
- RLS, schema, AuthContext, Layout, demais rotas.
- Botões Editar/Inativar/Excluir já estão visíveis para qualquer admin; com o Master filtrado da lista, automaticamente o Bruno não consegue acionar nenhuma ação contra ele.
