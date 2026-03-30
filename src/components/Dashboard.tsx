import React, { useEffect, useState } from "react";
import { kpiData } from "../data/mockData";

// ── Animated Counter Hook ────────────────────────────────────
function useCountUp(target: number, duration = 1800, decimals = 0) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const steps = 60;
    const increment = target / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      start += increment;
      if (step >= steps) {
        setValue(target);
        clearInterval(timer);
      } else {
        setValue(parseFloat(start.toFixed(decimals)));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, duration, decimals]);
  return value;
}

// ── Currency Formatter ───────────────────────────────────────
function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`;
  return `R$ ${value.toLocaleString("pt-BR")}`;
}

// ── Sparkline Mini Chart ─────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 30;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <polyline
        points={`0,${h} ${points} ${w},${h}`}
        fill={color}
        stroke="none"
        opacity="0.08"
      />
    </svg>
  );
}

// ── KPI Card ─────────────────────────────────────────────────
interface KpiCardProps {
  title: string;
  value: number;
  format?: "currency" | "number" | "percent";
  decimals?: number;
  subtitle: string;
  trend: number;
  trendLabel: string;
  color: string;
  icon: React.ReactNode;
  sparkData: number[];
  delay?: number;
}

function KpiCard({ title, value, format = "number", decimals = 0, subtitle, trend, trendLabel, color, icon, sparkData, delay = 0 }: KpiCardProps) {
  const count = useCountUp(value, 1800 + delay * 200, decimals);

  const displayValue = () => {
    if (format === "currency") return formatCurrency(count);
    if (format === "percent") return `${count.toFixed(1)}%`;
    return count.toLocaleString("pt-BR");
  };

  return (
    <div
      className="glass glass-hover kpi-card rounded-2xl p-5 flex flex-col gap-3"
      style={{ animationDelay: `${delay * 100}ms` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {title}
        </p>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <span style={{ color }}>{icon}</span>
        </div>
      </div>

      {/* Value */}
      <div>
        <p
          className="count-anim"
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 800,
            fontSize: 28,
            color: "var(--text-primary)",
            lineHeight: 1,
          }}
        >
          {displayValue()}
        </p>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{subtitle}</p>
      </div>

      {/* Footer */}
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className="flex items-center gap-0.5"
            style={{ fontSize: 12, fontWeight: 600, color: trend >= 0 ? "var(--success)" : "var(--danger)" }}
          >
            {trend >= 0 ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
            {Math.abs(trend)}%
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{trendLabel}</span>
        </div>
        <Sparkline data={sparkData} color={color} />
      </div>
    </div>
  );
}

// ── Recent Activity ──────────────────────────────────────────
const activities = [
  { time: "há 12min", text: "Novo lead de Ricardo Mendonça via Instagram", type: "lead", color: "#E1306C" },
  { time: "há 28min", text: "Rafael Andrade fechou venda da Mansão Alphaville", type: "sale", color: "#D4AF37" },
  { time: "há 1h", text: "Visita agendada com Thiago Drummond — Duplex Vila Nova", type: "visit", color: "#22c55e" },
  { time: "há 2h", text: "Proposta enviada para Eduardo Figueiredo — R$ 3.6M", type: "proposal", color: "#3b82f6" },
  { time: "há 3h", text: "Lead de Isabela Vasconcelos sem resposta há 18h", type: "alert", color: "#ef4444" },
];

// ── Funnel Chart ─────────────────────────────────────────────
const funnelSteps = [
  { label: "Novos Leads", value: 134, pct: 100, color: "#3b82f6" },
  { label: "Em Contato", value: 89, pct: 66, color: "#8b5cf6" },
  { label: "Visita", value: 42, pct: 31, color: "#D4AF37" },
  { label: "Proposta", value: 18, pct: 13, color: "#f59e0b" },
  { label: "Fechado", value: 11, pct: 8, color: "#22c55e" },
];

// ── Main Dashboard ───────────────────────────────────────────
export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-3 gap-4 xl:grid-cols-6">
        <KpiCard
          title="VGV Total"
          value={112800000}
          format="currency"
          subtitle="Acumulado 2026"
          trend={14.2}
          trendLabel="vs mês anterior"
          color="#D4AF37"
          sparkData={[60, 72, 65, 80, 75, 90, 85, 98, 92, 112]}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
          delay={0}
        />
        <KpiCard
          title="Leads Ativos"
          value={47}
          subtitle="Pipeline aberto"
          trend={8.7}
          trendLabel="esta semana"
          color="#3b82f6"
          sparkData={[30, 35, 28, 42, 38, 45, 40, 47]}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>}
          delay={1}
        />
        <KpiCard
          title="Conversão"
          value={8.3}
          format="percent"
          decimals={1}
          subtitle="Lead → Venda"
          trend={1.2}
          trendLabel="vs trimestre"
          color="#22c55e"
          sparkData={[6.1, 6.8, 7.2, 6.9, 7.5, 7.8, 8.0, 8.3]}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}
          delay={2}
        />
        <KpiCard
          title="Comissões"
          value={3384000}
          format="currency"
          subtitle="5 corretores ativos"
          trend={22.4}
          trendLabel="vs ano anterior"
          color="#8b5cf6"
          sparkData={[1.8, 2.1, 2.4, 2.2, 2.7, 2.9, 3.1, 3.4]}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>}
          delay={3}
        />
        <KpiCard
          title="Imóveis"
          value={23}
          subtitle="Em carteira ativa"
          trend={4.5}
          trendLabel="este mês"
          color="#f59e0b"
          sparkData={[18, 19, 20, 19, 21, 20, 22, 23]}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
          delay={4}
        />
        <KpiCard
          title="Ticket Médio"
          value={3200000}
          format="currency"
          subtitle="Por transação"
          trend={6.1}
          trendLabel="trimestral"
          color="#ec4899"
          sparkData={[2.4, 2.6, 2.8, 2.7, 2.9, 3.0, 3.1, 3.2]}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>}
          delay={5}
        />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Funnel */}
        <div className="col-span-1 glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
              Funil de Vendas
            </h3>
            <span className="badge" style={{ background: "var(--gold-dim)", color: "var(--gold)", fontSize: 10 }}>
              Março 2026
            </span>
          </div>
          <div className="space-y-3">
            {funnelSteps.map((step) => (
              <div key={step.label}>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{step.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                    {step.value}
                    <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 4 }}>({step.pct}%)</span>
                  </span>
                </div>
                <div className="health-bar">
                  <div
                    className="health-fill"
                    style={{ width: `${step.pct}%`, background: step.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Conversion Rate Circle */}
          <div className="flex items-center justify-center mt-6 gap-4">
            <div className="text-center">
              <p style={{ fontSize: 32, fontWeight: 800, fontFamily: "Montserrat, sans-serif" }} className="gold-text">
                8.3%
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Taxa de Conversão</p>
            </div>
            <div className="text-center">
              <p style={{ fontSize: 32, fontWeight: 800, fontFamily: "Montserrat, sans-serif", color: "#22c55e" }}>
                11
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Vendas Fechadas</p>
            </div>
          </div>
        </div>

        {/* Lead Sources */}
        <div className="col-span-1 glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
              Origem dos Leads
            </h3>
            <span className="badge" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", fontSize: 10 }}>
              Últimos 30 dias
            </span>
          </div>

          {[
            { label: "Instagram", pct: 38, count: 51, color: "#E1306C", icon: "📷" },
            { label: "Facebook Ads", pct: 27, count: 36, color: "#1877F2", icon: "📘" },
            { label: "WhatsApp", pct: 18, count: 24, color: "#25D366", icon: "💬" },
            { label: "Site Próprio", pct: 11, count: 15, color: "#D4AF37", icon: "🌐" },
            { label: "Indicações", pct: 6, count: 8, color: "#8b5cf6", icon: "🤝" },
          ].map((src) => (
            <div key={src.label} className="flex items-center gap-3 mb-3">
              <span style={{ fontSize: 16 }}>{src.icon}</span>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{src.label}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{src.count} leads</span>
                </div>
                <div className="health-bar">
                  <div
                    className="health-fill"
                    style={{ width: `${src.pct}%`, background: src.color }}
                  />
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: src.color, width: 36, textAlign: "right" }}>
                {src.pct}%
              </span>
            </div>
          ))}
        </div>

        {/* Activity Feed */}
        <div className="col-span-1 glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
              Atividade Recente
            </h3>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: "var(--success)" }} />
              <span style={{ fontSize: 11, color: "var(--success)" }}>Ao vivo</span>
            </div>
          </div>

          <div className="space-y-3">
            {activities.map((act, i) => (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-xl glass-hover"
                style={{ cursor: "pointer" }}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                  style={{ background: act.color }}
                />
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.4 }}>
                    {act.text}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                    {act.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Brokers Quick View */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
            Desempenho dos Corretores — Março 2026
          </h3>
          <span className="badge" style={{ background: "var(--gold-dim)", color: "var(--gold)", fontSize: 10, cursor: "pointer" }}>
            Ver ranking completo →
          </span>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {[
            { name: "Rafael Andrade", sales: "R$ 32.4M", rank: 1, avatar: "https://i.pravatar.cc/150?img=51", pct: 100 },
            { name: "Priscila Monteiro", sales: "R$ 27.8M", rank: 2, avatar: "https://i.pravatar.cc/150?img=47", pct: 86 },
            { name: "Carlos Eduardo", sales: "R$ 21.5M", rank: 3, avatar: "https://i.pravatar.cc/150?img=53", pct: 66 },
            { name: "Tatiane Oliveira", sales: "R$ 18.2M", rank: 4, avatar: "https://i.pravatar.cc/150?img=45", pct: 56 },
            { name: "Marcos Vinicius", sales: "R$ 12.9M", rank: 5, avatar: "https://i.pravatar.cc/150?img=60", pct: 40 },
          ].map((broker) => (
            <div
              key={broker.name}
              className="flex flex-col items-center gap-2 p-4 rounded-xl glass-hover"
              style={{ cursor: "pointer" }}
            >
              <div className="relative">
                <img
                  src={broker.avatar}
                  alt={broker.name}
                  className="w-12 h-12 rounded-full object-cover"
                  style={{ border: broker.rank === 1 ? "2px solid var(--gold)" : "2px solid rgba(255,255,255,0.1)" }}
                />
                <span
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center rank-${broker.rank <= 3 ? broker.rank : "other"}`}
                  style={{ fontSize: 10, fontWeight: 700 }}
                >
                  {broker.rank}
                </span>
              </div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", textAlign: "center", lineHeight: 1.3 }}>
                {broker.name.split(" ")[0]}
              </p>
              <p className="gold-text" style={{ fontSize: 13, fontWeight: 700, fontFamily: "Montserrat, sans-serif" }}>
                {broker.sales}
              </p>
              <div className="w-full health-bar">
                <div className="health-fill" style={{ width: `${broker.pct}%`, background: broker.rank === 1 ? "#D4AF37" : "#3b82f6" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
