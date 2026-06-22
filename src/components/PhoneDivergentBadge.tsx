import { AlertTriangle } from "lucide-react";
import { isBRPhoneDivergent } from "@/lib/phoneUtils";

interface Props {
  phone: string | null | undefined;
  compact?: boolean;
}

export function PhoneDivergentBadge({ phone, compact = false }: Props) {
  if (!isBRPhoneDivergent(phone)) return null;
  const size = compact ? 12 : 14;
  return (
    <span
      title="Telefone fora do padrão +55 DD 9XXXXXXXX — confirme com o cliente"
      aria-label="Telefone divergente"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: "rgb(217, 119, 6)",
        cursor: "help",
        lineHeight: 1,
      }}
    >
      <AlertTriangle size={size} strokeWidth={2.5} />
    </span>
  );
}
