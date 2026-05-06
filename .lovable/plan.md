
## Sanitização do campo telefone

Criar uma função utilitária `sanitizePhone` e aplicá-la em todos os pontos onde o telefone é salvo no banco.

### Função `sanitizePhone`
- Remove todos os caracteres não numéricos (espaços, traços, parênteses, pontos)
- Se o número não começar com "55", adiciona "55"
- Adiciona "+" no início
- Exemplo: `(11) 98765-4321` → `+5511987654321`

### Pontos de aplicação em `src/hooks/useLeads.ts`
1. **`createLead`** (linha ~328): aplicar `sanitizePhone` no `input.phone`
2. **`updateLead`** (linha ~247): aplicar `sanitizePhone` no `patch.phone` quando presente

### Alterações
- **`src/hooks/useLeads.ts`**: adicionar a função `sanitizePhone` e usá-la nos dois pontos acima
