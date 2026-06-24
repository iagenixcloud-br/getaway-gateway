import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

interface LeadLogRow {
  id: string;
  created_at: string;
  updated_at: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  interest: string | null;
  origem: string | null;
  tenant_id: string | null;
}

interface ProfileRow {
  id: string;
  name: string | null;
  email: string | null;
}

const STATUS_COLORS: Record<string, { bg: string; border: string; color: string }> = {
  lead_novo: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.4)", color: "#93c5fd" },
  curioso: { bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.4)", color: "#d8b4fe" },
  follow_up: { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.4)", color: "#fcd34d" },
  agendamento: { bg: "rgba(20,184,166,0.12)", border: "rgba(20,184,166,0.4)", color: "#5eead4" },
  negocio: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.4)", color: "#86efac" },
  perda: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.4)", color: "#fca5a5" },
};

const ORIGEM_LABEL: Record<string, string> = {
  trafego_pago: "Tráfego pago",
  manual_indicacao: "Manual/Indicação",
};

export function Logs() {
  const [logs, setLogs] = useState<LeadLogRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "trafego_pago" | "manual_indicacao">("all");

  const fetchLogs = async () => {
    setLoading(true);

    const [{ data: leadsData, error: leadsErr }, { data: profilesData }] = await Promise.all([
      supabase
        .from("leads")
        .select("id,created_at,updated_at,name,phone,email,status,interest,origem,tenant_id")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("profiles").select("id,name,email"),
    ]);

    if (leadsErr) console.error("Erro ao buscar leads:", leadsErr);

    const map: Record<string, ProfileRow> = {};
    (profilesData || []).forEach((p) => {
      map[p.id] = p as ProfileRow;
    });
    setProfiles(map);
    setLogs((leadsData as LeadLogRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();

    // Realtime — qualquer lead novo aparece no topo automaticamente
    const channel = supabase
      .channel("leads-logs-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "leads" },
        (payload) => {
          const newLead = payload.new as LeadLogRow;
          setLogs((prev) => [newLead, ...prev].slice(0, 200));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const visible = useMemo(() => {
    if (filter === "all") return logs;
    return logs.filter((l) => l.origem === filter);
  }, [logs, filter]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-2">
          {(["all", "trafego_pago", "manual_indicacao"] as const).map((f) => {
            const active = filter === f;
            const label =
              f === "all" ? "Todos" : f === "trafego_pago" ? "📢 Tráfego pago" : "✍️ Manual/Indicação";
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: active ? "var(--gold-dim)" : "rgba(255,255,255,0.06)",
                  border: `1px solid ${active ? "var(--gold)" : "var(--glass-border)"}`,
                  color: active ? "var(--gold)" : "var(--text-muted)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <button
          onClick={fetchLogs}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-all ml-auto"
          style={{
            background: "rgba(59,130,246,0.12)",
            border: "1px solid rgba(59,130,246,0.4)",
            color: "#93c5fd",
          }}
        >
          🔄 Atualizar
        </button>

        <div
          className="px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: "var(--gold-dim)", color: "var(--gold)" }}
        >
          {visible.length} lead{visible.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div
        className="px-4 py-3 rounded-xl text-xs"
        style={{
          background: "rgba(59,130,246,0.08)",
          border: "1px solid rgba(59,130,246,0.3)",
          color: "#93c5fd",
        }}
      >
        🔴 Tempo real ativo — todo lead novo que cair (manual ou via webhook do Facebook) aparece aqui automaticamente no topo da lista.
      </div>

      {/* Empty */}
      {!loading && visible.length === 0 && (
        <div
          className="glass rounded-2xl p-12 text-center"
          style={{ border: "1px solid var(--glass-border)" }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <h3
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 700,
              fontSize: 18,
              color: "var(--text-primary)",
            }}
          >
            Nenhum lead encontrado
          </h3>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-40">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }}
          />
        </div>
      )}

      {/* Table */}
      {!loading && visible.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden" style={{ border: "1px solid var(--glass-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr>
                  {["Data/Hora", "Lead", "Telefone", "Origem", "Corretor", "Status", "Interesse"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-semibold"
                      style={{
                        color: "var(--text-muted)",
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        borderBottom: "1px solid var(--glass-border)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((log) => {
                  const s = STATUS_COLORS[log.status || ""] || {
                    bg: "rgba(255,255,255,0.06)",
                    border: "var(--glass-border)",
                    color: "var(--text-muted)",
                  };
                  const corretor = log.tenant_id ? profiles[log.tenant_id] : null;
                  return (
                    <tr
                      key={log.id}
                      style={{ borderBottom: "1px solid var(--glass-border)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td className="px-4 py-3" style={{ color: "var(--text-muted)", whiteSpace: "nowrap", fontSize: 12 }}>
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                        {log.name || "—"}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text-muted)", fontSize: 12, fontFamily: "monospace" }}>
                        {log.phone || "—"}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {log.origem ? ORIGEM_LABEL[log.origem] || log.origem : "—"}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text-muted)", fontSize: 12 }}>
                        {corretor?.name || (log.tenant_id ? "—" : <span style={{ color: "#fcd34d" }}>Não atribuído</span>)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{
                            background: s.bg,
                            color: s.color,
                            border: `1px solid ${s.border}`,
                          }}
                        >
                          {log.status || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--text-muted)", fontSize: 12, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {log.interest || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
