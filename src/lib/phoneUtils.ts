// Lista oficial de DDDs brasileiros (Anatel).
const VALID_BR_DDDS = new Set([
  "11","12","13","14","15","16","17","18","19",
  "21","22","24","27","28",
  "31","32","33","34","35","37","38",
  "41","42","43","44","45","46","47","48","49",
  "51","53","54","55",
  "61","62","63","64","65","66","67","68","69",
  "71","73","74","75","77","79",
  "81","82","83","84","85","86","87","88","89",
  "91","92","93","94","95","96","97","98","99",
]);

// Remove DDI 55 duplicado: "+5555..." (13–14 dígitos começando com "5555") → tira um "55".
// Aplica também quando vier com zeros à esquerda removidos.
function stripDuplicateBRCountryCode(digits: string): string {
  if ((digits.length === 13 || digits.length === 14) && digits.startsWith("5555")) {
    return digits.slice(2);
  }
  return digits;
}

// Detecta se um telefone é "brasileiro" mas está fora do padrão +55 DD 9XXXXXXXX
// Retorna false para números internacionais (não-BR) ou para BR no padrão correto.
export function isBRPhoneDivergent(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const trimmed = String(phone).trim();
  if (!trimmed) return false;

  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return false;

  // Internacional explícito (+algo que não seja 55) → não é BR, não sinaliza
  if (hasPlus && !digits.startsWith("55")) return false;

  // Desfaz duplo-55 antes de avaliar
  digits = stripDuplicateBRCountryCode(digits);

  // Considera "BR-like":
  // - começa com +55
  // - ou sem '+' e tem 10–13 dígitos (formatos típicos BR, incluindo "021..." e "5521...")
  const isBRLike =
    (hasPlus && digits.startsWith("55")) ||
    (!hasPlus && digits.length >= 10 && digits.length <= 13);

  if (!isBRLike) return false;

  // Padrão correto: +55 + DDD(2) + 9 + 8 dígitos = 13 dígitos totais
  if (digits.length !== 13) return true;
  if (!digits.startsWith("55")) return true;
  const ddd = digits.slice(2, 4);
  if (!VALID_BR_DDDS.has(ddd)) return true;
  const sub = digits.slice(4);
  if (sub.length !== 9 || sub[0] !== "9") return true;

  return false;
}

// Normaliza telefones BR para o padrão +55 DDD 9XXXXXXXX (celular) ou +55 DDD XXXXXXXX (fixo).
// Retorna o valor original se não for "BR-like" ou se não conseguir normalizar com segurança.
export function normalizeBRPhone(phone: string | null | undefined): string {
  if (!phone) return (phone ?? "") as string;
  const original = String(phone);
  const trimmed = original.trim();
  if (!trimmed) return original;

  const hasPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return original;

  // Internacional explícito não-BR → não mexe
  if (hasPlus && !digits.startsWith("55")) return original;

  // Remove zeros de tronco à esquerda
  digits = digits.replace(/^0+/, "");
  if (!digits) return original;

  // Desfaz duplo-55 (ex.: "+5555218200691" → "55218200691")
  digits = stripDuplicateBRCountryCode(digits);

  // Garante DDI 55
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    // ok, já com DDI
  } else if (digits.length === 10 || digits.length === 11) {
    digits = "55" + digits;
  } else {
    return original;
  }

  // Valida DDD contra lista oficial
  const ddd = digits.slice(2, 4);
  if (!VALID_BR_DDDS.has(ddd)) return original;

  let sub = digits.slice(4);

  if (sub.length === 8 && /^[6-9]/.test(sub)) {
    // celular antigo sem 9
    sub = "9" + sub;
  } else if (sub.length === 9 && sub[0] === "9") {
    // celular ok
  } else if (sub.length === 8 && /^[2-5]/.test(sub)) {
    // fixo ok
  } else {
    return original;
  }

  return `+55${ddd}${sub}`;
}
