import React, { useState } from "react";
import { brokers, Broker } from "../data/mockData";

// ── Helpers ───────────────────────────────────────────────────
function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  return `R$ ${(value / 1_000).toFixed(0)}K`;
}

const statusConfig = {
  online: { color: "#22c55e", label: "Online" },
  offline: { color: "#6b7280", label: "Offline" },
  busy: { color: "#f59e0b", label: "Ocupado" },
};

// ── Circular Progress ─────────────────────────────────────────
function CircularProgress({ pct, color, size = 60 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className="progress-ring-circle"
      />
    </svg>
  );
}

// ── Medal Row ─────────────────────────────────────────────────
const allMedalDefs = [
  { id: "champion", icon: "🏆", label: "Campeão Absoluto", color: "#D4AF37" },
  { id: "silver", icon: "🥈", label: "Vice-Campeão", color: "#9ca3af" },
  { id: "bronze", icon: "🥉", label: "3° Lugar", color: "#b45309" },
  { id: "star", icon: "⭐", label: "Top Performance", color: "#D4AF37" },
  { id: "diamond", icon: "💎", label: "Diamante", color: "#60a5fa" },
  { id: "fire", icon: "🔥", label: "Em Chamas", color: "#ef4444" },
  { id: "briefcase", icon: "💼", label: "Profissional", color: "#8b5cf6" },
  { id: "target", icon: "🎯", label: "Precisão", color: "#f59e0b" },
  { id: "chart", icon: "📈", label: "Em Ascensão", color: "#22c55e" },
];

// ── Broker Detail Modal ───────────────────────────────────────
function BrokerModal({ broker, onClose }: { broker: Broker; onClose: () => void }) {
  const maxSales = brokers[0].totalSales;
  const pct = (broker.totalSales / maxSales) * 100;
  const rankConfig = broker.rank <= 3
    ? ["rank-1", "rank-2", "rank-3"][broker.rank - 1]
    : "rank-other";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass rounded-2xl w-full overflow-hidden"
        style={{ maxWidth: 520, border: "1px solid rgba(212,175,55,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div
          className="relative p-6 pb-4"
          style={{
            background: "linear-gradient(135deg, rgba(212,175,55,0.08), rgba(0,0,0,0.2))",
            borderBottom: "1px solid var(--glass-border)",
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}
          >
            ✕
          </button>

          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={broker.avatar}
                alt={broker.name}
                className="w-20 h-20 rounded-2xl object-cover"
                style={{
                  border: broker.rank === 1 ? "3px solid var(--gold)" : "2px solid rgba(255,255,255,0.1)",
                  boxShadow: broker.rank === 1 ? "0 0 20px rgba(212,175,55,0.3)" : "none",
                }}
              />
              <div
                className={`absolute -bottom-2 -right-2 w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${rankConfig}`}
              >
                #{broker.rank}
              </div>
            </div>

            <div className="flex-1">
              <h2 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 20, marginBottom: 4 }}>
                {broker.name}
              </h2>
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full pulse-dot"
                  style={{ background: statusConfig[broker.status].color }}
                />
                <span style={{ fontSize: 12, color: statusConfig[broker.status].color }}>
                  {statusConfig[broker.status].label}
                </span>
              </div>
              <div className="flex gap-2 mt-2">
                {broker.medals.map((medal, i) => (
                  <span key={i} style={{ fontSize: 18 }}>{medal}</span>
                ))}
              </div>
            </div>

            <div className="text-right">
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Taxa de Conversão</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: "#22c55e", fontFamily: "Montserrat, sans-serif" }}>
                {broker.conversionRate}%
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Total em Vendas", value: formatCurrency(broker.totalSales), color: "var(--gold)" },
              { label: "Comissões", value: formatCurrency(broker.commission), color: "#22c55e" },
              { label: "Deals Fechados", value: broker.totalDeals, color: "#3b82f6" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-4 rounded-xl text-center"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)" }}
              >
                <p style={{ fontSize: 18, fontWeight: 800, color: stat.color, fontFamily: "Montserrat, sans-serif" }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Progress vs Leader */}
          <div className="mb-5">
            <div className="flex justify-between mb-2">
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Performance vs. Líder</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)" }}>{pct.toFixed(0)}%</span>
            </div>
            <div className="health-bar" style={{ height: 6 }}>
              <div
                className="health-fill"
                style={{ width: `${pct}%`, background: broker.rank === 1 ? "var(--gold)" : "#3b82f6", height: 6 }}
              />
            </div>
          </div>

          {/* Monthly Performance */}
          <div
            className="p-4 rounded-xl mb-4"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)" }}
          >
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>Vendas por mês (2026)</p>
            <div className="flex items-end gap-2 h-16">
              {[4, 6, 3, 8, 5, 7, 4, 9, 6, 8, 7, broker.dealsThisMonth].map((v, i) => (
                <div key={i} className="flex-1 rounded-t" style={{
                  height: `${(v / 9) * 100}%`,
                  background: i === 11 ? "var(--gold)" : "rgba(255,255,255,0.1)",
                  minHeight: 4,
                }} />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {["J","F","M","A","M","J","J","A","S","O","N","D"].map((m, i) => (
                <span key={i} style={{ fontSize: 9, color: i === 11 ? "var(--gold)" : "var(--text-muted)", flex: 1, textAlign: "center" }}>{m}</span>
              ))}
            </div>
          </div>

          {/* Medals */}
          <div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Conquistas</p>
            <div className="grid grid-cols-4 gap-2">
              {allMedalDefs.map((medal) => {
                const earned = broker.medals.includes(medal.icon);
                return (
                  <div
                    key={medal.id}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl"
                    style={{
                      background: earned ? `${medal.color}12` : "rgba(255,255,255,0.02)",
                      border: `1px solid ${earned ? medal.color + "30" : "rgba(255,255,255,0.05)"}`,
                      opacity: earned ? 1 : 0.3,
                    }}
                  >
                    <span style={{ fontSize: 20, filter: earned ? "none" : "grayscale(100%)" }}>{medal.icon}</span>
                    <span style={{ fontSize: 9, color: earned ? medal.color : "var(--text-muted)", textAlign: "center", lineHeight: 1.2 }}>
                      {medal.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Broker Row (Ranking) ──────────────────────────────────────
function BrokerRow({ broker, maxSales, onClick }: { broker: Broker; maxSales: number; onClick: () => void }) {
  const pct = (broker.totalSales / maxSales) * 100;
  const rankClass = broker.rank <= 3 ? `rank-${broker.rank}` : "rank-other";

  return (
    <div
      className="glass glass-hover rounded-2xl p-5 cursor-pointer flex items-center gap-5"
      onClick={onClick}
    >
      {/* Rank */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-base ${rankClass}`}
      >
        {broker.rank <= 3 ? ["🥇","🥈","🥉"][broker.rank-1] : `#${broker.rank}`}
      </div>

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <img
          src={broker.avatar}
          alt={broker.name}
          className="w-12 h-12 rounded-xl object-cover"
          style={{
            border: broker.rank === 1 ? "2px solid var(--gold)" : "2px solid rgba(255,255,255,0.1)",
          }}
        />
        <div
          className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full pulse-dot"
          style={{ background: statusConfig[broker.status].color, border: "2px solid var(--navy)" }}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{broker.name}</p>
          <div className="flex gap-1">
            {broker.medals.slice(0, 3).map((m, i) => (
              <span key={i} style={{ fontSize: 14 }}>{m}</span>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {broker.dealsThisMonth} vendas este mês · {broker.totalDeals} total
        </p>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 health-bar" style={{ height: 4 }}>
            <div
              className="health-fill"
              style={{ width: `${pct}%`, background: broker.rank === 1 ? "var(--gold)" : "#3b82f6", height: 4 }}
            />
          </div>
          <span style={{ fontSize: 10, color: "var(--text-muted)", flexShrink: 0 }}>{pct.toFixed(0)}%</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 flex-shrink-0">
        <div className="text-right">
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Total em Vendas</p>
          <p className="gold-text" style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 18 }}>
            {formatCurrency(broker.totalSales)}
          </p>
        </div>
        <div className="text-right">
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Comissões</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#22c55e" }}>
            {formatCurrency(broker.commission)}
          </p>
        </div>
        <div className="text-right">
          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Conversão</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#3b82f6" }}>
            {broker.conversionRate}%
          </p>
        </div>
      </div>

      {/* Circular Progress */}
      <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 60, height: 60 }}>
        <CircularProgress pct={pct} color={broker.rank === 1 ? "#D4AF37" : "#3b82f6"} size={56} />
        <span
          className="absolute"
          style={{ fontSize: 11, fontWeight: 700, color: broker.rank === 1 ? "var(--gold)" : "#3b82f6" }}
        >
          {pct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

// ── Main Ranking ──────────────────────────────────────────────
export function BrokerRanking() {
  const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null);
  const maxSales = brokers[0].totalSales;

  const totalVGV = brokers.reduce((s, b) => s + b.totalSales, 0);
  const totalCommissions = brokers.reduce((s, b) => s + b.commission, 0);
  const totalDeals = brokers.reduce((s, b) => s + b.totalDeals, 0);

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "VGV da Equipe", value: formatCurrency(totalVGV), color: "#D4AF37", icon: "🏆" },
          { label: "Comissões Totais", value: formatCurrency(totalCommissions), color: "#22c55e", icon: "💰" },
          { label: "Negócios Fechados", value: totalDeals, color: "#3b82f6", icon: "🤝" },
          { label: "Corretores Ativos", value: `${brokers.filter(b => b.status !== "offline").length}/${brokers.length}`, color: "#8b5cf6", icon: "👥" },
        ].map((card) => (
          <div
            key={card.label}
            className="glass rounded-2xl p-5 flex items-center gap-4"
          >
            <span style={{ fontSize: 28 }}>{card.icon}</span>
            <div>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{card.label}</p>
              <p
                style={{
                  fontFamily: "Montserrat, sans-serif",
                  fontWeight: 800,
                  fontSize: 22,
                  color: card.color,
                }}
              >
                {card.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Podium — Top 3 */}
      <div className="glass rounded-2xl p-6 mb-5">
        <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 20, textAlign: "center" }}>
          🏆 Pódio do Mês — Março 2026
        </h3>

        <div className="flex items-end justify-center gap-4">
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            <img
              src={brokers[1].avatar}
              alt={brokers[1].name}
              className="w-16 h-16 rounded-2xl object-cover mb-3"
              style={{ border: "2px solid #9ca3af" }}
            />
            <div className="flex gap-1 mb-2">
              {brokers[1].medals.map((m, i) => <span key={i} style={{ fontSize: 14 }}>{m}</span>)}
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", textAlign: "center" }}>{brokers[1].name.split(" ")[0]}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af" }}>{formatCurrency(brokers[1].totalSales)}</p>
            <div
              className="w-20 mt-3 rounded-t-xl flex items-end justify-center pb-2"
              style={{ height: 60, background: "linear-gradient(to top, rgba(156,163,175,0.2), rgba(156,163,175,0.05))", border: "1px solid rgba(156,163,175,0.2)" }}
            >
              <span style={{ fontSize: 20 }}>🥈</span>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center">
            <div className="text-center mb-2" style={{ fontSize: 14, color: "var(--gold)" }}>👑</div>
            <img
              src={brokers[0].avatar}
              alt={brokers[0].name}
              className="w-20 h-20 rounded-2xl object-cover mb-3 gold-glow"
              style={{ border: "3px solid var(--gold)" }}
            />
            <div className="flex gap-1 mb-2">
              {brokers[0].medals.map((m, i) => <span key={i} style={{ fontSize: 16 }}>{m}</span>)}
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", textAlign: "center" }}>{brokers[0].name.split(" ")[0]}</p>
            <p className="gold-text" style={{ fontSize: 16, fontWeight: 800, fontFamily: "Montserrat, sans-serif" }}>{formatCurrency(brokers[0].totalSales)}</p>
            <div
              className="w-20 mt-3 rounded-t-xl flex items-end justify-center pb-2 gold-glow"
              style={{ height: 80, background: "linear-gradient(to top, rgba(212,175,55,0.2), rgba(212,175,55,0.05))", border: "1px solid rgba(212,175,55,0.3)" }}
            >
              <span style={{ fontSize: 24 }}>🥇</span>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            <img
              src={brokers[2].avatar}
              alt={brokers[2].name}
              className="w-16 h-16 rounded-2xl object-cover mb-3"
              style={{ border: "2px solid #b45309" }}
            />
            <div className="flex gap-1 mb-2">
              {brokers[2].medals.map((m, i) => <span key={i} style={{ fontSize: 14 }}>{m}</span>)}
            </div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", textAlign: "center" }}>{brokers[2].name.split(" ")[0]}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#b45309" }}>{formatCurrency(brokers[2].totalSales)}</p>
            <div
              className="w-20 mt-3 rounded-t-xl flex items-end justify-center pb-2"
              style={{ height: 45, background: "linear-gradient(to top, rgba(180,83,9,0.2), rgba(180,83,9,0.05))", border: "1px solid rgba(180,83,9,0.2)" }}
            >
              <span style={{ fontSize: 20 }}>🥉</span>
            </div>
          </div>
        </div>
      </div>

      {/* Full Ranking */}
      <div className="space-y-3">
        {brokers.map((broker) => (
          <BrokerRow
            key={broker.id}
            broker={broker}
            maxSales={maxSales}
            onClick={() => setSelectedBroker(broker)}
          />
        ))}
      </div>

      {/* Modal */}
      {selectedBroker && (
        <BrokerModal broker={selectedBroker} onClose={() => setSelectedBroker(null)} />
      )}
    </div>
  );
}
