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
              background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
              border: "1px solid var(--gold)",
              boxShadow: "0 0 20px rgba(212, 175, 55, 0.25), inset 0 1px 0 rgba(212, 175, 55, 0.15)",
            }}
          >
            <img
              src={logo}
              alt="Andrade Consultoria Imobiliária"
              className="w-7 h-7"
              style={{ objectFit: "contain", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
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
          {navItem(
            "/",
            "Pipeline de Leads",
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="5" height="18" rx="1" />
              <rect x="10" y="3" width="5" height="12" rx="1" />
              <rect x="17" y="3" width="5" height="15" rx="1" />
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
