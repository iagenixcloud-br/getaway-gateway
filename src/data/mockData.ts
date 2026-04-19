// ============================================================
// Type definitions used by the Kanban (data comes from Supabase)
// ============================================================

export type LeadStatus =
  | "novo"
  | "atrasado"
  | "visitar"
  | "agendados"
  | "favoritos"
  | "fechado"
  | "arquivados";

export type LeadOrigin = "FB" | "IG" | "WA" | "Site" | "Indicação";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  origin: LeadOrigin;
  status: LeadStatus;
  property: string;
  waitingHours: number;
  avatar: string;
  budget: string;
  createdAt: string;
  healthScore: number;
}
