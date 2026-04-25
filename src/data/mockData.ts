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
  | "venda";

export type LeadOrigin = "FB" | "IG" | "WA" | "Site" | "Indicação";

export interface Lead {
  id: string;
  name: string;
  phone: string;
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
}
