import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { gerarExtratoPDF, type ExtratoLinha } from "../lib/extratoPdf";

const ALLOWED_EMAIL = "iagenixcloud@gmail.com";
const CRM_LICENSE = 600;
const PER_USER = 50;

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

interface Corretor {
  user_id: string;
  created_at: string;
  name: string | null;
  email: string | null;
  is_active: boolean;
}

export function Assinaturas() {
  const { user, loading: authLoading } = useAuth();
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [mes, setMes] = useState<number>(now.getMonth() + 1); // 1-12
  const [ano, setAno] = useState<number>(now.getFullYear());
  const [extrato, setExtrato] = useState<ExtratoLinha[] | null>(null);
  const [gerando, setGerando] = useState(false);
  const [baixando, setBaixando] = useState(false);

  const anos = useMemo(() => {
    const y = now.getFullYear();
    return [y - 2, y - 1, y, y + 1];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ymd = `${ano}-${String(mes).padStart(2, "0")}-01`;

  const handleGerar = async () => {
    setGerando(true);
    setExtrato(null);
    const { data, error } = await supabase.rpc("extrato_mensal", {
      mes_referencia: ymd,
    });
    setGerando(false);
    if (error) {
      toast.error(`Erro ao gerar extrato: ${error.message}`);
      return;
    }
    const linhas: ExtratoLinha[] = (data ?? []).map((r: any) => ({
      nome: r.nome ?? "—",
      email: r.email ?? "",
      valor: Number(r.valor ?? PER_USER),
    }));
    setExtrato(linhas);
    toast.success(`${linhas.length} corretores encontrados`);
  };

  const handlePDF = async () => {
    if (!extrato) return;
    setBaixando(true);
    try {
      await gerarExtratoPDF({
        mesNome: MESES[mes - 1],
        ano,
        ymd,
        linhas: extrato,
      });
    } catch (e) {
      toast.error(`Erro ao gerar PDF: ${e instanceof Error ? e.message : "desconhecido"}`);
    } finally {
      setBaixando(false);
    }
  };

  useEffect(() => {
    if (!user || user.email !== ALLOWED_EMAIL) return;

    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, created_at")
        .eq("role", "corretor");

      if (!data || data.length === 0) {
        setCorretores([]);
        setLoading(false);
        return;
      }

      const ids = data.map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email, is_active")
        .in("id", ids);

      const profileMap = new Map(
        (profiles ?? []).map((p: any) => [p.id, p])
      );

      const merged: Corretor[] = data
        .map((r: any) => {
          const p = profileMap.get(r.user_id);
          return {
            user_id: r.user_id,
            created_at: r.created_at,
            name: p?.name ?? null,
            email: p?.email ?? null,
            is_active: p?.is_active ?? true,
          };
        })
        .filter((c: any) => c.is_active !== false);

      setCorretores(merged);
      setLoading(false);
    })();
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>
        Carregando...
      </div>
    );
  }

  if (!user || user.email !== ALLOWED_EMAIL) {
    return <Navigate to="/dashboard" replace />;
  }

  const count = corretores.length;
  const licencaUsuarios = count * PER_USER;
  const total = CRM_LICENSE + licencaUsuarios;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR");
  };

  const formatCurrency = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  };

  const cards = [
    { label: "Licença CRM", value: formatCurrency(CRM_LICENSE), sub: "Fixo / mês" },
    { label: "Corretores Ativos", value: String(count), sub: "Usuários com acesso" },
    { label: "Licença por Usuário", value: formatCurrency(licencaUsuarios), sub: `${count} corretores × R$ 50,00` },
    {
      label: "TOTAL DO MÊS",
      value: formatCurrency(total),
      sub: "Licença + usuários",
      highlight: true,
    },
  ];

  const totalUsuariosExtrato = extrato
    ? extrato.reduce((s, l) => s + Number(l.valor), 0)
    : 0;
  const totalGeralExtrato = totalUsuariosExtrato + CRM_LICENSE;

  const selectStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--glass-border)",
    borderRadius: 10,
    color: "var(--text-primary)",
    padding: "10px 12px",
    fontSize: 13,
    minWidth: 120,
    outline: "none",
    appearance: "none",
    cursor: "pointer",
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Extrato Mensal */}
      <div
        className="glass"
        style={{
          padding: "18px 22px",
          borderRadius: 14,
          border: "1px solid var(--glass-border)",
          marginBottom: 20,
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Mês</label>
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} style={selectStyle}>
            {MESES.map((m, i) => (
              <option key={m} value={i + 1} style={{ background: "#111" }}>{m}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Ano</label>
          <select value={ano} onChange={(e) => setAno(Number(e.target.value))} style={selectStyle}>
            {anos.map((y) => (
              <option key={y} value={y} style={{ background: "#111" }}>{y}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleGerar}
          disabled={gerando}
          style={{
            background: "linear-gradient(135deg, var(--gold), #b8960c)",
            color: "#0a0a0a",
            border: "none",
            borderRadius: 10,
            padding: "11px 20px",
            fontSize: 13,
            fontWeight: 700,
            cursor: gerando ? "wait" : "pointer",
            opacity: gerando ? 0.7 : 1,
            minHeight: 42,
          }}
        >
          {gerando ? "Gerando..." : "Gerar extrato"}
        </button>
        <button
          onClick={handlePDF}
          disabled={!extrato || baixando}
          style={{
            background: "transparent",
            color: "var(--text-primary)",
            border: "1px solid var(--glass-border)",
            borderRadius: 10,
            padding: "11px 20px",
            fontSize: 13,
            fontWeight: 600,
            cursor: !extrato || baixando ? "not-allowed" : "pointer",
            opacity: !extrato || baixando ? 0.5 : 1,
            minHeight: 42,
          }}
        >
          {baixando ? "Gerando PDF..." : "Baixar PDF"}
        </button>
      </div>

      {extrato && (
        <div
          className="glass"
          style={{
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid var(--glass-border)",
            marginBottom: 24,
          }}
        >
          <div style={{ padding: "14px 22px", borderBottom: "1px solid var(--glass-border)" }}>
            <h2 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
              Prévia — {MESES[mes - 1]}/{ano}
            </h2>
          </div>
          {extrato.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Nenhum corretor ativo neste período.
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--glass-border)", textAlign: "left" }}>
                      {["Nome", "Email", "Valor"].map((h, i) => (
                        <th key={h} style={{
                          padding: "12px 16px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          textAlign: i === 2 ? "right" : "left",
                          whiteSpace: "nowrap",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {extrato.map((l, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--glass-border)" }}>
                        <td style={{ padding: "10px 16px", fontSize: 13, color: "var(--text-primary)", fontWeight: 500 }}>{l.nome}</td>
                        <td style={{ padding: "10px 16px", fontSize: 13, color: "var(--text-muted)" }}>{l.email || "—"}</td>
                        <td style={{ padding: "10px 16px", fontSize: 13, color: "var(--text-primary)", fontWeight: 600, textAlign: "right", whiteSpace: "nowrap" }}>
                          {formatCurrency(l.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: "16px 22px", borderTop: "1px solid var(--glass-border)", display: "flex", justifyContent: "flex-end" }}>
                <div style={{ minWidth: 280, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)" }}>
                    <span>Licença CRM:</span>
                    <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{formatCurrency(CRM_LICENSE)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text-muted)" }}>
                    <span>Usuários ({extrato.length} × R$ 50,00):</span>
                    <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{formatCurrency(totalUsuariosExtrato)}</span>
                  </div>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 15,
                    paddingTop: 8,
                    marginTop: 4,
                    borderTop: "1px solid var(--glass-border)",
                  }}>
                    <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>Total geral:</span>
                    <span style={{ fontWeight: 700, color: "var(--gold)" }}>{formatCurrency(totalGeralExtrato)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}


      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {cards.map((c, i) => (
          <div
            key={i}
            className="glass"
            style={{
              padding: "20px 24px",
              borderRadius: 14,
              border: c.highlight
                ? "1.5px solid var(--gold)"
                : "1px solid var(--glass-border)",
              boxShadow: c.highlight
                ? "0 0 20px rgba(212,175,55,0.15)"
                : undefined,
            }}
          >
            <p
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              {c.label}
            </p>
            <p
              style={{
                fontSize: 26,
                fontWeight: 700,
                fontFamily: "Montserrat, sans-serif",
                color: c.highlight ? "var(--gold)" : "var(--text-primary)",
              }}
            >
              {loading ? "..." : c.value}
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              {loading ? "" : c.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        className="glass"
        style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--glass-border)" }}
      >
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--glass-border)" }}>
          <h2
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 700,
              fontSize: 15,
              color: "var(--text-primary)",
            }}
          >
            Corretores Assinantes
          </h2>
        </div>

        {loading ? (
          <div
            className="flex items-center justify-center"
            style={{ padding: 48, color: "var(--text-muted)", fontSize: 13 }}
          >
            <svg
              className="animate-spin mr-2"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 11-6.219-8.56" />
            </svg>
            Carregando corretores...
          </div>
        ) : corretores.length === 0 ? (
          <div
            className="flex items-center justify-center"
            style={{ padding: 48, color: "var(--text-muted)", fontSize: 13 }}
          >
            Nenhum corretor encontrado.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--glass-border)",
                    textAlign: "left",
                  }}
                >
                  {["Corretor", "Email", "Membro desde", "Mensalidade", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: "12px 16px",
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {corretores.map((c) => (
                  <tr
                    key={c.user_id}
                    style={{ borderBottom: "1px solid var(--glass-border)" }}
                  >
                    {/* Avatar + Name */}
                    <td style={{ padding: "12px 16px" }}>
                      <div className="flex items-center gap-3">
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: "50%",
                            background:
                              "linear-gradient(135deg, var(--gold), #b8960c)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#0a0a0a",
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(c.name)}
                        </div>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.name ?? "—"}
                        </span>
                      </div>
                    </td>
                    {/* Email */}
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 13,
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.email ?? "—"}
                    </td>
                    {/* Membro desde */}
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 13,
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDate(c.created_at)}
                    </td>
                    {/* Mensalidade */}
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      R$ 50,00
                    </td>
                    {/* Status */}
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "3px 10px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          background: "rgba(34,197,94,0.15)",
                          color: "#22c55e",
                        }}
                      >
                        Ativo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
