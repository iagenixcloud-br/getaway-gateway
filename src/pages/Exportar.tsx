import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useCorretores } from "../hooks/useCorretores";

interface LeadRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: string | null;
  substatus: string | null;
  city: string | null;
  interest: string | null;
  created_at: string;
  tenant_id: string | null;
  arquivado: boolean;
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "lead_novo", label: "Lead Novo" },
  { value: "negocio", label: "Negócio" },
  { value: "agendamento", label: "Agendamento" },
  { value: "visita", label: "Visita" },
  { value: "proposta", label: "Proposta" },
  { value: "venda", label: "Venda" },
  { value: "perda", label: "Perda" },
  { value: "cliente_futuro", label: "Cliente Futuro" },
  { value: "curioso", label: "Curioso" },
  { value: "follow_up", label: "Follow-up" },
];

type Periodo = "90d" | "mes" | "trimestre" | "semestre" | "ano";

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: "90d", label: "Últimos 90 dias" },
  { value: "mes", label: "Último mês" },
  { value: "trimestre", label: "Último trimestre" },
  { value: "semestre", label: "Último semestre" },
  { value: "ano", label: "Último ano" },
];

const periodoToDate = (p: Periodo): string => {
  const d = new Date();
  switch (p) {
    case "mes":
      d.setMonth(d.getMonth() - 1);
      break;
    case "trimestre":
      d.setMonth(d.getMonth() - 3);
      break;
    case "semestre":
      d.setMonth(d.getMonth() - 6);
      break;
    case "ano":
      d.setFullYear(d.getFullYear() - 1);
      break;
    case "90d":
    default:
      d.setDate(d.getDate() - 90);
  }
  return d.toISOString();
};

const statusLabel = (s: string | null) =>
  STATUS_OPTIONS.find((o) => o.value === s)?.label || s || "—";

const csvEscape = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function Exportar() {
  const { user } = useAuth();
  const { corretores } = useCorretores();

  const [statusSel, setStatusSel] = useState<string[]>(["venda", "cliente_futuro"]);
  const [corretorSel, setCorretorSel] = useState<string>("");
  const [periodo, setPeriodo] = useState<Periodo>("90d");
  const [incluirArquivados, setIncluirArquivados] = useState(false);
  const [showArquivadoCol, setShowArquivadoCol] = useState(false);

  const [rows, setRows] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [showModal, setShowModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [archiving, setArchiving] = useState(false);

  const corretorNome = useMemo(() => {
    const m = new Map<string, string>();
    corretores.forEach((c) => m.set(c.id, c.name || c.email));
    return m;
  }, [corretores]);

  const fetchLeads = async () => {
    setLoading(true);
    setSelected(new Set());
    let q = supabase
      .from("leads")
      .select("id,name,phone,email,status,substatus,city,interest,created_at,tenant_id")
      .eq("arquivado", false)
      .gte("created_at", periodoToDate(periodo))
      .order("created_at", { ascending: false })
      .limit(1000);

    if (statusSel.length > 0) q = q.in("status", statusSel);
    if (corretorSel) q = q.eq("tenant_id", corretorSel);

    const { data, error } = await q;
    if (error) {
      toast.error(`Erro ao buscar leads: ${error.message}`);
      setRows([]);
    } else {
      setRows((data as LeadRow[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleStatus = (v: string) => {
    setStatusSel((prev) =>
      prev.includes(v) ? prev.filter((s) => s !== v) : [...prev, v],
    );
  };

  const breakdown = useMemo(() => {
    let vendas = 0,
      futuros = 0,
      outros = 0;
    rows.forEach((r) => {
      if (r.status === "venda") vendas++;
      else if (r.status === "cliente_futuro") futuros++;
      else outros++;
    });
    return { vendas, futuros, outros };
  }, [rows]);

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const exportCsv = () => {
    const source = selected.size > 0 ? rows.filter((r) => selected.has(r.id)) : rows;
    if (source.length === 0) {
      toast.error("Nenhum lead para exportar");
      return;
    }
    const headers = [
      "Nome",
      "Telefone",
      "Email",
      "Status",
      "Substatus",
      "Corretor",
      "Data entrada",
      "Cidade",
      "Interesse",
    ];
    const lines = [headers.join(",")];
    source.forEach((r) => {
      lines.push(
        [
          r.name,
          r.phone,
          r.email ?? "",
          statusLabel(r.status),
          r.substatus ?? "",
          r.tenant_id ? corretorNome.get(r.tenant_id) ?? "" : "",
          new Date(r.created_at).toLocaleString("pt-BR"),
          r.city ?? "",
          r.interest ?? "",
        ]
          .map(csvEscape)
          .join(","),
      );
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${source.length} leads exportados`);
  };

  const openArchiveModal = () => {
    if (selected.size === 0) {
      toast.error("Selecione ao menos um lead");
      return;
    }
    setConfirmText("");
    setShowModal(true);
  };

  const doArchive = async () => {
    if (confirmText !== "ARQUIVAR" || !user) return;
    setArchiving(true);
    const ids = Array.from(selected);
    const { error } = await supabase
      .from("leads")
      .update({ arquivado: true })
      .in("id", ids)
      .eq("tenant_id", user.id);

    setArchiving(false);
    if (error) {
      toast.error(`Falha ao arquivar: ${error.message}`);
      return;
    }
    toast.success(`${ids.length} leads arquivados com sucesso`);
    setShowModal(false);
    setConfirmText("");
    fetchLeads();
  };

  const inputStyle: React.CSSProperties = {
    background: "#0d1b2a",
    border: "0.5px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    color: "#fff",
    padding: "8px 12px",
    fontSize: 13,
    fontFamily: "Inter, sans-serif",
  };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", color: "#fff" }} className="p-3 sm:p-6">
      <div style={{ marginBottom: 20 }}>
        <h1 className="text-xl sm:text-2xl" style={{ fontWeight: 700, marginBottom: 4 }}>
          Exportar & Arquivar
        </h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
          Gerencie, exporte e arquive leads
        </p>
      </div>

      {/* Filtros */}
      <div
        className="p-4 sm:p-4 mb-4"
        style={{
          background: "#112236",
          border: "0.5px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 md:items-end">
          <div>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
              Status
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {STATUS_OPTIONS.map((o) => {
                const active = statusSel.includes(o.value);
                return (
                  <button
                    key={o.value}
                    onClick={() => toggleStatus(o.value)}
                    style={{
                      ...inputStyle,
                      padding: "6px 10px",
                      fontSize: 11,
                      background: active ? "#185FA5" : "#0d1b2a",
                      borderColor: active ? "#185FA5" : "rgba(255,255,255,0.12)",
                      cursor: "pointer",
                      minHeight: 32,
                    }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
              Corretor
            </label>
            <select
              value={corretorSel}
              onChange={(e) => setCorretorSel(e.target.value)}
              style={{ ...inputStyle, width: "100%" }}
            >
              <option value="">Todos</option>
              {corretores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
              Período
            </label>
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as Periodo)}
              style={{ ...inputStyle, width: "100%" }}
            >
              {PERIODOS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchLeads}
            disabled={loading}
            className="w-full md:w-auto"
            style={{
              background: "#185FA5",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              whiteSpace: "nowrap",
              minHeight: 44,
            }}
          >
            {loading ? "Buscando..." : "Aplicar filtros"}
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div
        style={{
          background: "#112236",
          border: "0.5px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {loading ? (
              <span className="animate-pulse" style={{ display: "inline-block", width: 200, height: 24, background: "#0d1b2a", borderRadius: 4 }} />
            ) : (
              `${rows.length} leads encontrados com os filtros selecionados`
            )}
          </div>
          {!loading && (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>
              {breakdown.vendas} Vendas | {breakdown.futuros} Cliente Futuro | {breakdown.outros} Outros
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            onClick={exportCsv}
            disabled={loading || rows.length === 0}
            className="w-full sm:w-auto"
            style={{
              background: "#185FA5",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              opacity: loading || rows.length === 0 ? 0.5 : 1,
              minHeight: 44,
            }}
          >
            Exportar CSV{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>
          <button
            onClick={openArchiveModal}
            disabled={loading || selected.size === 0}
            className="w-full sm:w-auto"
            style={{
              background: "#D85A30",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              opacity: loading || selected.size === 0 ? 0.5 : 1,
              minHeight: 44,
            }}
          >
            Arquivar{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse" style={{ background: "#112236", borderRadius: 12, height: 88 }} />
          ))
        ) : rows.length === 0 ? (
          <div style={{ background: "#112236", borderRadius: 12, padding: 32, textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 13 }}>
            Nenhum lead encontrado.
          </div>
        ) : (
          rows.map((r) => (
            <label
              key={r.id}
              className="flex items-start gap-3 p-3"
              style={{
                background: "#112236",
                border: `1px solid ${selected.has(r.id) ? "#185FA5" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 12,
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(r.id)}
                onChange={() => toggleOne(r.id)}
                style={{ marginTop: 4, width: 18, height: 18 }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate" style={{ fontSize: 14, fontWeight: 700 }}>{r.name}</p>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "rgba(24,95,165,0.2)", color: "#7eb6ff", whiteSpace: "nowrap" }}>
                    {statusLabel(r.status)}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{r.phone}</p>
                {r.substatus && (
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Substatus: {r.substatus}</p>
                )}
                <div className="flex items-center justify-between gap-2 mt-1">
                  <span className="truncate" style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
                    {r.tenant_id ? corretorNome.get(r.tenant_id) ?? "—" : "—"}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            </label>
          ))
        )}
      </div>

      {/* Desktop Tabela */}
      <div
        className="hidden md:block"
        style={{
          background: "#112236",
          border: "0.5px solid rgba(255,255,255,0.08)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#0d1b2a" }}>
                <th style={{ padding: 12, textAlign: "left", width: 40 }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={rows.length === 0}
                  />
                </th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Nome</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Telefone</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Status</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Substatus</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Corretor</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} style={{ padding: 12 }}>
                        <div
                          className="animate-pulse"
                          style={{ height: 14, background: "#0d1b2a", borderRadius: 4 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
                    Nenhum lead encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
                    <td style={{ padding: 12 }}>
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleOne(r.id)}
                      />
                    </td>
                    <td style={{ padding: 12 }}>{r.name}</td>
                    <td style={{ padding: 12, color: "rgba(255,255,255,0.7)" }}>{r.phone}</td>
                    <td style={{ padding: 12 }}>{statusLabel(r.status)}</td>
                    <td style={{ padding: 12, color: "rgba(255,255,255,0.7)" }}>{r.substatus || "—"}</td>
                    <td style={{ padding: 12, color: "rgba(255,255,255,0.7)" }}>
                      {r.tenant_id ? corretorNome.get(r.tenant_id) ?? "—" : "—"}
                    </td>
                    <td style={{ padding: 12, color: "rgba(255,255,255,0.7)" }}>
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          onClick={() => !archiving && setShowModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#112236",
              border: "0.5px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: 24,
              maxWidth: 480,
              width: "90%",
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: "#D85A30" }}>
              Confirmar arquivamento
            </h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, marginBottom: 16 }}>
              Você está prestes a arquivar <strong>{selected.size} leads</strong>.
              Eles serão removidos do pipeline e da lista de leads, mas o histórico de métricas
              será preservado. Esta ação não pode ser desfeita facilmente.
            </p>
            <p style={{ fontSize: 13, marginBottom: 8 }}>
              Digite <strong>ARQUIVAR</strong> para confirmar.
            </p>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="ARQUIVAR"
              style={{ ...inputStyle, width: "100%", marginBottom: 16 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                onClick={() => setShowModal(false)}
                disabled={archiving}
                style={{
                  background: "transparent",
                  color: "#fff",
                  border: "0.5px solid rgba(255,255,255,0.2)",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={doArchive}
                disabled={confirmText !== "ARQUIVAR" || archiving}
                style={{
                  background: "#D85A30",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: confirmText === "ARQUIVAR" && !archiving ? "pointer" : "not-allowed",
                  opacity: confirmText === "ARQUIVAR" && !archiving ? 1 : 0.5,
                }}
              >
                {archiving ? "Arquivando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
