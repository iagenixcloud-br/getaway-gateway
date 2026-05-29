import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface MetricaFunilRow {
  tenant_id: string | null;
  corretor_id: string | null;
  mes: string; // ISO date "YYYY-MM-01"
  leads: number;
  negocios: number;
  agendamentos: number;
  visitas: number;
  propostas: number;
  vendas: number;
  perdas_sem_contato: number;
}

export type PeriodoKey = "mes_atual" | "mes_anterior" | "ultimos_3";

export const PERIODOS: { key: PeriodoKey; label: string }[] = [
  { key: "mes_atual", label: "Mês atual" },
  { key: "mes_anterior", label: "Mês anterior" },
  { key: "ultimos_3", label: "Últimos 3 meses" },
];

/** Retorna lista de strings YYYY-MM-01 representando os meses do período. */
export function getMesesDoPeriodo(key: PeriodoKey): string[] {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-based
  const fmt = (year: number, month: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-01`;

  if (key === "mes_atual") return [fmt(y, m)];
  if (key === "mes_anterior") {
    const d = new Date(Date.UTC(y, m - 1, 1));
    return [fmt(d.getUTCFullYear(), d.getUTCMonth())];
  }
  // últimos 3 meses (inclui o atual)
  const out: string[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m - i, 1));
    out.push(fmt(d.getUTCFullYear(), d.getUTCMonth()));
  }
  return out;
}

interface Args {
  periodo: PeriodoKey;
  corretorId?: string | null; // admin pode filtrar; corretor é restringido por RLS
  enabled?: boolean;
}

export function useMetricasFunil({ periodo, corretorId, enabled = true }: Args) {
  const [rows, setRows] = useState<MetricaFunilRow[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    const meses = getMesesDoPeriodo(periodo);
    (async () => {
      let q = supabase
        .from("metricas_funil")
        .select(
          "tenant_id,corretor_id,mes,leads,negocios,agendamentos,visitas,propostas,vendas,perdas_sem_contato",
        )
        .in("mes", meses);
      if (corretorId) q = q.eq("corretor_id", corretorId);
      const { data, error } = await q;
      if (!mounted) return;
      if (error) setError(error.message);
      setRows((data as MetricaFunilRow[]) ?? []);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [periodo, corretorId, enabled]);

  return { rows, loading, error };
}

export interface FunilTotais {
  leads: number;
  negocios: number;
  agendamentos: number;
  visitas: number;
  propostas: number;
  vendas: number;
  perdas_sem_contato: number;
}

export function somarTotais(rows: MetricaFunilRow[]): FunilTotais {
  return rows.reduce<FunilTotais>(
    (acc, r) => ({
      leads: acc.leads + (r.leads || 0),
      negocios: acc.negocios + (r.negocios || 0),
      agendamentos: acc.agendamentos + (r.agendamentos || 0),
      visitas: acc.visitas + (r.visitas || 0),
      propostas: acc.propostas + (r.propostas || 0),
      vendas: acc.vendas + (r.vendas || 0),
      perdas_sem_contato:
        acc.perdas_sem_contato + (r.perdas_sem_contato || 0),
    }),
    {
      leads: 0,
      negocios: 0,
      agendamentos: 0,
      visitas: 0,
      propostas: 0,
      vendas: 0,
      perdas_sem_contato: 0,
    },
  );
}
