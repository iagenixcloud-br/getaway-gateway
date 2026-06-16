## Problema

Disparar a edge function `seed-test-leads` pelo console do navegador não funciona:
- `import('/src/lib/supabase.ts')` falha porque o console roda em `lovable.dev`, não no preview.
- `fetch` manual para `gycrprnkuwlzntqvpoxl.supabase.co` é bloqueado por CORS (preflight não passa quando chamado de `lovable.dev`).

A chamada precisa partir de dentro do app (origem do preview), usando o `supabase` client que já tem a sessão do admin.

## Solução

Adicionar um botão temporário **"Gerar 100 leads de teste"** no topo da página `src/pages/Roleta.tsx`, visível **apenas para admin** (`useAuth().isAdmin`).

### Comportamento do botão

1. Confirmação (`window.confirm`) antes de disparar.
2. Chama `invokeCloudFunction('seed-test-leads', { count: 100 })` (já existe em `src/lib/cloudFunctions.ts` e injeta o Bearer token correto contra o CRM externo — mesmo padrão das outras funções).
3. Estado de loading no botão (desabilita + texto "Gerando...").
4. Toast de sucesso mostrando `created` e `perCorretor`, ou toast de erro com a mensagem.
5. Sem refetch automático da Roleta (o seed não passa pela roleta, então a tela de Roleta não muda — mas o Kanban em `/leads` vai mostrar os 100 leads novos).

### Onde fica

- Arquivo: `src/pages/Roleta.tsx`
- Posição: topo da página, ao lado do título, dentro de um bloco `{isAdmin && (...)}`.
- Visual: botão `variant="outline"` discreto, com ícone `Sparkles` ou `FlaskConical` (lucide-react) para deixar claro que é ferramenta de teste.

### O que NÃO muda

- Edge function `seed-test-leads` já está deployada e correta — não mexer.
- `useLeads`, `useRoleta`, `KanbanBoard`, `NovaIndicacaoModal`, `fb-lead-webhook` — intocados.
- Nenhum corretor não-admin vê o botão.

### Depois do teste

Quando você terminar de testar o Kanban, é só me pedir "remove o botão de seed" que eu apago em 1 edit.

Posso prosseguir?