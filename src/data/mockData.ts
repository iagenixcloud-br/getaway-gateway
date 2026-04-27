// ============================================================
// Type definitions used by the Kanban (data comes from Supabase)
// ============================================================

export type LeadStatus =
  | "lead_novo"
  | "curioso"
  | "negocio"
  | "agendamento"
  | "visita"
  | "proposta"
  | "venda"
  | "follow_up";

export type LeadOrigin = "FB" | "IG" | "WA" | "Site" | "Indicação";

export type LeadPurpose = "investimento" | "moradia" | "";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  origin: LeadOrigin;
  status: LeadStatus;
  property: string;
  waitingHours: number;
  avatar: string;
  budget: string;
  createdAt: string;
  healthScore: number;
  /** UUID do corretor responsável (profiles.id no Lovable Cloud). Null = não atribuído */
  assignedTo: string | null;
  /** Status anterior (preenchido por trigger no banco quando status muda) */
  previousStatus: LeadStatus | null;

  // Perfil do lead (todos opcionais)
  age: string;            // mantemos como string no form; convertemos para INT no banco
  gender: string;         // ex.: "Masculino", "Feminino", "Outro"
  occupation: string;     // profissão
  monthlyIncome: string;  // renda mensal (string formatada; convertida para NUMERIC no banco)
  downPayment: string;    // entrada ideal
  installment: string;    // parcela ideal
  purpose: LeadPurpose;   // investimento | moradia
  areaSqm: string;        // metragem desejada (texto livre, ex.: "70-90m²")
  region: string;         // região desejada
}
