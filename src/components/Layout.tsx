import React, { useState, useEffect } from "react";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

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

  const pageTitle =
    location.pathname === "/corretores"
      ? { title: "Corretores", subtitle: "Gestão de equipe e acessos" }
      : location.pathname === "/desempenho"
      ? { title: "Desempenho", subtitle: "Métricas e indicadores do pipeline" }
      : location.pathname === "/roleta"
      ? { title: "Roleta de Leads", subtitle: "Distribuição automática round-robin" }
      : location.pathname === "/integracao"
      ? { title: "Integração Facebook", subtitle: "Configure o token de acesso da página" }
      : location.pathname === "/dashboard"
      ? { title: "Dashboard", subtitle: "Visão geral do pipeline em tempo real" }
      : location.pathname === "/leads"
      ? { title: "Lista de Leads", subtitle: "Busque, filtre e ordene todos os leads" }
      : location.pathname === "/admins"
      ? { title: "Administradores", subtitle: "Gerencie quem tem acesso total ao sistema" }
      : { title: "Pipeline de Leads", subtitle: "Gerencie seus leads em tempo real" };

  const sidebarContent = (
    <>
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
        {/* Close button - mobile only */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="ml-auto lg:hidden w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
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
            "/integracao",
            "Integração Facebook",
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
            </svg>,
          )}

        {isAdmin &&
          navItem(
            "/admins",
            "Administradores",
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
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
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--navy)" }}>
      {/* ── Mobile Overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: "rgba(0, 10, 25, 0.7)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar (desktop: static, mobile: slide-over) ── */}
      <aside
        className={`
          flex flex-col h-full flex-shrink-0 z-50
          fixed lg:static inset-y-0 left-0
          w-64
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{
          background: "rgba(0,0,0,0.3)",
          borderRight: "1px solid var(--glass-border)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {sidebarContent}
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        <header
          className="flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.15)" }}
        >
          <div className="flex items-center gap-3">
            {/* Hamburger - mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.06)", color: "var(--gold)" }}
              aria-label="Abrir menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-base sm:text-lg" style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, color: "var(--text-primary)" }}>
                {pageTitle.title}
              </h1>
              <p className="hidden sm:block" style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{pageTitle.subtitle}</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-3 sm:p-6 lg:p-8 bg-pattern">{children}</div>
      </main>
    </div>
  );
}
