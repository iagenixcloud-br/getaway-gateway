
## Implementação

### 1. Edge function `admin-reset-password`
Nova função em `supabase/functions/admin-reset-password/index.ts` que:
- Valida o JWT do chamador
- Confere se ele tem role `master` na tabela `user_roles` (externo)
- Usa `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY` para chamar `auth.admin.updateUserById(userId, { password })`
- Retorna 403 se não for Master, 400 se senha < 6 chars

### 2. `AuthContext`
- Adicionar `'master'` ao tipo `AppRole`
- Expor flag `isMaster` derivado das roles

### 3. `ProtectedRoute`
- Nova prop `requireMaster` que redireciona para `/` se o usuário não for Master

### 4. Rota `/assinaturas`
- Em `App.tsx`, trocar `requireAdmin` por `requireMaster`

### 5. Sidebar (`Layout.tsx`)
- Trocar a checagem `user?.email === "iagenixcloud@..."` por `isMaster` para esconder o link Assinaturas

### 6. Botão "Redefinir senha" (Master)
- Em `Corretores.tsx` e `Admins.tsx`: novo botão visível apenas se `isMaster`
- Modal pedindo nova senha (mín. 6 caracteres) com confirmação
- Chama `invokeCloudFunction("admin-reset-password", { user_id, new_password })`
- Mostra feedback de sucesso/erro
- Pequeno aviso no topo: "Por segurança, senhas não podem ser visualizadas. Use 'Redefinir senha' para definir uma nova."

Após você aprovar, eu deploy a edge function automaticamente.
