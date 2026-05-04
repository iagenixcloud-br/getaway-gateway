## Plano: Botão de visibilidade da senha no Login

Adicionar um ícone de olho no campo de senha da página de login, permitindo alternar entre mostrar e esconder a senha.

### Alterações

**`src/pages/Login.tsx`**
- Adicionar estado `showPassword` (boolean)
- Trocar o `type` do input de senha entre `"password"` e `"text"` conforme o estado
- Adicionar um botão com ícone de olho (Eye/EyeOff do lucide-react) posicionado dentro do campo de senha à direita
