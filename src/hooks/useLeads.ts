import { useEffect, useState } from "react";
import { supabase, LeadRow } from "../lib/supabase";
import { Lead, LeadStatus, LeadOrigin, LeadPurpose } from "../data/mockData";
import { useAuth } from "../contexts/AuthContext";

// Valores oficiais salvos no banco (coluna `status` da tabela leads):
// 'lead_novo' | 'curioso' | 'negocio' | 'agendamento' | 'visita' | 'proposta' | 'venda'
//
// O n8n deve inserir/atualizar usando EXATAMENTE esses valores.
// Aceitamos algumas variações comuns por segurança.
const mapStatus = (s: string | null): LeadStatus => {
  const normalized = (s || "").toLowerCase().trim();
  switch (normalized) {
    case "lead_novo":
    case "lead novo":
    case "novo":
    case "novo lead":
    case "new":
      return "lead_novo";
    case "curioso":
      return "curioso";
    case "negocio":
    case "negócio":
      return "negocio";
    case "agendamento":
    case "agendado":
    case "agendados":
      return "agendamento";
    case "visita":
    case "visitar":
      return "visita";
    case "proposta":
      return "proposta";
    case "venda":
    case "vendido":
    case "fechado":
    case "negocio fechado":
    case "negócio fechado":
      return "venda";
    default:
      return "lead_novo";
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

// Helper: número -> string (vazio se null)
const numStr = (n: number | null): string =>
  n === null || n === undefined ? "" : String(n);

export const rowToLead = (row: LeadRow): Lead => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  email: row.email ?? "",
  city: row.city || "—",
  origin: "WA" as LeadOrigin,
  status: mapStatus(row.status),
  property: row.interest || "—",
  waitingHours: hoursSince(row.created_at),
  avatar: initialsAvatar(row.name),
  budget: formatBudget(row.budget),
  createdAt: row.created_at,
  healthScore: 50,
  assignedTo: row.tenant_id ?? null,

  age: numStr(row.age),
  gender: row.gender ?? "",
  occupation: row.occupation ?? "",
  monthlyIncome: numStr(row.monthly_income),
  downPayment: numStr(row.down_payment),
  installment: numStr(row.installment),
  purpose: (row.purpose as LeadPurpose) ?? "",
  areaSqm: row.area_sqm ?? "",
  region: row.region ?? "",
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
        query = query.eq("tenant_id", user.id);
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
            isAdmin || (row && row.tenant_id === user?.id);

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
    if (patch.assignedTo !== undefined) dbPatch.tenant_id = patch.assignedTo;

    // Perfil do lead
    const toNum = (s: string | undefined): number | null => {
      if (s === undefined) return undefined as unknown as number | null; // sinaliza "não mexer"
      const trimmed = s.trim();
      if (!trimmed) return null;
      const n = parseFloat(trimmed.replace(/[^\d.,-]/g, "").replace(",", "."));
      return isNaN(n) ? null : n;
    };
    const toStr = (s: string | undefined): string | null =>
      s === undefined ? (undefined as unknown as string | null) : (s.trim() || null);

    if (patch.email !== undefined) dbPatch.email = toStr(patch.email);
    if (patch.age !== undefined) dbPatch.age = toNum(patch.age);
    if (patch.gender !== undefined) dbPatch.gender = toStr(patch.gender);
    if (patch.occupation !== undefined) dbPatch.occupation = toStr(patch.occupation);
    if (patch.monthlyIncome !== undefined) dbPatch.monthly_income = toNum(patch.monthlyIncome);
    if (patch.downPayment !== undefined) dbPatch.down_payment = toNum(patch.downPayment);
    if (patch.installment !== undefined) dbPatch.installment = toNum(patch.installment);
    if (patch.purpose !== undefined) dbPatch.purpose = toStr(patch.purpose);
    if (patch.areaSqm !== undefined) dbPatch.area_sqm = toStr(patch.areaSqm);
    if (patch.region !== undefined) dbPatch.region = toStr(patch.region);

    // Remove chaves marcadas como "não mexer" (undefined)
    Object.keys(dbPatch).forEach((k) => {
      if (dbPatch[k] === undefined) delete dbPatch[k];
    });

    if (Object.keys(dbPatch).length === 0) return;
    const { error } = await supabase.from("leads").update(dbPatch).eq("id", id);
    if (error) setError(`Falha ao atualizar lead: ${error.message}`);
  };

  /** Atribui (ou desatribui passando null) um lead a um corretor. Apenas admin deve usar. */
  const assignLead = (id: string, corretorId: string | null) =>
    updateLead(id, { assignedTo: corretorId });

  /** Cria um lead manualmente (uso em testes/admin). Realtime cuida de inserir na lista. */
  const createLead = async (input: {
    name: string;
    phone: string;
    status?: LeadStatus;
    property?: string;
    budget?: string;
    assignedTo?: string | null;
  }) => {
    // Converte budget string em número
    let budgetNum: number | null = null;
    if (input.budget) {
      const lower = input.budget.toLowerCase();
      const num = parseFloat(lower.replace(/[^\d.,-]/g, "").replace(",", "."));
      if (!isNaN(num)) {
        if (lower.includes("m")) budgetNum = num * 1_000_000;
        else if (lower.includes("k")) budgetNum = num * 1_000;
        else budgetNum = num;
      }
    }

    const payload = {
      name: input.name.trim(),
      phone: input.phone.trim(),
      status: input.status ?? "novo",
      interest: input.property?.trim() || null,
      budget: budgetNum,
      tenant_id: input.assignedTo ?? null,
    };

    const { data, error } = await supabase
      .from("leads")
      .insert(payload)
      .select()
      .single();

    if (error) {
      setError(`Falha ao criar lead: ${error.message}`);
      return { error: error.message, lead: null };
    }
    // Insere otimisticamente (caso realtime demore)
    if (data) {
      const newLead = rowToLead(data as LeadRow);
      setLeads((prev) =>
        prev.some((l) => l.id === newLead.id) ? prev : [newLead, ...prev],
      );
      return { error: null, lead: newLead };
    }
    return { error: null, lead: null };
  };

  return {
    leads,
    loading,
    error,
    updateLeadStatus,
    updateLead,
    assignLead,
    createLead,
  };
}
