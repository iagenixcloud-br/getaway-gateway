// Detecta se um telefone é "brasileiro" mas está fora do padrão +55 DD 9XXXXXXXX
// Retorna false para números internacionais (não-BR) ou para BR no padrão correto.
export function isBRPhoneDivergent(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const trimmed = String(phone).trim();
  if (!trimmed) return false;

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return false;

  // Internacional explícito (+algo que não seja 55) → não é BR, não sinaliza
  if (hasPlus && !digits.startsWith("55")) return false;

  // Considera "BR-like":
  // - começa com +55
  // - ou sem '+' e tem 10–13 dígitos (formatos típicos BR, incluindo "021..." e "5521...")
  const isBRLike =
    (hasPlus && digits.startsWith("55")) ||
    (!hasPlus && digits.length >= 10 && digits.length <= 13);

  if (!isBRLike) return false;

  // Padrão correto: +55 + DDD(2, 11-99) + 9 + 8 dígitos = 13 dígitos totais
  if (digits.length !== 13) return true;
  if (!digits.startsWith("55")) return true;
  const ddd = digits.slice(2, 4);
  if (!/^[1-9][1-9]$/.test(ddd)) return true;
  const sub = digits.slice(4);
  if (sub.length !== 9 || sub[0] !== "9") return true;

  return false;
}
