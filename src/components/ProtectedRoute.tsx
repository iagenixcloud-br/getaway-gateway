import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireMaster?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, requireMaster = false }: Props) {
  const { session, loading, isAdmin, isMaster } = useAuth();

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: "var(--navy)", color: "var(--text-muted)", fontSize: 13 }}
      >
        Carregando...
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  if (requireMaster && !isMaster) return <Navigate to="/" replace />;
  if (requireAdmin && !isAdmin && !isMaster) return <Navigate to="/" replace />;

  return <>{children}</>;
}
