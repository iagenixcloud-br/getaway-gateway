import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

interface Corretor {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  is_admin: boolean;
}

export function Corretores() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [list, setList] = useState<Corretor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("id,name,email,phone,created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    if (profilesRes.error) {
      setError(profilesRes.error.message);
      setLoading(false);
      return;
    }
    const adminIds = new Set(
      ((rolesRes.data as { user_id: string; role: string }[]) ?? [])
        .filter((r) => r.role === "admin")
        .map((r) => r.user_id),
    );
    setList(
      (profilesRes.data ?? []).map((p) => ({
        ...(p as Omit<Corretor, "is_admin">),
        is_admin: adminIds.has((p as { id: string }).id),
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    setSubmitting(true);

    // 1) cria conta no auth (signUp). Como admin já está logado, isso não troca a sessão.
    //    OBS: signUp do anon-key cria o usuário e dispara o trigger handle_new_user
    //    que insere em profiles automaticamente.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim(), phone: phone.trim() || null },
        emailRedirectTo: window.location.origin,
      },
    });

    if (signUpError) {
      setSubmitting(false);
      setFormMsg({ type: "err", text: signUpError.message });
      return;
    }

    // 2) atribui role 'corretor'
    if (signUpData.user) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: signUpData.user.id, role: "corretor" });
      if (roleError) {
        setSubmitting(false);
        setFormMsg({ type: "err", text: `Conta criada, mas falhou ao atribuir role: ${roleError.message}` });
        return;
      }
    }

    setSubmitting(false);
    setFormMsg({ type: "ok", text: `Corretor ${name} cadastrado!` });
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setShowForm(false);
    load();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--glass-border)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 13,
    color: "var(--text-primary)",
    outline: "none",
    fontFamily: "inherit",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 22, color: "var(--text-primary)" }}>
            Corretores
          </h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Gerencie acessos da equipe
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl"
          style={{
            background: showForm ? "rgba(255,255,255,0.05)" : "var(--gold)",
            color: showForm ? "var(--text-primary)" : "#0a0a0a",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            border: showForm ? "1px solid var(--glass-border)" : "none",
          }}
        >
          {showForm ? "Cancelar" : "+ Novo corretor"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="glass rounded-2xl p-6 mb-6"
          style={{ border: "1px solid rgba(212,175,55,0.2)" }}
        >
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "var(--text-primary)" }}>
            Cadastrar novo corretor
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                Nome
              </label>
              <input style={inputStyle} required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                Email
              </label>
              <input
                style={inputStyle}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                Telefone
              </label>
              <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="col-span-2">
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                Senha provisória (mín. 6 caracteres)
              </label>
              <input
                style={inputStyle}
                type="text"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="O corretor poderá trocar depois"
              />
            </div>
          </div>

          {formMsg && (
            <div
              className="rounded-lg px-3 py-2 mt-4"
              style={{
                background: formMsg.type === "ok" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${formMsg.type === "ok" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                color: formMsg.type === "ok" ? "#22c55e" : "#ef4444",
                fontSize: 12,
              }}
            >
              {formMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 w-full py-2.5 rounded-xl"
            style={{
              background: "var(--gold)",
              color: "#0a0a0a",
              fontSize: 13,
              fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
              border: "none",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Criando..." : "Criar corretor"}
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando...</p>
      ) : error ? (
        <p style={{ fontSize: 13, color: "#ef4444" }}>{error}</p>
      ) : (
        <div className="glass rounded-2xl overflow-hidden" style={{ border: "1px solid var(--glass-border)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
                  Nome
                </th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
                  Email
                </th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
                  Telefone
                </th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
                  Perfil
                </th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
                    Nenhum corretor cadastrado.
                  </td>
                </tr>
              ) : (
                list.map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid var(--glass-border)" }}>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
                      {c.name}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted)" }}>{c.email}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted)" }}>
                      {c.phone || "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        className="badge"
                        style={{
                          background: c.is_admin ? "rgba(212,175,55,0.15)" : "rgba(59,130,246,0.15)",
                          color: c.is_admin ? "var(--gold)" : "#3b82f6",
                        }}
                      >
                        {c.is_admin ? "Admin" : "Corretor"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
