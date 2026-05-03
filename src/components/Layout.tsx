import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "@/assets/andrade-mark.png";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { profile, isAdmin, signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const displayName = profile?.name || user?.email?.split("@")[0] || "Usuário";
  const avatarSeed = encodeURIComponent(displayName);

  const navItem = (to: string, label: string, icon: React.ReactNode) => {
    const active = location.pathname === to;
    return (
      <Link to={to} className={`sidebar-link w-full ${active ? "active" : ""}`}>
        <span className="w-5 h-5 flex items-center justify-center">{icon}</span>
        <span>{label}</span>
      </Link>
    );
  };

  // Título do header conforme rota
  const pageTitle =
    location.pathname === "/corretores"
      ? { title: "Corretores", subtitle: "Gestão de equipe e acessos" }
      : location.pathname === "/desempenho"
      ? { title: "Desempenho", subtitle: "Métricas e indicadores do pipeline" }
      : location.pathname === "/roleta"
      ? { title: "Roleta de Leads", subtitle: "Distribuição automática round-robin" }
      : location.pathname === "/relatorios"
      ? { title: "Relatórios WhatsApp", subtitle: "Envio diário do resumo do pipeline" }
      : location.pathname === "/integracao"
      ? { title: "Integração Facebook", subtitle: "Configure o token de acesso da página" }
      : location.pathname === "/dashboard"
      ? { title: "Dashboard", subtitle: "Visão geral do pipeline em tempo real" }
      : location.pathname === "/leads"
      ? { title: "Lista de Leads", subtitle: "Busque, filtre e ordene todos os leads" }
      : { title: "Pipeline de Leads", subtitle: "Gerencie seus leads em tempo real" };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--navy)" }}>
      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside
        className="flex flex-col w-64 h-full flex-shrink-0"
        style={{
          background: "rgba(0,0,0,0.3)",
          borderRight: "1px solid var(--glass-border)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-3 px-6 py-6"
          style={{ borderBottom: "1px solid var(--glass-border)" }}
        >
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center gold-glow flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #e8c84a 0%, #D4AF37 50%, #b8960c 100%)",
              boxShadow: "0 4px 14px rgba(212, 175, 55, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)",
            }}
          >
            <img
              src={logo}
              alt="Andrade Consultoria Imobiliária"
              className="w-8 h-8"
              style={{ objectFit: "contain" }}
            />
          </div>
          <div>
            <p style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 13, color: "var(--gold)", lineHeight: 1.2 }}>
              Andrade
            </p>
            <p style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Imobiliária Elite
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.15em", textTransform: "uppercase", padding: "8px 12px 6px" }}>
            Menu Principal
          </p>
          {isAdmin &&
            navItem(
              "/dashboard",
              "Dashboard",
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>,
            )}
          {navItem(
            "/",
            "Pipeline de Leads",
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="5" height="18" rx="1" />
              <rect x="10" y="3" width="5" height="12" rx="1" />
              <rect x="17" y="3" width="5" height="15" rx="1" />
            </svg>,
          )}
          {navItem(
            "/leads",
            "Lista de Leads",
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>,
          )}

          {isAdmin &&
            navItem(
              "/corretores",
              "Corretores",
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>,
            )}

          {isAdmin &&
            navItem(
              "/desempenho",
              "Desempenho",
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3v18h18" />
                <path d="M7 14l4-4 4 4 5-5" />
              </svg>,
            )}

          {isAdmin &&
            navItem(
              "/roleta",
              "Roleta de Leads",
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3v9l6 3" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>,
            )}

          {isAdmin &&
            navItem(
              "/relatorios",
              "Relatórios WhatsApp",
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
              </svg>,
            )}

          {isAdmin &&
            navItem(
              "/integracao",
              "Integração Facebook",
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
              </svg>,
            )}

          <div style={{ borderTop: "1px solid var(--glass-border)", marginTop: 16, paddingTop: 16 }}>
            <p style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.15em", textTransform: "uppercase", padding: "0 12px 6px" }}>
              Sistema
            </p>
            <button onClick={handleLogout} className="sidebar-link w-full">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sair
            </button>
          </div>
        </nav>

        {/* User Profile */}
        <div className="flex items-center gap-3 px-4 py-4 mx-3 mb-4 rounded-xl glass">
          <img
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${avatarSeed}&backgroundColor=D4AF37&textColor=0a0a0a`}
            alt="Profile"
            className="w-9 h-9 rounded-full"
            style={{ border: "2px solid var(--gold)", objectFit: "cover" }}
          />
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayName}
            </p>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{isAdmin ? "Administrador" : "Corretor"}</p>
          </div>
          <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: "var(--success)" }} />
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────── */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <header
          className="flex items-center justify-between px-8 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.15)" }}
        >
          <div>
            <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 20, color: "var(--text-primary)" }}>
              {pageTitle.title}
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{pageTitle.subtitle}</p>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 bg-pattern">{children}</div>
      </main>
    </div>
  );
}
