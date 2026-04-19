import React, { useState } from "react";

// ── Mock Data ────────────────────────────────────────────────
type CampaignStatus = "ativa" | "pausada" | "encerrada";
type Channel = "Meta Ads" | "Google Ads" | "Instagram" | "WhatsApp" | "Email";

interface Campaign {
  id: string;
  name: string;
  channel: Channel;
  status: CampaignStatus;
  budget: number;
  spent: number;
  leads: number;
  conversions: number;
  ctr: number;
  cpl: number;
  roi: number;
  startDate: string;
}

const channelColors: Record<Channel, { bg: string; color: string }> = {
  "Meta Ads": { bg: "rgba(24,119,242,0.15)", color: "#1877F2" },
  "Google Ads": { bg: "rgba(234,67,53,0.15)", color: "#EA4335" },
  Instagram: { bg: "rgba(225,48,108,0.15)", color: "#E1306C" },
  WhatsApp: { bg: "rgba(37,211,102,0.15)", color: "#25D366" },
  Email: { bg: "rgba(212,175,55,0.15)", color: "#D4AF37" },
};

const statusColors: Record<CampaignStatus, { bg: string; color: string; label: string }> = {
  ativa: { bg: "rgba(34,197,94,0.15)", color: "#22c55e", label: "Ativa" },
  pausada: { bg: "rgba(245,158,11,0.15)", color: "#f59e0b", label: "Pausada" },
  encerrada: { bg: "rgba(148,163,184,0.15)", color: "#94a3b8", label: "Encerrada" },
};

const campaigns: Campaign[] = [
  {
    id: "c1",
    name: "Lançamento Cobertura Jardins",
    channel: "Meta Ads",
    status: "ativa",
    budget: 15000,
    spent: 8420,
    leads: 142,
    conversions: 12,
    ctr: 3.8,
    cpl: 59.3,
    roi: 4.2,
    startDate: "2025-04-01",
  },
  {
    id: "c2",
    name: "Apartamentos Premium - Search",
    channel: "Google Ads",
    status: "ativa",
    budget: 20000,
    spent: 14200,
    leads: 198,
    conversions: 18,
    ctr: 5.1,
    cpl: 71.7,
    roi: 5.8,
    startDate: "2025-03-15",
  },
  {
    id: "c3",
    name: "Stories Casas de Luxo",
    channel: "Instagram",
    status: "ativa",
    budget: 8000,
    spent: 6100,
    leads: 87,
    conversions: 7,
    ctr: 2.9,
    cpl: 70.1,
    roi: 3.4,
    startDate: "2025-04-05",
  },
  {
    id: "c4",
    name: "Newsletter Mensal Abril",
    channel: "Email",
    status: "encerrada",
    budget: 1200,
    spent: 1200,
    leads: 64,
    conversions: 5,
    ctr: 18.4,
    cpl: 18.7,
    roi: 6.1,
    startDate: "2025-04-10",
  },
  {
    id: "c5",
    name: "Broadcast WhatsApp Leads Quentes",
    channel: "WhatsApp",
    status: "pausada",
    budget: 3500,
    spent: 1850,
    leads: 41,
    conversions: 4,
    ctr: 24.1,
    cpl: 45.1,
    roi: 4.9,
    startDate: "2025-03-28",
  },
];

const channelPerformance: { channel: Channel; leads: number; spent: number }[] = [
  { channel: "Google Ads", leads: 198, spent: 14200 },
  { channel: "Meta Ads", leads: 142, spent: 8420 },
  { channel: "Instagram", leads: 87, spent: 6100 },
  { channel: "Email", leads: 64, spent: 1200 },
  { channel: "WhatsApp", leads: 41, spent: 1850 },
];

const formatCurrency = (n: number) =>
  n >= 1000 ? `R$ ${(n / 1000).toFixed(1)}k` : `R$ ${n.toFixed(0)}`;

// ── Campaign Modal ───────────────────────────────────────────
function CampaignModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const ch = channelColors[campaign.channel];
  const st = statusColors[campaign.status];
  const usedPct = (campaign.spent / campaign.budget) * 100;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass rounded-2xl p-8 w-full"
        style={{ maxWidth: 620, border: "1px solid rgba(212,175,55,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge" style={{ background: ch.bg, color: ch.color }}>
                {campaign.channel}
              </span>
              <span className="badge" style={{ background: st.bg, color: st.color }}>
                {st.label}
              </span>
            </div>
            <h2 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 22 }}>
              {campaign.name}
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              Iniciada em {new Date(campaign.startDate).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}
          >
            ✕
          </button>
        </div>

        {/* Budget Progress */}
        <div
          className="p-4 rounded-xl mb-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Orçamento utilizado</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>
              {formatCurrency(campaign.spent)} / {formatCurrency(campaign.budget)}
            </span>
          </div>
          <div className="health-bar">
            <div
              className="health-fill"
              style={{ width: `${usedPct}%`, background: "var(--gold)" }}
            />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Leads", value: campaign.leads, color: "#3b82f6" },
            { label: "Conversões", value: campaign.conversions, color: "#22c55e" },
            { label: "CTR", value: `${campaign.ctr}%`, color: "#8b5cf6" },
            { label: "CPL", value: `R$${campaign.cpl.toFixed(0)}`, color: "#D4AF37" },
          ].map((m) => (
            <div key={m.label} className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{m.label}</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* ROI Highlight */}
        <div
          className="p-4 rounded-xl mb-6 flex items-center justify-between"
          style={{
            background: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))",
            border: "1px solid rgba(212,175,55,0.3)",
          }}
        >
          <div>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>ROI da campanha</p>
            <p style={{ fontFamily: "Montserrat, sans-serif", fontSize: 28, fontWeight: 800, color: "var(--gold)" }}>
              {campaign.roi.toFixed(1)}x
            </p>
          </div>
          <div className="text-right">
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Receita estimada</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
              {formatCurrency(campaign.spent * campaign.roi)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-3">
          <button
            className="py-3 rounded-xl font-semibold"
            style={{ background: "var(--gold-dim)", border: "1px solid rgba(212,175,55,0.3)", color: "var(--gold)", fontSize: 13, cursor: "pointer" }}
          >
            Editar
          </button>
          <button
            className="py-3 rounded-xl font-semibold"
            style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", fontSize: 13, cursor: "pointer" }}
          >
            {campaign.status === "ativa" ? "Pausar" : "Ativar"}
          </button>
          <button
            className="py-3 rounded-xl font-semibold"
            style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6", fontSize: 13, cursor: "pointer" }}
          >
            Duplicar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Marketing Hub ───────────────────────────────────────
export function MarketingHub() {
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [filter, setFilter] = useState<"todas" | CampaignStatus>("todas");

  const totalBudget = campaigns.reduce((s, c) => s + c.budget, 0);
  const totalSpent = campaigns.reduce((s, c) => s + c.spent, 0);
  const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0);
  const totalConv = campaigns.reduce((s, c) => s + c.conversions, 0);
  const avgRoi = campaigns.reduce((s, c) => s + c.roi, 0) / campaigns.length;

  const filtered = filter === "todas" ? campaigns : campaigns.filter((c) => c.status === filter);
  const maxLeads = Math.max(...channelPerformance.map((c) => c.leads));

  const kpis = [
    { label: "Investimento total", value: formatCurrency(totalSpent), sub: `de ${formatCurrency(totalBudget)}`, color: "#D4AF37" },
    { label: "Leads gerados", value: totalLeads.toString(), sub: "este mês", color: "#3b82f6" },
    { label: "Conversões", value: totalConv.toString(), sub: `${((totalConv / totalLeads) * 100).toFixed(1)}% taxa`, color: "#22c55e" },
    { label: "ROI médio", value: `${avgRoi.toFixed(1)}x`, sub: "todas as campanhas", color: "#8b5cf6" },
  ];

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="glass rounded-2xl p-5">
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>{k.label}</p>
            <p style={{ fontFamily: "Montserrat, sans-serif", fontSize: 26, fontWeight: 800, color: k.color }}>
              {k.value}
            </p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: "2fr 1fr" }}>
        {/* Campaigns List */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 style={{ fontFamily: "Montserrat, sans-serif", fontSize: 18, fontWeight: 700 }}>
                Campanhas
              </h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {filtered.length} campanha{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              {(["todas", "ativa", "pausada", "encerrada"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3 py-1.5 rounded-lg"
                  style={{
                    background: filter === f ? "var(--gold-dim)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${filter === f ? "rgba(212,175,55,0.4)" : "var(--glass-border)"}`,
                    color: filter === f ? "var(--gold)" : "var(--text-muted)",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map((c) => {
              const ch = channelColors[c.channel];
              const st = statusColors[c.status];
              const usedPct = (c.spent / c.budget) * 100;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="glass-hover rounded-xl p-4 cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="badge" style={{ background: ch.bg, color: ch.color }}>
                          {c.channel}
                        </span>
                        <span className="badge" style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                        {c.name}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p style={{ fontSize: 11, color: "var(--text-muted)" }}>ROI</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: "var(--gold)" }}>
                        {c.roi.toFixed(1)}x
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div>
                      <p style={{ fontSize: 10, color: "var(--text-muted)" }}>Leads</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#3b82f6" }}>{c.leads}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: "var(--text-muted)" }}>Conv.</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>{c.conversions}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: "var(--text-muted)" }}>CTR</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#8b5cf6" }}>{c.ctr}%</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: "var(--text-muted)" }}>CPL</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                        R${c.cpl.toFixed(0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="health-bar flex-1">
                      <div
                        className="health-fill"
                        style={{ width: `${usedPct}%`, background: ch.color }}
                      />
                    </div>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {formatCurrency(c.spent)} / {formatCurrency(c.budget)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            className="mt-4 w-full py-3 rounded-xl flex items-center justify-center gap-2 glass-hover"
            style={{
              background: "rgba(212,175,55,0.05)",
              border: "1px dashed rgba(212,175,55,0.3)",
              color: "var(--gold)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 18 }}>+</span>
            Nova Campanha
          </button>
        </div>

        {/* Side Panel: Performance by Channel */}
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6">
            <h3 style={{ fontFamily: "Montserrat, sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
              Performance por canal
            </h3>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16 }}>
              Leads gerados nos últimos 30 dias
            </p>
            <div className="space-y-3">
              {channelPerformance.map((cp) => {
                const ch = channelColors[cp.channel];
                const pct = (cp.leads / maxLeads) * 100;
                return (
                  <div key={cp.channel}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={{ fontSize: 12, fontWeight: 600, color: ch.color }}>
                        {cp.channel}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                        {cp.leads}
                      </span>
                    </div>
                    <div className="health-bar">
                      <div className="health-fill" style={{ width: `${pct}%`, background: ch.color }} />
                    </div>
                    <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>
                      Investido: {formatCurrency(cp.spent)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Insights */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: "linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.02))",
              border: "1px solid rgba(212,175,55,0.25)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: 18 }}>💡</span>
              <h3 style={{ fontFamily: "Montserrat, sans-serif", fontSize: 14, fontWeight: 700, color: "var(--gold)" }}>
                Insights
              </h3>
            </div>
            <ul className="space-y-2">
              {[
                "Email tem o menor CPL (R$18) — invista mais",
                "WhatsApp está pausado mas com ROI 4.9x",
                "Google Ads gera 35% dos leads totais",
              ].map((i, idx) => (
                <li
                  key={idx}
                  style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.5, paddingLeft: 12, position: "relative" }}
                >
                  <span style={{ position: "absolute", left: 0, color: "var(--gold)" }}>•</span>
                  {i}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {selected && <CampaignModal campaign={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
