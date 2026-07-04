# Corrigir sobreposição no bloco de totais do PDF

O label "Total de usuários (16 × R$ 50,00):" tem ~65mm de largura, mas está sendo desenhado a partir de `rightX - 45` (≈150mm), sobrepondo o valor à direita (~195mm). Ajustar para:

- Label X fixo em `pageW - margin - 75` (≈120mm), left-aligned.
- Valor sempre em `pageW - margin` (≈195mm), right-aligned via `{ align: "right" }`.
- Espaçamento vertical `ty += 6` entre linhas.
- Linha separadora acima do "Total geral" cobrindo `labelX` até `rightX`.

## Alteração em `src/lib/extratoPdf.ts` (linhas 140–fim)

```ts
doc.setFont("helvetica", "normal");
doc.setFontSize(10);
doc.setTextColor(40, 40, 40);
const rightX = pageW - margin;
const labelX = pageW - margin - 75;

doc.text("Licença CRM:", labelX, ty);
doc.text(brl(LICENCA_CRM), rightX, ty, { align: "right" });
ty += 6;

doc.text(
  `Total de usuários (${linhas.length} × R$ 50,00):`,
  labelX,
  ty,
);
doc.text(brl(totalUsuarios), rightX, ty, { align: "right" });
ty += 6;

doc.setDrawColor(180, 180, 180);
doc.line(labelX, ty - 3, rightX, ty - 3);

doc.setFont("helvetica", "bold");
doc.setFontSize(11);
doc.setTextColor(17, 17, 17);
doc.text("Total geral:", labelX, ty);
doc.text(brl(totalGeral), rightX, ty, { align: "right" });
```

## Validação

Gerar PDF de Junho/2026 pela UI e inspecionar visualmente as 3 linhas (Licença CRM, Total de usuários, Total geral) sem sobreposição, alinhadas em coluna com valores à direita.
