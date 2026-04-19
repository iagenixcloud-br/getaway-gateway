import React, { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import { useAuth } from "../contexts/AuthContext";
import { supabase, LeadRow } from "../lib/supabase";
import { LeadStatus } from "../data/mockData";

// ============================================================
// Página /desempenho
// ------------------------------------------------------------
// Métricas GLOBAIS dos leads (ainda não há vínculo lead↔corretor).
// Quando a roleta for implementada, evoluímos para "por corretor".
// ============================================================

type RangeKey = "7d" | "30d" | "90d" | "all";

const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "7d", label: "Últimos 7 dias", days: 7 },
  { key: "30d", label: "Últimos 30 dias", days: 30 },
  { key: "90d", label: "Últimos 90 dias", days: 90 },
  { key: "all", label: "Tudo", days: null },
];

// Cores por status (alinhadas ao tema dark/gold do app)
const STATUS_META: Record<LeadStatus, { label: string; color: string }> = {
  novo: { label: "Novo", color: "#3b82f6" },
  atrasado: { label: "Atrasado", color: "#ef4444" },
  visitar: { label: "Visitar", color: "#f59e0b" },
  agendados: { label: "Agendados", color: "#8b5cf6" },
  favoritos: { label: "Favoritos", color: "#ec4899" },
  fechado: { label: "Fechado", color: "#22c55e" },
  arquivados: { label: "Arquivados", color: "#6b7280" },
};

const ALL_STATUSES: LeadStatus[] = [
  "novo",
  "atrasado",
  "visitar",
  "agendados",
  "favoritos",
  "fechado",
  "arquivados",
];

const normalizeStatus = (s: string | null): LeadStatus => {
  const n = (s || "").toLowerCase().trim();
  if (n === "novo lead" || n === "new") return "novo";
  if (n === "agendado") return "agendados";
  if (n === "favorito") return "favoritos";
  if (n === "negocio fechado" || n === "negócio fechado") return "fechado";
  if (n === "arquivado") return "arquivados";
  if ((ALL_STATUSES as string[]).includes(n)) return n as LeadStatus;
  return "novo";
};

export function Desempenho() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>("30d");

  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (error) {
        setError(error.message);
      } else {
        setLeads((data as LeadRow[]) ?? []);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  // Filtra leads pelo período
  const filtered = useMemo(() => {
    const cfg = RANGES.find((r) => r.key === range)!;
    if (cfg.days === null) return leads;
    const cutoff = Date.now() - cfg.days * 24 * 60 * 60 * 1000;
    return leads.filter((l) => new Date(l.created_at).getTime() >= cutoff);
  }, [leads, range]);

  // KPIs
  const total = filtered.length;
  const fechados = filtered.filter((l) => normalizeStatus(l.status) === "fechado").length;
  const ativos = filtered.filter(
    (l) => !["fechado", "arquivados"].includes(normalizeStatus(l.status)),
  ).length;
  const conversao = total > 0 ? (fechados / total) * 100 : 0;

  // Dados por status (gráfico de barras + pizza + tabela)
  const porStatus = useMemo(() => {
    const counts = new Map<LeadStatus, number>();
    ALL_STATUSES.forEach((s) => counts.set(s, 0));
    filtered.forEach((l) => {
      const s = normalizeStatus(l.status);
      counts.set(s, (counts.get(s) ?? 0) + 1);
    });
    return ALL_STATUSES.map((s) => ({
      status: s,
      label: STATUS_META[s].label,
      value: counts.get(s) ?? 0,
      color: STATUS_META[s].color,
    }));
  }, [filtered]);

  // Leads por dia (linha) — últimos N dias do range, ou últimos 30 se "all"
  const porDia = useMemo(() => {
    const cfg = RANGES.find((r) => r.key === range)!;
    const days = cfg.days ?? 30;
    const buckets: { date: string; label: string; total: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      buckets.push({ date: key, label, total: 0 });
    }
    const idx = new Map(buckets.map((b, i) => [b.date, i]));
    filtered.forEach((l) => {
      const k = new Date(l.created_at).toISOString().slice(0, 10);
      const i = idx.get(k);
      if (i !== undefined) buckets[i].total++;
    });
    return buckets;
  }, [filtered, range]);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div>
      {/* Header + filtros */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1
            style={{
              fontFamily: "Montserrat",
              fontWeight: 700,
              fontSize: 22,
              color: "var(--text-primary)",
            }}
          >
            Desempenho
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Visão geral do pipeline {/* TODO: virar "por corretor" quando a roleta existir */}
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-xl glass" style={{ border: "1px solid var(--glass-border)" }}>
          {RANGES.map((r) => {
            const active = range === r.key;
            return (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                style={{
                  background: active ? "var(--gold)" : "transparent",
                  color: active ? "#0a0a0a" : "var(--text-muted)",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando...</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: "#ef4444" }}>{error}</p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KpiCard label="Total de leads" value={total.toString()} accent="#D4AF37" />
            <KpiCard label="Leads ativos" value={ativos.toString()} accent="#3b82f6" />
            <KpiCard label="Fechados" value={fechados.toString()} accent="#22c55e" />
            <KpiCard
              label="Taxa de conversão"
              value={`${conversao.toFixed(1)}%`}
              accent="#ec4899"
            />
          </div>

          {/* Linha: leads por dia */}
          <div
            className="glass rounded-2xl p-5 mb-6"
            style={{ border: "1px solid var(--glass-border)" }}
          >
            <h2
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: 16,
              }}
            >
              Leads recebidos por dia
            </h2>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={porDia} margin={{ top: 5, right: 16, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="rgba(255,255,255,0.4)"
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,15,25,0.95)",
                      border: "1px solid rgba(212,175,55,0.3)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "#D4AF37" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#D4AF37"
                    strokeWidth={2}
                    dot={{ fill: "#D4AF37", r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Linha 2: barras + pizza */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div
              className="glass rounded-2xl p-5"
              style={{ border: "1px solid var(--glass-border)" }}
            >
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 16,
                }}
              >
                Leads por status
              </h2>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={porStatus} margin={{ top: 5, right: 16, left: -10, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} />
                    <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15,15,25,0.95)",
                        border: "1px solid rgba(212,175,55,0.3)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      cursor={{ fill: "rgba(212,175,55,0.05)" }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {porStatus.map((entry) => (
                        <Cell key={entry.status} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              className="glass rounded-2xl p-5"
              style={{ border: "1px solid var(--glass-border)" }}
            >
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 16,
                }}
              >
                Distribuição
              </h2>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={porStatus.filter((s) => s.value > 0)}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {porStatus.map((entry) => (
                        <Cell key={entry.status} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15,15,25,0.95)",
                        border: "1px solid rgba(212,175,55,0.3)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Tabela detalhada */}
          <div
            className="glass rounded-2xl overflow-hidden"
            style={{ border: "1px solid var(--glass-border)" }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--glass-border)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                Detalhamento por status
              </h2>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                  <Th>Status</Th>
                  <Th align="right">Quantidade</Th>
                  <Th align="right">% do total</Th>
                </tr>
              </thead>
              <tbody>
                {porStatus.map((row) => (
                  <tr key={row.status} style={{ borderTop: "1px solid var(--glass-border)" }}>
                    <td style={{ padding: "12px 16px", fontSize: 13 }}>
                      <span className="inline-flex items-center gap-2">
                        <span
                          style={{
                            display: "inline-block",
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            background: row.color,
                          }}
                        />
                        <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                          {row.label}
                        </span>
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 13,
                        color: "var(--text-primary)",
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {row.value}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 13,
                        color: "var(--text-muted)",
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {total > 0 ? ((row.value / total) * 100).toFixed(1) : "0.0"}%
                    </td>
                  </tr>
                ))}
                <tr
                  style={{
                    borderTop: "1px solid var(--glass-border)",
                    background: "rgba(212,175,55,0.05)",
                  }}
                >
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: 13,
                      color: "var(--gold)",
                      fontWeight: 700,
                    }}
                  >
                    Total
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: 13,
                      color: "var(--gold)",
                      fontWeight: 700,
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {total}
                  </td>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: 13,
                      color: "var(--gold)",
                      fontWeight: 700,
                      textAlign: "right",
                    }}
                  >
                    100%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 16,
              fontStyle: "italic",
            }}
          >
            Dica: quando a roleta de leads estiver ativa, esta página passará a quebrar as métricas
            por corretor.
          </p>
        </>
      )}
    </div>
  );
}

// ────────── Componentes auxiliares ──────────

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      className="glass rounded-2xl p-4"
      style={{ border: "1px solid var(--glass-border)", position: "relative", overflow: "hidden" }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: 3,
          width: "100%",
          background: accent,
          opacity: 0.7,
        }}
      />
      <p
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 8,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "Montserrat, sans-serif",
          fontSize: 26,
          fontWeight: 700,
          color: "var(--text-primary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      style={{
        textAlign: align,
        padding: "12px 16px",
        fontSize: 11,
        color: "var(--text-muted)",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {children}
    </th>
  );
}
