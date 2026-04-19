import { useEffect, useState } from "react";
import { supabase, LeadRow } from "../lib/supabase";
import { Lead, LeadStatus, LeadOrigin } from "../data/mockData";

// Map raw DB status → Kanban column
const mapStatus = (s: string | null): LeadStatus => {
  const normalized = (s || "").toLowerCase().trim();
  switch (normalized) {
    case "novo lead":
    case "novo":
    case "new":
      return "novo";
    case "atrasado":
      return "atrasado";
    case "visitar":
      return "visitar";
    case "agendados":
    case "agendado":
      return "agendados";
    case "favoritos":
    case "favorito":
      return "favoritos";
    case "fechado":
    case "negocio fechado":
    case "negócio fechado":
      return "fechado";
    case "arquivados":
    case "arquivado":
      return "arquivados";
    default:
      return "novo";
  }
};

const formatBudget = (n: number | null): string => {
  if (!n || n <= 0) return "R$ —";
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`;
  return `R$ ${n.toFixed(0)}`;
};

const initialsAvatar = (name: string): string => {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    initials || name,
  )}&backgroundColor=D4AF37&textColor=0a0a0a`;
};

const hoursSince = (iso: string): number => {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60)));
};

export const rowToLead = (row: LeadRow): Lead => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  origin: "WA" as LeadOrigin,
  status: mapStatus(row.status),
  property: row.interest || "—",
  waitingHours: hoursSince(row.created_at),
  avatar: initialsAvatar(row.name),
  budget: formatBudget(row.budget),
  createdAt: row.created_at,
  healthScore: 50,
});

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      if (!mounted) return;
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setLeads((data as LeadRow[]).map(rowToLead));
      setLoading(false);
    };

    load();

    // Realtime subscription
    const channel = supabase
      .channel("leads-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newLead = rowToLead(payload.new as LeadRow);
            setLeads((prev) => [newLead, ...prev.filter((l) => l.id !== newLead.id)]);
          } else if (payload.eventType === "UPDATE") {
            const updated = rowToLead(payload.new as LeadRow);
            setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
          } else if (payload.eventType === "DELETE") {
            const oldId = (payload.old as LeadRow).id;
            setLeads((prev) => prev.filter((l) => l.id !== oldId));
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { leads, loading, error };
}
