import React, { useMemo } from "react";
import { useLeads } from "../hooks/useLeads";
import { LeadStatus } from "../data/mockData";

const COLUMNS: { key: LeadStatus; label: string; color: string; icon: string }[] = [
  { key: "lead_novo", label: "Lead Novo", color: "#D4AF37", icon: "✦" },
  { key: "curioso", label: "Curioso", color: "#a78bfa", icon: "?" },
  { key: "follow_up", label: "Follow-up", color: "#f97316", icon: "🔁" },
  { key: "negocio", label: "Negócio", color: "#3b82f6", icon: "💼" },
  { key: "agendamento", label: "Agendamento", color: "#06b6d4", icon: "📅" },
  { key: "visita", label: "Visita", color: "#8b5cf6", icon: "🏠" },
  { key: "proposta", label: "Proposta", color: "#ec4899", icon: "📄" },
  { key: "venda", label: "Venda", color: "#22c55e", icon: "🎉" },
];

function formatDuration(hours: number): string {
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const h = hours % 24;
  return h > 0 ? `${days}d ${h}h` : `${days}d`;
}

export function Dashboard() {
  const { leads, loading } = useLeads();

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    const avgWaiting: Record<string, number> = {};
    const totals: Record<string, number> = {};

    COLUMNS.forEach((c) => {
      counts[c.key] = 0;
      totals[c.key] = 0;
    });

    leads.forEach((lead) => {
      if (counts[lead.status] !== undefined) {
        counts[lead.status]++;
        totals[lead.status] += lead.waitingHours;
      }
    });

    COLUMNS.forEach((c) => {
      avgWaiting[c.key] = counts[c.key] > 0 ? Math.round(totals[c.key] / counts[c.key]) : 0;
    });

    // Leads das últimas 24h, 7d, 30d
    const now = Date.now();
    const last24h = leads.filter((l) => now - new Date(l.createdAt).getTime() < 86400000).length;
    const last7d = leads.filter((l) => now - new Date(l.createdAt).getTime() < 7 * 86400000).length;
    const last30d = leads.filter((l) => now - new Date(l.createdAt).getTime() < 30 * 86400000).length;

    // Últimos 5 leads
    const recent = [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

    return { counts, avgWaiting, last24h, last7d, last30d, total: leads.length, recent };
  }, [leads]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total de Leads" value={stats.total} color="var(--gold)" />
        <KpiCard label="Últimas 24h" value={stats.last24h} color="var(--success)" />
        <KpiCard label="Últimos 7 dias" value={stats.last7d} color="#3b82f6" />
        <KpiCard label="Últimos 30 dias" value={stats.last30d} color="#a78bfa" />
      </div>

      {/* ── Contagem por Coluna ──────────────────── */}
      <div className="glass rounded-2xl p-6">
        <h2 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text-primary)", marginBottom: 16 }}>
          Leads por Etapa
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className="rounded-xl p-4 flex flex-col items-center gap-1 transition-all hover:scale-[1.03]"
              style={{ background: `${col.color}10`, border: `1px solid ${col.color}30` }}
            >
              <span style={{ fontSize: 22 }}>{col.icon}</span>
              <span style={{ fontSize: 28, fontWeight: 800, color: col.color, fontFamily: "Montserrat, sans-serif" }}>
                {stats.counts[col.key]}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>{col.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tempo médio por etapa ──────────────────── */}
      <div className="glass rounded-2xl p-6">
        <h2 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text-primary)", marginBottom: 16 }}>
          Tempo Médio na Etapa
        </h2>
        <div className="space-y-3">
          {COLUMNS.map((col) => {
            const maxHours = Math.max(...Object.values(stats.avgWaiting), 1);
            const pct = (stats.avgWaiting[col.key] / maxHours) * 100;
            return (
              <div key={col.key} className="flex items-center gap-3">
                <span style={{ width: 110, fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>{col.label}</span>
                <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div
                    className="h-full rounded-full flex items-center pl-2 transition-all duration-700"
                    style={{ width: `${Math.max(pct, 4)}%`, background: `linear-gradient(90deg, ${col.color}90, ${col.color})` }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#000", whiteSpace: "nowrap" }}>
                      {formatDuration(stats.avgWaiting[col.key])}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Últimos leads ──────────────────────────── */}
      <div className="glass rounded-2xl p-6">
        <h2 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text-primary)", marginBottom: 16 }}>
          Últimos Leads Recebidos
        </h2>
        <div className="space-y-2">
          {stats.recent.map((lead) => {
            const col = COLUMNS.find((c) => c.key === lead.status);
            const ago = formatDuration(lead.waitingHours);
            return (
              <div
                key={lead.id}
                className="flex items-center gap-4 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)" }}
              >
                <img src={lead.avatar} alt={lead.name} className="w-8 h-8 rounded-full" style={{ border: "2px solid var(--gold)" }} />
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lead.name}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{lead.phone}</p>
                </div>
                <span
                  className="px-2 py-1 rounded-md text-xs font-semibold"
                  style={{ background: `${col?.color || "var(--gold)"}20`, color: col?.color || "var(--gold)" }}
                >
                  {col?.label || lead.status}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>há {ago}</span>
              </div>
            );
          })}
          {stats.recent.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: 20 }}>Nenhum lead ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="glass rounded-2xl p-5 flex flex-col items-center justify-center gap-1 transition-all hover:scale-[1.02]"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <span style={{ fontSize: 32, fontWeight: 800, color, fontFamily: "Montserrat, sans-serif" }}>{value}</span>
      <span style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>{label}</span>
    </div>
  );
}
