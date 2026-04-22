

## Máscara e formatação WhatsApp no cadastro de corretor

Vou ajustar o formulário de novo corretor em `src/pages/Corretores.tsx` para aplicar máscara visual no telefone e normalizar o valor antes de salvar, seguindo o padrão da Evolution API.

### O que muda na UI

No campo **Telefone** do formulário "Cadastrar novo corretor":

- **Placeholder**: `(11) 99999-9999`
- **Máscara em tempo real**: enquanto o usuário digita, o valor é formatado automaticamente como `(DD) NNNNN-NNNN`. Apaga normalmente (backspace funciona).
- **maxLength**: 15 caracteres (tamanho do formato com máscara).
- **inputMode="tel"**: mostra teclado numérico no mobile.
- **Legenda de ajuda** abaixo do input, em cinza pequeno:
  > Insira o número com DDD para habilitar a integração com o WhatsApp

### Lógica de formatação

Duas funções auxiliares no topo do arquivo:

1. **`maskPhone(value: string)`** — usada no `onChange`:
   - Remove tudo que não é dígito.
   - Limita a 11 dígitos (DDD + 9 dígitos).
   - Aplica progressivamente: `(DD`, `(DD) NNNNN`, `(DD) NNNNN-NNNN`.

2. **`toWhatsappJid(value: string)`** — usada no `handleCreate` antes de enviar à edge function:
   - Remove todos os caracteres não numéricos.
   - Se não começar com `55`, prefixa `55`.
   - Retorna `${digitos}@s.whatsapp.net`.
   - Se o campo estiver vazio, retorna `null` (mantém comportamento atual de telefone opcional).

### Fluxo no `handleCreate`

Hoje o código envia `phone: phone.trim() || null` para a edge function `create-corretor`. Vou trocar por:

```ts
const normalizedPhone = phone.trim() ? toWhatsappJid(phone) : null;
// ...
body: { name: name.trim(), email: email.trim(), password, phone: normalizedPhone }
```

A edge function já repassa `phone` para `profiles` via upsert, então o valor `5512992578668@s.whatsapp.net` cai direto na coluna `profiles.phone` sem precisar mexer no backend.

### Validação extra

Antes de submeter, se o usuário digitou algo no telefone mas não chegou a 10 ou 11 dígitos (DDD + número), exibo `formMsg` de erro: `"Telefone incompleto. Use (DD) NNNNN-NNNN"` e cancelo o submit. Se o campo estiver vazio, segue normal (telefone é opcional).

### Arquivos afetados

- `src/pages/Corretores.tsx` — única alteração. Adiciono helpers, ajusto o `<input>` de telefone (onChange com máscara, placeholder, maxLength, inputMode), adiciono `<small>` de legenda, e normalizo o valor no `handleCreate`.

### Fora de escopo (intencional)

- Não vou aplicar a máscara nos telefones já existentes na tabela (eles continuam como estão). Se quiser, depois rodamos uma migração para normalizar o histórico.
- A edição de telefone de corretores existentes não tem UI hoje, então também não entra agora.

