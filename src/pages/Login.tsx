import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import logo from "@/assets/andrade-mark.png";

export function Login() {
  const { signIn, session, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
              background: "linear-gradient(135deg, #e8c84a 0%, #D4AF37 50%, #b8960c 100%)",
              boxShadow: "0 6px 20px rgba(212, 175, 55, 0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
            }}
          >
            <img
              src={logo}
              alt="Andrade Consultoria Imobiliária"
              className="w-12 h-12"
              style={{ objectFit: "contain" }}
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
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: 8,
                  padding: "10px 40px 10px 12px",
                  fontSize: 13,
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
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
