import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "@/assets/andrade-mark.png";

export function Login() {
  const { signIn, session, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (session) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) setErr(error);
    else navigate("/");
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen p-6"
      style={{ background: "var(--navy)" }}
    >
      <div
        className="glass rounded-2xl p-8 w-full"
        style={{ maxWidth: 420, border: "1px solid rgba(212,175,55,0.2)" }}
      >
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center gold-glow flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
              border: "1px solid var(--gold)",
              boxShadow: "0 0 30px rgba(212, 175, 55, 0.35), inset 0 1px 0 rgba(212, 175, 55, 0.2)",
            }}
          >
            <img
              src={logo}
              alt="Andrade Consultoria Imobiliária"
              className="w-10 h-10"
              style={{ objectFit: "contain", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}
            />
          </div>
          <div>
            <h1 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 18, color: "var(--gold)" }}>
              Andrade
            </h1>
            <p style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Imobiliária Elite
            </p>
          </div>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: "var(--text-primary)" }}>
          Entrar
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
          Acesse seu painel de leads
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--glass-border)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 13,
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--glass-border)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 13,
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
          </div>

          {err && (
            <div
              className="rounded-lg px-3 py-2"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#ef4444",
                fontSize: 12,
              }}
            >
              {err === "Invalid login credentials" ? "Email ou senha inválidos" : err}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl"
            style={{
              background: "var(--gold)",
              color: "#0a0a0a",
              fontSize: 14,
              fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
              border: "none",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 16, textAlign: "center" }}>
          O acesso é criado pelo administrador.
        </p>
      </div>
    </div>
  );
}
