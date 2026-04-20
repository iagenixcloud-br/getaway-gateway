import { useEffect, useState } from "react";
import { supabase, LeadRow } from "../lib/supabase";
import { Lead, LeadStatus, LeadOrigin } from "../data/mockData";
import { useAuth } from "../contexts/AuthContext";

// Valores oficiais salvos no banco (coluna `status` da tabela leads):
// 'novo' | 'atrasado' | 'visitar' | 'agendados' | 'favoritos' | 'fechado' | 'arquivados'
//
// O n8n deve inserir/atualizar usando EXATAMENTE esses valores.
// Aceitamos algumas variações comuns por segurança (ex: 'novo lead' legado).
const mapStatus = (s: string | null): LeadStatus => {
  const normalized = (s || "").toLowerCase().trim();
  switch (normalized) {
    case "novo":
    case "novo lead":
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
  city: row.city || "—",
  origin: "WA" as LeadOrigin,
  status: mapStatus(row.status),
  property: row.interest || "—",
  waitingHours: hoursSince(row.created_at),
  avatar: initialsAvatar(row.name),
  budget: formatBudget(row.budget),
  createdAt: row.created_at,
  healthScore: 50,
  assignedTo: row.assigned_to ?? null,
});

export function useLeads() {
  // Admin vê tudo; corretor vê apenas leads atribuídos a ele.
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Aguarda auth resolver para saber se filtramos por corretor
    if (authLoading) return;
    let mounted = true;

    const load = async () => {
      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });

      // Corretor não-admin: filtra pelos leads dele
      if (!isAdmin && user) {
        query = query.eq("assigned_to", user.id);
      }

      const { data, error } = await query;

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

    // Realtime: assina TODAS as mudanças e filtramos no cliente
    const channel = supabase
      .channel("leads-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          // Helper: corretor só processa eventos que envolvem os leads dele
          const belongsToMe = (row: LeadRow | null) =>
            isAdmin || (row && row.assigned_to === user?.id);

          if (payload.eventType === "INSERT") {
            const row = payload.new as LeadRow;
            if (!belongsToMe(row)) return;
            const newLead = rowToLead(row);
            setLeads((prev) => [newLead, ...prev.filter((l) => l.id !== newLead.id)]);
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as LeadRow;
            const updated = rowToLead(row);
            // Se o lead saiu para outro corretor, removemos da lista local
            if (!belongsToMe(row)) {
              setLeads((prev) => prev.filter((l) => l.id !== updated.id));
              return;
            }
            setLeads((prev) => {
              const exists = prev.some((l) => l.id === updated.id);
              return exists
                ? prev.map((l) => (l.id === updated.id ? updated : l))
                : [updated, ...prev]; // foi reatribuído PARA mim
            });
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
  }, [authLoading, isAdmin, user]);

  const updateLeadStatus = async (id: string, newStatus: LeadStatus) => {
    // Otimista: move o card imediatamente
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)),
    );
    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) {
      setError(`Falha ao mover lead: ${error.message}`);
    }
  };

  // Atualização parcial de qualquer campo do lead.
  // Aceita campos do domínio (Lead) e converte para colunas do banco (LeadRow).
  const updateLead = async (id: string, patch: Partial<Lead>) => {
    // Atualiza UI otimisticamente
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

    // Mapeia para colunas do banco
    const dbPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) dbPatch.name = patch.name;
    if (patch.phone !== undefined) dbPatch.phone = patch.phone;
    if (patch.city !== undefined) dbPatch.city = patch.city;
    if (patch.property !== undefined) dbPatch.interest = patch.property;
    if (patch.status !== undefined) dbPatch.status = patch.status;
    if (patch.budget !== undefined) {
      // Converte string "R$ 1.5M" / "R$ 350k" / "1500000" em número
      const raw = patch.budget.replace(/[^\d,.\-kKmM]/g, "").trim();
      let n: number | null = null;
      if (raw) {
        const lower = raw.toLowerCase();
        const num = parseFloat(lower.replace(/[^\d.,-]/g, "").replace(",", "."));
        if (!isNaN(num)) {
          if (lower.includes("m")) n = num * 1_000_000;
          else if (lower.includes("k")) n = num * 1_000;
          else n = num;
        }
      }
      dbPatch.budget = n;
    }

    if (Object.keys(dbPatch).length === 0) return;
    const { error } = await supabase.from("leads").update(dbPatch).eq("id", id);
    if (error) setError(`Falha ao atualizar lead: ${error.message}`);
  };

  return { leads, loading, error, updateLeadStatus, updateLead };
}
