import React, { useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useCorretores } from "../../hooks/useCorretores";
import {
  PERIODOS,
  PeriodoKey,
  somarTotais,
  useMetricasFunil,
} from "../../hooks/useMetricasFunil";
import { FunilCard } from "./FunilCard";
import { PerdasTab } from "./PerdasTab";

const COR = {
  lead_novo: "#1D9E75",
  negocio: "#0F6E56",
  agendamento: "#185FA5",
  visita: "#534AB7",
  proposta: "#993556",
  venda: "#3C3489",
  perda: "#D85A30",
};

type SubTab = "funil" | "perdas";

export function ConversaoPanel() {
  const { isAdmin, user } = useAuth();
  const { corretores } = useCorretores(isAdmin);
  const [periodo, setPeriodo] = useState<PeriodoKey>("mes_atual");
  const [corretorId, setCorretorId] = useState<string>("");
  const [sub, setSub] = useState<SubTab>("funil");

  const { rows, loading } = useMetricasFunil({
    periodo,
    corretorId: isAdmin ? corretorId || null : user?.id ?? null,
  });

  const t = useMemo(() => somarTotais(rows), [rows]);

  const pct = (num: number, den: number) =>
    den > 0 ? (num / den) * 100 : 0;
  const fmtPct = (num: number, den: number) =>
    den > 0 ? `${pct(num, den).toFixed(1)}%` : "—";

  return (
    <div style={{ background: "#0d1b2a", marginTop: 8 }}>
      {/* Barra superior */}
      <div
        className="flex items-center justify-between flex-wrap gap-3 mb-5 p-4 rounded-xl"
        style={{
          background: "#112236",
          border: "0.5px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#f1f5f9",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Conversão por etapa
          </h2>
          <span
            style={{
              background: "#D85A30",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 999,
            }}
            title="Perdas por sem contato no período"
          >
            {loading ? "—" : t.perdas_sem_contato} sem contato
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <select
              value={corretorId}
              onChange={(e) => setCorretorId(e.target.value)}
              style={selectStyle}
            >
              <option value="">Todos corretores</option>
              {corretores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.email}
                </option>
              ))}
            </select>
          )}
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as PeriodoKey)}
            style={selectStyle}
          >
            {PERIODOS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sub-abas */}
      <div className="flex gap-1 mb-5">
        {(["funil", "perdas"] as SubTab[]).map((s) => {
          const active = sub === s;
          return (
            <button
              key={s}
              onClick={() => setSub(s)}
              style={{
                background: active ? "#1e3a5f" : "transparent",
                color: active ? "#f1f5f9" : "#94a3b8",
                fontSize: 12,
                fontWeight: 600,
                padding: "8px 16px",
                borderRadius: 8,
                border: "0.5px solid rgba(255,255,255,0.08)",
                cursor: "pointer",
              }}
            >
              {s === "funil" ? "Funil" : "Perdas"}
            </button>
          );
        })}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard
          loading={loading}
          label="Lead → Negócio"
          pct={fmtPct(t.negocios, t.leads)}
          abs={`${t.negocios} negócios`}
          color={COR.negocio}
        />
        <KpiCard
          loading={loading}
          label="Negócio → Ag."
          pct={fmtPct(t.agendamentos, t.negocios)}
          abs={`${t.agendamentos} agend.`}
          color={COR.agendamento}
        />
        <KpiCard
          loading={loading}
          label="Ag. → Visita"
          pct={fmtPct(t.visitas, t.agendamentos)}
          abs={`${t.visitas} visitas`}
          color={COR.visita}
        />
        <KpiCard
          loading={loading}
          label="Visita → Prop."
          pct={fmtPct(t.propostas, t.visitas)}
          abs={`${t.propostas} propostas`}
          color={COR.proposta}
        />
        <KpiCard
          loading={loading}
          label="Prop. → Venda"
          pct={fmtPct(t.vendas, t.propostas)}
          abs={`${t.vendas} vendas`}
          color={COR.venda}
        />
        <KpiCard
          loading={loading}
          label="Total leads"
          pct={String(t.leads)}
          abs="no período"
          color={COR.lead_novo}
        />
      </div>

      {/* Conteúdo das sub-abas */}
      {sub === "funil" ? (
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl animate-pulse"
                  style={{ background: "#112236", height: 120 }}
                />
              ))}
            </div>
          ) : (
            <>
              <FunilCard
                label="Lead Novo"
                color={COR.lead_novo}
                valor={t.leads}
                origemValor={t.leads}
                origemLabel="leads"
                pct={100}
                bridgeText={`${t.leads} leads → quantos viraram negócio?`}
              />
              <FunilCard
                label="Negócio"
                color={COR.negocio}
                valor={t.negocios}
                origemValor={t.leads}
                origemLabel="leads"
                pct={pct(t.negocios, t.leads)}
                bridgeText={`${t.negocios} negócios → quantos foram agendados?`}
              />
              <FunilCard
                label="Agendamento"
                color={COR.agendamento}
                valor={t.agendamentos}
                origemValor={t.negocios}
                origemLabel="negócios"
                pct={pct(t.agendamentos, t.negocios)}
                bridgeText={`${t.agendamentos} agendamentos → quantos compareceram?`}
              />
              <FunilCard
                label="Visita"
                color={COR.visita}
                valor={t.visitas}
                origemValor={t.agendamentos}
                origemLabel="agendamentos"
                pct={pct(t.visitas, t.agendamentos)}
                bridgeText={`${t.visitas} visitas → quantas viraram proposta?`}
              />
              <FunilCard
                label="Proposta"
                color={COR.proposta}
                valor={t.propostas}
                origemValor={t.visitas}
                origemLabel="visitas"
                pct={pct(t.propostas, t.visitas)}
                bridgeText={`${t.propostas} propostas → quantas fecharam?`}
              />
              <FunilCard
                label="Venda"
                color={COR.venda}
                valor={t.vendas}
                origemValor={t.propostas}
                origemLabel="propostas"
                pct={pct(t.vendas, t.propostas)}
                destaque
              />
            </>
          )}
        </div>
      ) : (
        <PerdasTab
          rows={rows}
          isAdmin={isAdmin}
          corretores={corretores}
          loading={loading}
        />
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: "#0d1b2a",
  color: "#e2e8f0",
  border: "0.5px solid rgba(255,255,255,0.12)",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  outline: "none",
};

function KpiCard({
  label,
  pct,
  abs,
  color,
  loading,
}: {
  label: string;
  pct: string;
  abs: string;
  color: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div
        className="rounded-xl animate-pulse"
        style={{ background: "#112236", height: 96 }}
      />
    );
  }
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "#112236",
        border: "0.5px solid rgba(255,255,255,0.08)",
        borderTop: `2px solid ${color}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "#94a3b8",
          fontWeight: 700,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: "#f1f5f9",
          fontFamily: "Montserrat, Inter, sans-serif",
          marginTop: 4,
        }}
      >
        {pct}
      </div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{abs}</div>
    </div>
  );
}
