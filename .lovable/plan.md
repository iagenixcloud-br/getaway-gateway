## Objetivo

Telefones brasileiros divergentes (ex.: `024999932986`, `5521991935...`, `21991935...`) passam a aparecer normalizados como `+55DDD9XXXXXXXX` na interface, e qualquer edição/salvamento grava o valor já normalizado no banco. Registros antigos não são tocados em massa — só normalizam quando o lead for editado.

## Regra de normalização (`normalizeBRPhone`)

Entrada: string crua. Saída: string normalizada ou o valor original se não for "BR-like".

1. Extrai só dígitos. Se vazio → retorna original.
2. Se começa com `+` e não é `+55…` → internacional, retorna original.
3. Remove zeros de tronco à esquerda (ex.: `024…` → `24…`).
4. Se começa com `55` e tem 12 ou 13 dígitos → já tem código do país; segue para passo 6.
5. Se tem 10 ou 11 dígitos (DDD + assinante) → prefixa `55`.
6. Valida DDD (posições 2–3): precisa casar `[1-9][1-9]`. Se inválido → retorna original (não força).
7. Garante o 9º dígito do celular:
   - Se sobra do número (após `55DDD`) tem 8 dígitos e o primeiro é `[6-9]` → insere `9` na frente (celular antigo).
   - Se tem 9 dígitos e começa com `9` → ok.
   - Se tem 8 dígitos começando com `[2-5]` → fixo, mantém sem `9`.
   - Outros casos → retorna original.
8. Resultado final: `+` + 13 dígitos (celular) ou 12 dígitos (fixo).

Casos cobertos pelo exemplo do Giuseppe:
- `024999932986` → strip `0` → `24999932986` (11 díg) → prefixa `55` → `5524999932986` → `+5524999932986`.

## Arquivos a alterar

### 1. `src/lib/phoneUtils.ts`
Adicionar função `normalizeBRPhone(phone: string | null | undefined): string` seguindo a regra acima. Manter `isBRPhoneDivergent` como está.

### 2. `src/components/PhoneDivergentBadge.tsx`
Sem mudança de comportamento do ícone, mas o componente passa a aceitar o telefone já normalizado de quem chama (ver itens 3 e 4). Se o chamador passar o valor normalizado, o badge não aparece (porque `isBRPhoneDivergent` retorna `false`).

### 3. Exibição — normalizar na renderização
Nos pontos onde `lead.phone` é mostrado, exibir `normalizeBRPhone(lead.phone)`:

- `src/pages/Leads.tsx` linhas 214 e 275 (mobile card + tabela desktop).
- `src/components/KanbanBoard.tsx` linhas 754 (card kanban) e 939 (modal detalhe — span de leitura).

O ícone de alerta `PhoneDivergentBadge` continua recebendo `lead.phone` **cru** (não normalizado) — assim ele só desaparece quando o dado no banco realmente estiver no padrão. Isso deixa visível para o usuário que aquele registro ainda precisa ser "salvo" para gravar a versão limpa.

> Alternativa possível (a confirmar): passar o normalizado também para o badge, fazendo o ícone sumir já na exibição. Plano atual mantém o badge visível para sinalizar "ainda não persistido".

### 4. Edição — normalizar ao salvar
Interceptar o `onSave`/submit do telefone para gravar a versão normalizada:

- `src/components/KanbanBoard.tsx` linha 937: trocar
  ```
  onSave={(v) => onUpdate!({ phone: v })}
  ```
  por
  ```
  onSave={(v) => onUpdate!({ phone: normalizeBRPhone(v) })}
  ```
- `src/components/KanbanBoard.tsx` linha 278 (submit do formulário do modal): aplicar `normalizeBRPhone(form.phone)` antes de mandar para a atualização.
- Verificar se há outro ponto de criação/edição de lead que grava `phone` (ex.: import de webhook). Webhooks ficam fora do escopo deste plano — só o que é editado pela UI.

### 5. Link do WhatsApp (`KanbanBoard.tsx` linha 620)
Já faz seu próprio strip. Substituir por `normalizeBRPhone(lead.phone).replace(/\D/g,'')` para garantir consistência (DDI 55 incluído).

## Fora de escopo

- Migration/script para reescrever telefones antigos no banco em massa. Se quiser depois, posso preparar como tarefa separada.
- Validação/normalização de telefones de outros países.
- Mudanças no fluxo de ingestão por webhook do Facebook.

## Verificação

Após implementar, testar manualmente no preview:
- Card do Giuseppe deve mostrar `+5524999932986` e o ícone some assim que o telefone for editado e salvo (a edição grava o normalizado).
- Cards com telefone já em `+55…` correto não mudam.
- Telefone internacional (ex.: `+1…`) não é alterado.
- Link do WhatsApp abre com o número certo.
