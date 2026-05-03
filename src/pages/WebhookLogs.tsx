import React, { useEffect, useState } from "react";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";

interface WebhookLog {
  id: string;
  created_at: string;
  event_type: string;
  page_id: string | null;
  leadgen_id: string | null;
  form_id: string | null;
  status: string;
  error_message: string | null;
  payload: Record<string, unknown> | null;
  lead_id: string | null;
}

const STATUS_STYLES: Record<string, { bg: string; border: string; color: string }> = {
  success: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.4)", color: "#86efac" },
  error: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.4)", color: "#fca5a5" },
  received: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.4)", color: "#93c5fd" },
};

export function WebhookLogs() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "success" | "error">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    let query = cloudSupabase
      .from("webhook_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching webhook logs:", error);
    }
    setLogs((data as WebhookLog[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();

    // Realtime para novos logs
    const channel = cloudSupabase
      .channel("webhook-logs-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "webhook_logs" },
        (payload) => {
          const newLog = payload.new as WebhookLog;
          if (filter === "all" || newLog.status === filter) {
            setLogs((prev) => [newLog, ...prev].slice(0, 100));
          }
        },
      )
      .subscribe();

    return () => {
      cloudSupabase.removeChannel(channel);
    };
  }, [filter]);

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

  const getPayloadSummary = (log: WebhookLog): string => {
    if (!log.payload) return "—";
    const p = log.payload as Record<string, unknown>;
    const fields = p.fields as Record<string, string> | undefined;
    if (fields?.name) {
      const parts = [fields.name];
      if (fields.phone) parts.push(fields.phone);
      if (fields.email) parts.push(fields.email);
      return parts.join(" · ");
    }
    return JSON.stringify(p).slice(0, 80) + "…";
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-2">
          {(["all", "success", "error"] as const).map((f) => {
            const active = filter === f;
            const label = f === "all" ? "Todos" : f === "success" ? "✅ Sucesso" : "❌ Erro";
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
          {logs.length} log{logs.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Empty state */}
      {!loading && logs.length === 0 && (
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
            Nenhum log encontrado
          </h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>
            Quando um lead real for enviado pelo Facebook, os logs aparecerão aqui em tempo real.
          </p>
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

      {/* Logs table */}
      {!loading && logs.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden" style={{ border: "1px solid var(--glass-border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr>
                  {["Data/Hora", "Evento", "Form ID", "Lead ID", "Status", "Resumo"].map((h) => (
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
                {logs.map((log) => {
                  const s = STATUS_STYLES[log.status] || STATUS_STYLES.received;
                  const expanded = expandedId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        className="transition-colors cursor-pointer"
                        style={{ borderBottom: "1px solid var(--glass-border)" }}
                        onClick={() => setExpandedId(expanded ? null : log.id)}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td className="px-4 py-3" style={{ color: "var(--text-muted)", whiteSpace: "nowrap", fontSize: 12 }}>
                          {formatDate(log.created_at)}
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                          {log.event_type}
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--text-muted)", fontSize: 11, fontFamily: "monospace" }}>
                          {log.form_id || "—"}
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--text-muted)", fontSize: 11, fontFamily: "monospace" }}>
                          {log.lead_id ? log.lead_id.slice(0, 8) + "…" : "—"}
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
                            {log.status === "success" ? "Sucesso" : log.status === "error" ? "Erro" : log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--text-muted)", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {log.error_message || getPayloadSummary(log)}
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={6} className="px-4 py-4" style={{ background: "rgba(0,0,0,0.3)" }}>
                            <div className="space-y-2">
                              {log.error_message && (
                                <div>
                                  <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Erro: </span>
                                  <span style={{ color: "#fca5a5", fontSize: 13 }}>{log.error_message}</span>
                                </div>
                              )}
                              <div>
                                <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Page ID: </span>
                                <span style={{ color: "var(--text-primary)", fontSize: 13, fontFamily: "monospace" }}>{log.page_id || "—"}</span>
                              </div>
                              <div>
                                <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Leadgen ID: </span>
                                <span style={{ color: "var(--text-primary)", fontSize: 13, fontFamily: "monospace" }}>{log.leadgen_id || "—"}</span>
                              </div>
                              {log.payload && (
                                <div>
                                  <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>Payload: </span>
                                  <pre
                                    className="mt-1 p-3 rounded-lg overflow-auto"
                                    style={{
                                      background: "rgba(0,0,0,0.4)",
                                      color: "var(--text-muted)",
                                      fontSize: 11,
                                      maxHeight: 200,
                                      fontFamily: "monospace",
                                    }}
                                  >
                                    {JSON.stringify(log.payload, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
