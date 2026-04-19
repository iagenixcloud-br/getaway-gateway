import React, { useState } from "react";
import { Lead, LeadStatus } from "../data/mockData";
import { useLeads } from "../hooks/useLeads";

// ── Helpers ──────────────────────────────────────────────────
const originColors: Record<string, { bg: string; color: string }> = {
  FB: { bg: "rgba(24, 119, 242, 0.15)", color: "#1877F2" },
  IG: { bg: "rgba(225, 48, 108, 0.15)", color: "#E1306C" },
  WA: { bg: "rgba(37, 211, 102, 0.15)", color: "#25D366" },
  Site: { bg: "rgba(212, 175, 55, 0.15)", color: "#D4AF37" },
  Indicação: { bg: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6" },
};

const healthColor = (score: number) => {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
};

const waitingLabel = (hours: number) => {
  if (hours === 0) return null;
  if (hours < 1) return "Há poucos minutos";
  if (hours === 1) return "Sem contato há 1h";
  if (hours < 24) return `Sem contato há ${hours}h`;
  return `Sem contato há ${Math.floor(hours / 24)}d`;
};

const waitingUrgency = (hours: number): string => {
  if (hours === 0) return "";
  if (hours <= 2) return "#f59e0b";
  if (hours <= 8) return "#ef4444";
  return "#dc2626";
};

// ── Column Config ─────────────────────────────────────────────
const columns: { id: LeadStatus; label: string; color: string; icon: string }[] = [
  { id: "novo", label: "Novo Lead", color: "#06b6d4", icon: "✦" },
  { id: "atrasado", label: "Atrasado", color: "#f59e0b", icon: "⏱" },
  { id: "visitar", label: "Visitar", color: "#3b82f6", icon: "⌂" },
  { id: "agendados", label: "Agendados", color: "#8b5cf6", icon: "◈" },
  { id: "favoritos", label: "Favoritos", color: "#D4AF37", icon: "★" },
  { id: "fechado", label: "Negócio Fechado", color: "#22c55e", icon: "✓" },
  { id: "arquivados", label: "Arquivados", color: "#64748b", icon: "▣" },
];

// ── Lead Detail Modal ─────────────────────────────────────────
function LeadModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass rounded-2xl p-8 w-full"
        style={{ maxWidth: 560, border: "1px solid rgba(212,175,55,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <img
            src={lead.avatar}
            alt={lead.name}
            className="w-16 h-16 rounded-2xl object-cover"
            style={{ border: "2px solid var(--gold)" }}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 20 }}>
                {lead.name}
              </h2>
              <span
                className="badge"
                style={{ ...originColors[lead.origin], fontSize: 10 }}
              >
                {lead.origin}
              </span>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{lead.phone}</p>
            <div className="flex items-center gap-2 mt-2">
              <span style={{ fontSize: 12, color: "#D4AF37" }}>Budget:</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{lead.budget}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}
          >
            ✕
          </button>
        </div>

        {/* Health Score */}
        <div className="p-4 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)" }}>
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Health Score</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: healthColor(lead.healthScore) }}>
              {lead.healthScore}/100
            </span>
          </div>
          <div className="health-bar">
            <div
              className="health-fill"
              style={{ width: `${lead.healthScore}%`, background: healthColor(lead.healthScore) }}
            />
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: "Imóvel de Interesse", value: lead.property },
            { label: "Status", value: lead.status.charAt(0).toUpperCase() + lead.status.slice(1) },
            { label: "Origem", value: lead.origin },
            { label: "Cadastrado em", value: new Date(lead.createdAt).toLocaleDateString("pt-BR") },
          ].map((item) => (
            <div key={item.label} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>{item.label}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            className="flex items-center justify-center gap-2 py-3 rounded-xl"
            style={{ background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.3)", color: "#25D366", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
            WhatsApp
          </button>
          <button
            className="flex items-center justify-center gap-2 py-3 rounded-xl"
            style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.8 11.5a19.79 19.79 0 01-3.07-8.67A2 2 0 013.7 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.91 8.2a16 16 0 006.29 6.29l1.46-1.46a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 15.24v1.68z" />
            </svg>
            Ligar
          </button>
          <button
            className="flex items-center justify-center gap-2 py-3 rounded-xl"
            style={{ background: "var(--gold-dim)", border: "1px solid rgba(212,175,55,0.3)", color: "var(--gold)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Agendar
          </button>
        </div>

        {/* Move Stage */}
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--glass-border)" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Mover para etapa:</p>
          <div className="flex gap-2">
            {columns.map((col) => (
              <button
                key={col.id}
                className="flex-1 py-2 rounded-lg text-center"
                style={{
                  background: lead.status === col.id ? `${col.color}25` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${lead.status === col.id ? col.color + "60" : "rgba(255,255,255,0.08)"}`,
                  fontSize: 11,
                  fontWeight: 600,
                  color: lead.status === col.id ? col.color : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {col.icon} {col.label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Lead Card ─────────────────────────────────────────────────
function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const waiting = waitingLabel(lead.waitingHours);
  const urgColor = waitingUrgency(lead.waitingHours);
  const origin = originColors[lead.origin];

  return (
    <div
      className="glass glass-hover rounded-xl p-4 cursor-pointer"
      onClick={onClick}
      style={{ marginBottom: 8 }}
    >
      {/* Waiting Warning */}
      {waiting && (
        <div
          className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-lg"
          style={{ background: `${urgColor}15`, border: `1px solid ${urgColor}30` }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={urgColor} strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: 10, fontWeight: 600, color: urgColor }}>{waiting}</span>
        </div>
      )}

      {/* Lead Info */}
      <div className="flex items-center gap-3 mb-3">
        <img
          src={lead.avatar}
          alt={lead.name}
          className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {lead.name}
          </p>
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{lead.phone}</p>
        </div>
        <span className="badge flex-shrink-0" style={{ background: origin.bg, color: origin.color }}>
          {lead.origin}
        </span>
      </div>

      {/* Property */}
      <div className="flex items-center gap-2 mb-3">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        <span style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lead.property}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{lead.budget}</span>
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: healthColor(lead.healthScore) }}
          />
          <span style={{ fontSize: 10, color: healthColor(lead.healthScore), fontWeight: 600 }}>
            {lead.healthScore}
          </span>
        </div>
      </div>

      {/* Health Bar */}
      <div className="health-bar mt-2">
        <div
          className="health-fill"
          style={{ width: `${lead.healthScore}%`, background: healthColor(lead.healthScore) }}
        />
      </div>
    </div>
  );
}

// ── Main Kanban ───────────────────────────────────────────────
export function KanbanBoard() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const { leads: allLeads, loading, error } = useLeads();

  const getColumnLeads = (status: LeadStatus) =>
    allLeads.filter((l) => l.status === status);

  const columnTotal = (status: LeadStatus) => {
    const col = getColumnLeads(status);
    const total = col.reduce((sum, l) => {
      const val = parseFloat(l.budget.replace(/[^0-9,]/g, "").replace(",", "."));
      return sum + val;
    }, 0);
    return total;
  };

  return (
    <div>
      {/* Top Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {columns.map((col) => {
          const count = getColumnLeads(col.id).length;
          return (
            <div
              key={col.id}
              className="glass rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <div
                className="w-2 h-8 rounded-full"
                style={{ background: col.color, opacity: 0.7 }}
              />
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{col.label}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: col.color }}>{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colLeads = getColumnLeads(col.id);
          return (
            <div
              key={col.id}
              className="kanban-column flex-shrink-0 flex flex-col"
              style={{ minWidth: 280, maxWidth: 300 }}
            >
              {/* Column Header */}
              <div
                className="flex items-center justify-between px-4 py-3 rounded-xl mb-3"
                style={{
                  background: `${col.color}10`,
                  border: `1px solid ${col.color}25`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: col.color }}>{col.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {col.label}
                  </span>
                </div>
                <span
                  className="badge"
                  style={{ background: `${col.color}20`, color: col.color }}
                >
                  {colLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div
                className="flex-1 overflow-y-auto space-y-0"
                style={{ minHeight: 400, maxHeight: "calc(100vh - 340px)" }}
              >
                {colLeads.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center py-12 rounded-xl"
                    style={{ border: `2px dashed ${col.color}20`, color: "var(--text-muted)" }}
                  >
                    <span style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>✦</span>
                    <span style={{ fontSize: 12 }}>Nenhum lead aqui</span>
                  </div>
                ) : (
                  colLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => setSelectedLead(lead)}
                    />
                  ))
                )}
              </div>

              {/* Column Footer */}
              <div
                className="mt-3 px-4 py-2 rounded-xl flex items-center justify-between"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)" }}
              >
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>VGV potencial</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: col.color }}>
                  R$ {columnTotal(col.id).toFixed(1)}M
                </span>
              </div>

              {/* Add Lead Button */}
              <button
                className="mt-2 w-full py-2.5 rounded-xl flex items-center justify-center gap-2 glass-hover"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px dashed ${col.color}30`,
                  color: "var(--text-muted)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 16, color: col.color }}>+</span>
                Adicionar Lead
              </button>
            </div>
          );
        })}

      </div>

      {/* Modal */}
      {selectedLead && (
        <LeadModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}
