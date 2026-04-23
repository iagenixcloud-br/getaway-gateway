import React, { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useRoleta } from "../hooks/useRoleta";
import { useLeads } from "../hooks/useLeads";

const sourceLabel = (s: string) => {
  switch (s) {
    case "auto": return "Automático";
    case "manual": return "Manual";
    case "fb_webhook": return "Facebook";
    default: return s;
  }
};

const sourceColor = (s: string) => {
  switch (s) {
    case "auto": return "#22c55e";
    case "manual": return "#D4AF37";
    case "fb_webhook": return "#1877F2";
    default: return "#94a3b8";
  }
};

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const initials = (name: string) =>
  name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

export function Roleta() {
  const { isAdmin, loading: authLoading } = useAuth();
  const { corretores, fila, history, loading, error, toggleActive, redistribute } = useRoleta(isAdmin);
  const { leads } = useLeads();
  const [redistributingId, setRedistributingId] = useState<string | null>(null);

  if (!authLoading && !isAdmin) return <Navigate to="/" replace />;

  const proximo = fila[0];
  const totalDistribuidos = useMemo(
    () => corretores.reduce((s, c) => s + (c.total_received || 0), 0),
    [corretores],
  );

  // Leads sem corretor (pool) — para redistribuir
  const leadsSemCorretor = leads.filter((l) => !l.assignedTo);

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444", color: "#fecaca" }}>
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Corretores ativos" value={fila.length} sub={`${corretores.length} cadastrados`} />
        <KpiCard label="Próximo a receber" value={proximo?.name || "—"} sub={proximo ? `${proximo.total_received} leads no total` : "Nenhum ativo"} />
        <KpiCard label="Distribuídos hoje" value={history.filter((h) => new Date(h.created_at).toDateString() === new Date().toDateString()).length} sub="últimas 24h" />
        <KpiCard label="Total distribuídos" value={totalDistribuidos} sub="histórico geral" />
      </div>

      {/* Fila atual */}
      <section className="glass rounded-2xl p-6">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 style={{ fontFamily: "Montserrat, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
              Fila da Roleta
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Ordem em que os próximos leads serão distribuídos (round-robin)
            </p>
          </div>
        </header>

        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Carregando…</p>
        ) : corretores.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>Nenhum corretor cadastrado.</p>
        ) : (
          <ul className="space-y-2">
            {corretores
              .slice()
              .sort((a, b) => {
                if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
                const ta = a.last_received_at ? new Date(a.last_received_at).getTime() : 0;
                const tb = b.last_received_at ? new Date(b.last_received_at).getTime() : 0;
                return ta - tb;
              })
              .map((c, idx) => {
                const filaPos = fila.findIndex((f) => f.id === c.id);
                return (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{
                      background: c.is_active ? "rgba(212,175,55,0.06)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${filaPos === 0 && c.is_active ? "var(--gold)" : "var(--glass-border)"}`,
                      opacity: c.is_active ? 1 : 0.55,
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: filaPos === 0 && c.is_active ? "var(--gold)" : "rgba(255,255,255,0.08)",
                        color: filaPos === 0 && c.is_active ? "#0a0a0a" : "var(--text-primary)",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      {c.is_active && filaPos >= 0 ? filaPos + 1 : "—"}
                    </div>
                    <img
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(initials(c.name))}&backgroundColor=D4AF37&textColor=0a0a0a`}
                      alt={c.name}
                      className="w-9 h-9 rounded-full"
                      style={{ border: "1.5px solid var(--gold)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{c.name}</p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {c.total_received} recebidos • último: {formatDate(c.last_received_at)}
                      </p>
                    </div>
                    {filaPos === 0 && c.is_active && (
                      <span
                        className="px-2 py-1 rounded-full text-xs"
                        style={{ background: "var(--gold)", color: "#0a0a0a", fontWeight: 700 }}
                      >
                        PRÓXIMO
                      </span>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {c.is_active ? "Ativo" : "Pausado"}
                      </span>
                      <input
                        type="checkbox"
                        checked={c.is_active}
                        onChange={(e) => toggleActive(c.id, e.target.checked)}
                        className="w-10 h-5 appearance-none rounded-full cursor-pointer transition-all relative"
                        style={{
                          background: c.is_active ? "var(--gold)" : "rgba(255,255,255,0.15)",
                        }}
                      />
                    </label>
                  </li>
                );
              })}
          </ul>
        )}
      </section>

      {/* Redistribuir leads */}
      <section className="glass rounded-2xl p-6">
        <header className="mb-4">
          <h2 style={{ fontFamily: "Montserrat, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
            Redistribuir Leads
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Atribua manualmente leads sem corretor ou reatribua leads existentes
          </p>
        </header>

        {leadsSemCorretor.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Todos os leads já têm corretor atribuído.
          </p>
        ) : (
          <ul className="space-y-2">
            {leadsSemCorretor.slice(0, 10).map((lead) => (
              <li
                key={lead.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)" }}
              >
                <div className="flex-1 min-w-0">
                  <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{lead.name}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {lead.phone} • {lead.property}
                  </p>
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setRedistributingId(lead.id);
                    redistribute(lead.id, e.target.value).finally(() => setRedistributingId(null));
                  }}
                  disabled={redistributingId === lead.id}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="">{redistributingId === lead.id ? "Atribuindo…" : "Atribuir a…"}</option>
                  {fila.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Histórico */}
      <section className="glass rounded-2xl p-6">
        <header className="mb-4">
          <h2 style={{ fontFamily: "Montserrat, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
            Histórico de Distribuições
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Últimas 50 atribuições
          </p>
        </header>

        {history.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Sem registros ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <Th>Quando</Th>
                  <Th>Lead</Th>
                  <Th>Corretor</Th>
                  <Th>Origem</Th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="py-2 px-2" style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {formatDate(h.created_at)}
                    </td>
                    <td className="py-2 px-2" style={{ color: "var(--text-primary)" }}>
                      {h.lead_name || h.lead_id.slice(0, 8)}
                    </td>
                    <td className="py-2 px-2" style={{ color: "var(--text-primary)" }}>
                      {h.corretor_name || (h.corretor_id ? h.corretor_id.slice(0, 8) : "— (desatribuído)")}
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className="px-2 py-0.5 rounded-full text-xs"
                        style={{
                          background: `${sourceColor(h.source)}22`,
                          color: sourceColor(h.source),
                          fontWeight: 600,
                        }}
                      >
                        {sourceLabel(h.source)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {label}
      </p>
      <p style={{ fontFamily: "Montserrat, sans-serif", fontSize: 24, fontWeight: 700, color: "var(--gold)", marginTop: 6, lineHeight: 1.1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="text-left py-2 px-2"
      style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}
    >
      {children}
    </th>
  );
}
