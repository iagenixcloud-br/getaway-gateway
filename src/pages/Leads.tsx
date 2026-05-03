import React, { useMemo, useState } from "react";
import { useLeads } from "../hooks/useLeads";
import { Lead, LeadStatus } from "../data/mockData";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_LABELS: Record<LeadStatus, string> = {
  lead_novo: "Lead Novo",
  curioso: "Curioso",
  negocio: "Negócio",
  agendamento: "Agendamento",
  visita: "Visita",
  proposta: "Proposta",
  follow_up: "Follow-up",
  venda: "Venda",
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  lead_novo: "#3b82f6",
  curioso: "#f59e0b",
  negocio: "#8b5cf6",
  agendamento: "#06b6d4",
  visita: "#10b981",
  proposta: "#f97316",
  follow_up: "#6366f1",
  venda: "#22c55e",
};

type SortField = "created_at" | "name" | "status";
type SortDir = "asc" | "desc";

export function Leads() {
  const { leads, loading } = useLeads();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    let list = [...leads];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.property.toLowerCase().includes(q),
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((l) => l.status === statusFilter);
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "created_at") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === "name") {
        cmp = a.name.localeCompare(b.name, "pt-BR");
      } else if (sortField === "status") {
        cmp = (STATUS_LABELS[a.status] || "").localeCompare(STATUS_LABELS[b.status] || "", "pt-BR");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [leads, search, statusFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "created_at" ? "desc" : "asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span style={{ opacity: 0.3, fontSize: 12 }}>↕</span>;
    return <span style={{ fontSize: 12, color: "var(--gold)" }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome, telefone, email, cidade…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeadStatus | "all")}
          className="px-4 py-2.5 rounded-xl text-sm cursor-pointer"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-primary)",
            outline: "none",
          }}
        >
          <option value="all">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>

        {/* Counter */}
        <div className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--gold-dim)", color: "var(--gold)" }}>
          {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                <Th onClick={() => toggleSort("name")}>Nome <SortIcon field="name" /></Th>
                <Th>Telefone</Th>
                <Th>Email</Th>
                <Th>Cidade</Th>
                <Th onClick={() => toggleSort("status")}>Status <SortIcon field="status" /></Th>
                <Th>Interesse</Th>
                <Th>Orçamento</Th>
                <Th onClick={() => toggleSort("created_at")}>Data <SortIcon field="created_at" /></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                    Nenhum lead encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => (
                  <LeadRow key={lead.id} lead={lead} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <th
      onClick={onClick}
      className="text-left px-4 py-3 font-semibold"
      style={{
        color: "var(--text-muted)",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        whiteSpace: "nowrap",
        borderBottom: "1px solid var(--glass-border)",
      }}
    >
      <span className="inline-flex items-center gap-1">{children}</span>
    </th>
  );
}

function LeadRow({ lead }: { lead: Lead }) {
  const statusColor = STATUS_COLORS[lead.status] || "#888";
  const dateStr = lead.createdAt
    ? format(new Date(lead.createdAt), "dd MMM yyyy, HH:mm", { locale: ptBR })
    : "—";

  return (
    <tr
      className="transition-colors"
      style={{ borderBottom: "1px solid var(--glass-border)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={lead.avatar} alt="" className="w-8 h-8 rounded-full flex-shrink-0" style={{ border: "1.5px solid var(--gold)" }} />
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>{lead.name}</span>
        </div>
      </td>
      <td className="px-4 py-3" style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>{lead.phone || "—"}</td>
      <td className="px-4 py-3" style={{ color: "var(--text-muted)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.email || "—"}</td>
      <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>{lead.city}</td>
      <td className="px-4 py-3">
        <span
          className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold"
          style={{
            background: `${statusColor}20`,
            color: statusColor,
            border: `1px solid ${statusColor}40`,
          }}
        >
          {STATUS_LABELS[lead.status] || lead.status}
        </span>
      </td>
      <td className="px-4 py-3" style={{ color: "var(--text-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.property}</td>
      <td className="px-4 py-3" style={{ color: "var(--gold)", fontWeight: 600, whiteSpace: "nowrap" }}>{lead.budget}</td>
      <td className="px-4 py-3" style={{ color: "var(--text-muted)", whiteSpace: "nowrap", fontSize: 12 }}>{dateStr}</td>
    </tr>
  );
}
