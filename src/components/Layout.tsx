import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
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
            className="w-10 h-10 rounded-xl flex items-center justify-center gold-glow"
            style={{ background: "linear-gradient(135deg, #D4AF37, #b8960c)" }}
          >
            <span
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 800,
                fontSize: 14,
                color: "#001f3f",
              }}
            >
              A
            </span>
          </div>
          <div>
            <p
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 700,
                fontSize: 13,
                color: "var(--gold)",
                lineHeight: 1.2,
              }}
            >
              Andrade
            </p>
            <p
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Imobiliária Elite
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              padding: "8px 12px 6px",
            }}
          >
            Menu Principal
          </p>
          <button className="sidebar-link w-full active">
            <span className="w-5 h-5 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="5" height="18" rx="1" />
                <rect x="10" y="3" width="5" height="12" rx="1" />
                <rect x="17" y="3" width="5" height="15" rx="1" />
              </svg>
            </span>
            <span>Pipeline de Leads</span>
          </button>

          <div style={{ borderTop: "1px solid var(--glass-border)", marginTop: 16, paddingTop: 16 }}>
            <p
              style={{
                fontSize: 10,
                color: "var(--text-muted)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                padding: "0 12px 6px",
              }}
            >
              Sistema
            </p>
            <button className="sidebar-link w-full">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41-1.41M20 12h2M2 12H0M19.07 19.07l-1.41-1.41M5.34 5.34L3.93 3.93M12 20v2M12 2V0" />
              </svg>
              Configurações
            </button>
            <button className="sidebar-link w-full">
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
            src="https://i.pravatar.cc/150?img=51"
            alt="Profile"
            className="w-9 h-9 rounded-full"
            style={{ border: "2px solid var(--gold)", objectFit: "cover" }}
          />
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Rafael Andrade</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Administrador</p>
          </div>
          <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: "var(--success)" }} />
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────── */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Top Bar */}
        <header
          className="flex items-center justify-between px-8 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--glass-border)", background: "rgba(0,0,0,0.15)" }}
        >
          <div>
            <h1
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 700,
                fontSize: 20,
                color: "var(--text-primary)",
              }}
            >
              Pipeline de Leads
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Gerencie seus leads em tempo real
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ color: "var(--text-muted)" }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                placeholder="Buscar..."
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 13,
                  color: "var(--text-primary)",
                  width: 160,
                }}
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8 bg-pattern">{children}</div>
      </main>
    </div>
  );
}
