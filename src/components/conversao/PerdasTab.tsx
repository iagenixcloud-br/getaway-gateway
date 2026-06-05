import React, { useMemo } from "react";
import { MetricaFunilRow } from "../../hooks/useMetricasFunil";
import { CorretorOption } from "../../hooks/useCorretores";

interface Props {
  rows: MetricaFunilRow[];
  isAdmin: boolean;
  corretores: CorretorOption[];
  loading: boolean;
}

export function PerdasTab({ rows, isAdmin, corretores, loading }: Props) {
  const agregado = useMemo(() => {
    const map = new Map<string, { perdas: number; leads: number }>();
    for (const r of rows) {
      const k = r.corretor_id ?? "__sem__";
      const cur = map.get(k) ?? { perdas: 0, leads: 0 };
      cur.perdas += r.perdas_sem_contato || 0;
      cur.leads += r.leads || 0;
      map.set(k, cur);
    }
    const nomes = new Map(corretores.map((c) => [c.id, c.name]));
    return Array.from(map.entries())
      .map(([id, v]) => ({
        id,
        nome: id === "__sem__" ? "Não atribuído" : nomes.get(id) ?? "—",
        perdas: v.perdas,
        leads: v.leads,
        pct: v.leads > 0 ? (v.perdas / v.leads) * 100 : 0,
      }))
      .sort((a, b) => b.perdas - a.perdas);
  }, [rows, corretores]);

  const totalLeads = agregado.reduce((a, b) => a + b.leads, 0);
  const totalPerdas = agregado.reduce((a, b) => a + b.perdas, 0);
  const pctTotal = totalLeads > 0 ? (totalPerdas / totalLeads) * 100 : 0;

  if (loading) {
    return (
      <div
        className="rounded-xl animate-pulse"
        style={{ background: "#112236", height: 200 }}
      />
    );
  }

  if (!isAdmin) {
    const meu = agregado[0];
    return (
      <div
        className="rounded-xl p-6"
        style={{
          background: "#112236",
          border: "0.5px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
          Suas perdas por "Sem contato" no período
        </div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: "#D85A30",
            fontFamily: "Montserrat, Inter, sans-serif",
          }}
        >
          {meu?.perdas ?? 0}
        </div>
        <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 6 }}>
          {pctTotal.toFixed(1)}% dos seus {meu?.leads ?? 0} leads
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "#112236",
        border: "0.5px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between">
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
            Perdas por "Sem contato" — por corretor
          </div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            Total: {totalPerdas} ({pctTotal.toFixed(1)}% de {totalLeads} leads)
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden p-3 space-y-2">
        {agregado.length === 0 ? (
          <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "#94a3b8" }}>
            Nenhuma perda no período.
          </div>
        ) : (
          agregado.map((r) => (
            <div key={r.id} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-1">
                <p className="truncate" style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{r.nome}</p>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#D85A30" }}>{r.perdas}</span>
              </div>
              <div className="flex items-center justify-between" style={{ fontSize: 11, color: "#94a3b8" }}>
                <span>{r.leads} leads</span>
                <span>{r.pct.toFixed(1)}%</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <table className="hidden md:table" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "rgba(255,255,255,0.03)" }}>
            <Th>Corretor</Th>
            <Th align="right">Perdas</Th>
            <Th align="right">Leads</Th>
            <Th align="right">% sobre leads</Th>
          </tr>
        </thead>
        <tbody>
          {agregado.length === 0 && (
            <tr>
              <td
                colSpan={4}
                style={{
                  padding: 24,
                  textAlign: "center",
                  fontSize: 12,
                  color: "#94a3b8",
                }}
              >
                Nenhuma perda no período.
              </td>
            </tr>
          )}
          {agregado.map((r) => (
            <tr
              key={r.id}
              style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
            >
              <td style={cell}>{r.nome}</td>
              <td style={{ ...cell, textAlign: "right", color: "#D85A30", fontWeight: 700 }}>
                {r.perdas}
              </td>
              <td style={{ ...cell, textAlign: "right", color: "#cbd5e1" }}>
                {r.leads}
              </td>
              <td style={{ ...cell, textAlign: "right", color: "#e2e8f0" }}>
                {r.pct.toFixed(1)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const cell: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: 13,
  color: "#e2e8f0",
};

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
        padding: "10px 16px",
        fontSize: 11,
        color: "#94a3b8",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {children}
    </th>
  );
}
