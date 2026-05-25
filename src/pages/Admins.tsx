import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { invokeCloudFunction } from "../lib/cloudFunctions";

interface UserWithRole {
  id: string;
  name: string | null;
  email: string | null;
  isAdmin: boolean;
}

export function Admins() {
  const { isAdmin, isMaster, loading: authLoading, user } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset password (Master only)
  const [resetTarget, setResetTarget] = useState<UserWithRole | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetPwd2, setResetPwd2] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const openReset = (u: UserWithRole) => {
    setResetTarget(u);
    setResetPwd("");
    setResetPwd2("");
    setResetMsg(null);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetMsg(null);
    if (resetPwd.length < 6) {
      setResetMsg({ type: "err", text: "A senha precisa ter pelo menos 6 caracteres." });
      return;
    }
    if (resetPwd !== resetPwd2) {
      setResetMsg({ type: "err", text: "As senhas não coincidem." });
      return;
    }
    setResetting(true);
    const { data, error: err } = await invokeCloudFunction("admin-reset-password", {
      user_id: resetTarget.id,
      new_password: resetPwd,
    });
    setResetting(false);
    if (err) {
      setResetMsg({ type: "err", text: err.message || "Falha ao redefinir senha" });
      return;
    }
    if (data?.error) {
      setResetMsg({ type: "err", text: data.error });
      return;
    }
    setResetMsg({ type: "ok", text: `Senha de ${resetTarget.name || resetTarget.email} redefinida!` });
    setResetPwd("");
    setResetPwd2("");
  };

  const load = async () => {
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, name, email"),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    const adminSet = new Set(
      (roles ?? []).filter((r: any) => r.role === "admin").map((r: any) => r.user_id)
    );

    setUsers(
      (profiles ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        isAdmin: adminSet.has(p.id),
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    load();
  }, [authLoading, isAdmin]);

  if (!authLoading && !isAdmin) return <Navigate to="/" replace />;

  const toggleAdmin = async (userId: string, currentlyAdmin: boolean) => {
    if (userId === user?.id) {
      setError("Você não pode remover seu próprio acesso de admin.");
      return;
    }

    setToggling(userId);
    setError(null);
    setSuccess(null);

    if (currentlyAdmin) {
      const { error: err } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");
      if (err) setError(err.message);
      else setSuccess("Permissão de admin removida.");
    } else {
      const { error: err } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });
      if (err) setError(err.message);
      else setSuccess("Permissão de admin concedida!");
    }

    await load();
    setToggling(null);
  };

  if (loading) {
    return <p style={{ color: "var(--text-muted)" }}>Carregando…</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {error && (
        <div
          className="p-3 rounded-lg"
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid #ef4444",
            color: "#fecaca",
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="p-3 rounded-lg"
          style={{
            background: "rgba(34,197,94,0.15)",
            border: "1px solid #22c55e",
            color: "#bbf7d0",
          }}
        >
          {success}
        </div>
      )}

      <section className="glass rounded-2xl p-6">
        <h2
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 4,
          }}
        >
          Gerenciar Administradores
        </h2>
        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 20,
          }}
        >
          Administradores têm acesso total ao sistema: corretores, roleta,
          desempenho, integração e esta tela.
        </p>

        {users.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            Nenhum usuário cadastrado ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{
                  background: u.isAdmin
                    ? "rgba(212,175,55,0.08)"
                    : "rgba(255,255,255,0.03)",
                  border: `1px solid ${
                    u.isAdmin
                      ? "rgba(212,175,55,0.25)"
                      : "var(--glass-border)"
                  }`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{
                      background: u.isAdmin
                        ? "var(--gold)"
                        : "rgba(255,255,255,0.08)",
                      color: u.isAdmin ? "#0a0a0a" : "var(--text-muted)",
                    }}
                  >
                    {(u.name || u.email || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p
                      style={{
                        color: "var(--text-primary)",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      {u.name || "Sem nome"}
                    </p>
                    <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                      {u.email || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {u.isAdmin && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background: "rgba(212,175,55,0.15)",
                        color: "var(--gold)",
                        border: "1px solid rgba(212,175,55,0.3)",
                      }}
                    >
                      Admin
                    </span>
                  )}

                  {u.id !== user?.id && (
                    <button
                      onClick={() => toggleAdmin(u.id, u.isAdmin)}
                      disabled={toggling === u.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity"
                      style={{
                        background: u.isAdmin
                          ? "rgba(239,68,68,0.15)"
                          : "rgba(34,197,94,0.15)",
                        color: u.isAdmin ? "#fecaca" : "#bbf7d0",
                        border: `1px solid ${
                          u.isAdmin
                            ? "rgba(239,68,68,0.3)"
                            : "rgba(34,197,94,0.3)"
                        }`,
                        opacity: toggling === u.id ? 0.5 : 1,
                      }}
                    >
                      {toggling === u.id
                        ? "…"
                        : u.isAdmin
                        ? "Remover admin"
                        : "Tornar admin"}
                    </button>
                  )}

                  {isMaster && u.id !== user?.id && (
                    <button
                      onClick={() => openReset(u)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{
                        background: "rgba(212,175,55,0.1)",
                        color: "var(--gold)",
                        border: "1px solid rgba(212,175,55,0.3)",
                      }}
                    >
                      Redefinir senha
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Modal Redefinir Senha (Master) ─────────────── */}
      {resetTarget && (
        <div
          onClick={() => !resetting && setResetTarget(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
          }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleResetPassword}
            className="glass rounded-2xl p-6"
            style={{ width: "100%", maxWidth: 440, border: "1px solid rgba(212,175,55,0.3)" }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: "var(--text-primary)" }}>
              Redefinir senha
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
              {resetTarget.name || "Sem nome"} — {resetTarget.email}
            </p>

            <div className="space-y-3">
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Nova senha (mín. 6 caracteres)
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={resetPwd}
                  onChange={(e) => setResetPwd(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--glass-border)", borderRadius: 8,
                    padding: "8px 10px", fontSize: 13, color: "var(--text-primary)",
                    outline: "none", fontFamily: "inherit",
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Confirmar nova senha
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={resetPwd2}
                  onChange={(e) => setResetPwd2(e.target.value)}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--glass-border)", borderRadius: 8,
                    padding: "8px 10px", fontSize: 13, color: "var(--text-primary)",
                    outline: "none", fontFamily: "inherit",
                  }}
                />
              </div>
            </div>

            {resetMsg && (
              <div
                className="rounded-lg px-3 py-2 mt-4"
                style={{
                  background: resetMsg.type === "ok" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                  border: `1px solid ${resetMsg.type === "ok" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                  color: resetMsg.type === "ok" ? "#22c55e" : "#ef4444",
                  fontSize: 12,
                }}
              >
                {resetMsg.text}
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                disabled={resetting}
                style={{
                  flex: 1, background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--glass-border)", color: "var(--text-primary)",
                  fontSize: 13, fontWeight: 600, padding: "10px", borderRadius: 10, cursor: "pointer",
                }}
              >
                Fechar
              </button>
              <button
                type="submit"
                disabled={resetting}
                style={{
                  flex: 1, background: "var(--gold)", border: "none", color: "#0a0a0a",
                  fontSize: 13, fontWeight: 700, padding: "10px", borderRadius: 10,
                  cursor: resetting ? "not-allowed" : "pointer", opacity: resetting ? 0.6 : 1,
                }}
              >
                {resetting ? "Salvando..." : "Redefinir"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
