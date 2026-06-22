## Badge "Telefone divergente" em leads brasileiros fora do padrão

### Regra de detecção

Criar um helper `isBRPhoneDivergent(phone)` em `src/lib/phoneUtils.ts` (novo arquivo):

- **Considera brasileiro** se: começa com `+55` OU não tem `+` (apenas dígitos/máscara) e tem entre 10–13 dígitos.
- **É padrão correto** se: bate com `+55 DD 9XXXXXXXX` (com ou sem espaços) → 13 dígitos totais após o `+`, DDD válido (11–99), nono dígito = `9`.
- **Retorna `true`** (divergente) se for brasileiro mas não bate com o padrão.
- **Retorna `false`** para internacionais (`+1`, `+353`, `+351`, etc.) — não exibe badge.

Exemplos:
- `+5521990027771` → ok (false)
- `+55 21 990027771` → ok (false)
- `021990027771` → divergente (true)
- `+55219823236274` → divergente (true, 14 dígitos)
- `+353871234567` → não-BR (false, sem badge)
- `+12125551234` → não-BR (false, sem badge)

### Onde renderizar o badge

Pequeno badge inline ao lado do telefone, com ícone `AlertTriangle` (lucide) + texto "Telefone divergente". Estilo: fundo `bg-amber-500/10`, texto `text-amber-600 dark:text-amber-400`, padding pequeno, rounded.

Locais que mostram o telefone:

1. **`src/pages/Leads.tsx`**
   - Linha 211 (card mobile)
   - Linha 268 (tabela desktop)

2. **`src/components/KanbanBoard.tsx`**
   - Linha 752 (card do kanban)
   - Linha 934 (modal de detalhe, modo visualização)
   - Linha 932 também (EditableField, modo edição) — adicionar badge ao lado quando o valor atual for divergente

### Componente novo

`src/components/PhoneDivergentBadge.tsx`:

```tsx
import { AlertTriangle } from "lucide-react";
import { isBRPhoneDivergent } from "@/lib/phoneUtils";

export function PhoneDivergentBadge({ phone }: { phone: string | null | undefined }) {
  if (!isBRPhoneDivergent(phone)) return null;
  return (
    <span title="Telefone fora do padrão +55 DD 9XXXXXXXX" style={{...}}>
      <AlertTriangle size={10} /> Telefone divergente
    </span>
  );
}
```

### Arquivos criados/alterados

- **novo:** `src/lib/phoneUtils.ts`
- **novo:** `src/components/PhoneDivergentBadge.tsx`
- **alterado:** `src/pages/Leads.tsx` (2 pontos)
- **alterado:** `src/components/KanbanBoard.tsx` (3 pontos)

Sem mudanças em backend, banco, ou edge functions — é apenas UI de alerta visual.
