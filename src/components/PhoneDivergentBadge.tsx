import { AlertTriangle } from "lucide-react";
import { isBRPhoneDivergent } from "@/lib/phoneUtils";

interface Props {
  phone: string | null | undefined;
  compact?: boolean;
}

export function PhoneDivergentBadge({ phone, compact = false }: Props) {
  if (!isBRPhoneDivergent(phone)) return null;
  return (
    <span
      title="Telefone fora do padrão +55 DD 9XXXXXXXX — confirme com o cliente"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: compact ? "1px 5px" : "2px 6px",
        fontSize: compact ? 9 : 10,
        fontWeight: 600,
        lineHeight: 1.2,
        borderRadius: 4,
        background: "rgba(245, 158, 11, 0.12)",
        color: "rgb(217, 119, 6)",
        border: "1px solid rgba(245, 158, 11, 0.3)",
        whiteSpace: "nowrap",
      }}
    >
      <AlertTriangle size={compact ? 9 : 10} strokeWidth={2.5} />
      {compact ? "Divergente" : "Telefone divergente"}
    </span>
  );
}
