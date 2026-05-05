import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { invokeCloudFunction } from "../lib/cloudFunctions";

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function toWhatsappJid(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (!digits.startsWith("55")) digits = `55${digits}`;
  return `${digits}@s.whatsapp.net`;
}

/** Pega só os dígitos BR (sem 55) a partir de um valor armazenado (JID, número cru, com máscara, etc.) */
function extractBrDigits(value: string | null | undefined): string {
  if (!value) return "";
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  return digits.slice(0, 11);
}

/** Formata para exibição: (DD) NNNNN-NNNN */
function formatPhoneDisplay(value: string | null | undefined): string {
  const digits = extractBrDigits(value);
  if (!digits) return "—";
  return maskPhone(digits);
}

interface Corretor {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
  is_admin: boolean;
  is_active: boolean;
}

export function Corretores() {
  const { isAdmin, loading: authLoading, user } = useAuth();
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

  // Edit modal
  const [editing, setEditing] = useState<Corretor | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editMsg, setEditMsg] = useState<string | null>(null);

  // Toggle active
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<Corretor | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("id,name,email,phone,created_at,is_active").order("created_at", { ascending: false }),
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
        ...(p as Omit<Corretor, "is_admin" | "is_active">),
        is_admin: adminIds.has((p as { id: string }).id),
        is_active: (p as { is_active?: boolean }).is_active !== false,
      })),
    );
    setLoading(false);
  };

  const handleToggleActive = async (c: Corretor) => {
    setTogglingId(c.id);
    const newActive = !c.is_active;
    const { error } = await invokeCloudFunction("toggle-corretor-active", {
      corretor_id: c.id, is_active: newActive,
    });
    setTogglingId(null);
    if (!error) load();
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (authLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);

    const phoneTrimmed = phone.trim();
    if (phoneTrimmed) {
      const digits = phoneTrimmed.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 11) {
        setFormMsg({ type: "err", text: "Telefone incompleto. Use (DD) NNNNN-NNNN" });
        return;
      }
    }

    setSubmitting(true);

    const normalizedPhone = phoneTrimmed ? toWhatsappJid(phoneTrimmed) : null;

    // Chama a Edge Function 'create-corretor' que roda no servidor com service_role.
    // Isso NÃO troca a sessão do admin atual.
    const { data, error } = await invokeCloudFunction("create-corretor", {
      name: name.trim(),
      email: email.trim(),
      password,
      phone: normalizedPhone,
    });

    setSubmitting(false);

    if (error) {
      // Tenta extrair mensagem do corpo da resposta de erro
      const ctx = (error as { context?: { error?: string } }).context;
      const msg = ctx?.error || error.message || "Falha ao cadastrar corretor";
      setFormMsg({ type: "err", text: msg });
      return;
    }

    if (data?.error) {
      setFormMsg({ type: "err", text: data.error });
      return;
    }

    setFormMsg({ type: "ok", text: `Corretor ${name} cadastrado!` });
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setShowForm(false);
    load();
  };

  const openEdit = (c: Corretor) => {
    setEditing(c);
    setEditName(c.name);
    setEditPhone(maskPhone(extractBrDigits(c.phone)));
    setEditMsg(null);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setEditMsg(null);

    const phoneTrimmed = editPhone.trim();
    if (phoneTrimmed) {
      const digits = phoneTrimmed.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 11) {
        setEditMsg("Telefone incompleto. Use (DD) NNNNN-NNNN");
        return;
      }
    }

    setEditSubmitting(true);
    const normalizedPhone = phoneTrimmed ? toWhatsappJid(phoneTrimmed) : null;

    const { data, error } = await invokeCloudFunction("update-corretor", {
      user_id: editing.id, name: editName.trim(), phone: normalizedPhone,
    });
    setEditSubmitting(false);

    if (error) {
      const ctx = (error as { context?: { error?: string } }).context;
      setEditMsg(ctx?.error || error.message || "Falha ao atualizar");
      return;
    }
    if (data?.error) {
      setEditMsg(data.error);
      return;
    }

    setEditing(null);
    load();
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    setDeleteMsg(null);

    const { data, error } = await invokeCloudFunction("delete-corretor", {
      user_id: confirmDelete.id,
    });
    setDeleting(false);

    if (error) {
      const ctx = (error as { context?: { error?: string } }).context;
      setDeleteMsg(ctx?.error || error.message || "Falha ao excluir");
      return;
    }
    if (data?.error) {
      setDeleteMsg(data.error);
      return;
    }

    setConfirmDelete(null);
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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <input
                style={inputStyle}
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                maxLength={15}
                inputMode="tel"
              />
              <small style={{ display: "block", marginTop: 4, fontSize: 10, color: "var(--text-muted)" }}>
                Insira o número com DDD para habilitar a integração com o WhatsApp
              </small>
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
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
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
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
                  Status
                </th>
                <th style={{ textAlign: "right", padding: "12px 16px", fontSize: 11, color: "var(--text-muted)", fontWeight: 600, width: 260 }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
                    Nenhum corretor cadastrado.
                  </td>
                </tr>
              ) : (
                list.map((c) => {
                  const isSelf = c.id === user?.id;
                  return (
                    <tr key={c.id} style={{ borderTop: "1px solid var(--glass-border)" }}>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
                        {c.name}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted)" }}>{c.email}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted)" }}>
                        {formatPhoneDisplay(c.phone)}
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
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          className="badge"
                          style={{
                            background: c.is_active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                            color: c.is_active ? "#22c55e" : "#ef4444",
                          }}
                        >
                          {c.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap", width: 260 }}>
                        <div style={{ display: "inline-flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => openEdit(c)}
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid var(--glass-border)",
                            color: "var(--text-primary)",
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "6px 12px",
                            borderRadius: 8,
                            cursor: "pointer",
                          }}
                        >
                          Editar
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => handleToggleActive(c)}
                            disabled={togglingId === c.id}
                            title={c.is_active ? "Inativar corretor" : "Reativar corretor"}
                            style={{
                              background: c.is_active ? "rgba(245,158,11,0.1)" : "rgba(34,197,94,0.1)",
                              border: `1px solid ${c.is_active ? "rgba(245,158,11,0.3)" : "rgba(34,197,94,0.3)"}`,
                              color: c.is_active ? "#f59e0b" : "#22c55e",
                              fontSize: 12,
                              fontWeight: 600,
                              padding: "6px 12px",
                              borderRadius: 8,
                              cursor: togglingId === c.id ? "not-allowed" : "pointer",
                              opacity: togglingId === c.id ? 0.4 : 1,
                              marginRight: 8,
                            }}
                          >
                            {togglingId === c.id ? "..." : c.is_active ? "Inativar" : "Ativar"}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setConfirmDelete(c);
                            setDeleteMsg(null);
                          }}
                          disabled={isSelf}
                          title={isSelf ? "Você não pode excluir a si mesmo" : "Excluir corretor"}
                          style={{
                            background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.3)",
                            color: "#ef4444",
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "6px 12px",
                            borderRadius: 8,
                            cursor: isSelf ? "not-allowed" : "pointer",
                            opacity: isSelf ? 0.4 : 1,
                          }}
                        >
                          Excluir
                        </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ── Modal Editar ────────────────────────────── */}
      {editing && (
        <div
          onClick={() => !editSubmitting && setEditing(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleEditSave}
            className="glass rounded-2xl p-6"
            style={{ width: "100%", maxWidth: 440, border: "1px solid rgba(212,175,55,0.2)" }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: "var(--text-primary)" }}>
              Editar corretor
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
              {editing.email}
            </p>

            <div className="space-y-3">
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Nome
                </label>
                <input
                  style={inputStyle}
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                  Telefone
                </label>
                <input
                  style={inputStyle}
                  value={editPhone}
                  onChange={(e) => setEditPhone(maskPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                  inputMode="tel"
                />
                <small style={{ display: "block", marginTop: 4, fontSize: 10, color: "var(--text-muted)" }}>
                  Será salvo no formato WhatsApp (55DDDNNNNNNNNN@s.whatsapp.net)
                </small>
              </div>
            </div>

            {editMsg && (
              <div
                className="rounded-lg px-3 py-2 mt-4"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#ef4444",
                  fontSize: 12,
                }}
              >
                {editMsg}
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={editSubmitting}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "10px",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={editSubmitting}
                style={{
                  flex: 1,
                  background: "var(--gold)",
                  border: "none",
                  color: "#0a0a0a",
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "10px",
                  borderRadius: 10,
                  cursor: editSubmitting ? "not-allowed" : "pointer",
                  opacity: editSubmitting ? 0.6 : 1,
                }}
              >
                {editSubmitting ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Modal Confirmar Exclusão ─────────────────── */}
      {confirmDelete && (
        <div
          onClick={() => !deleting && setConfirmDelete(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-2xl p-6"
            style={{ width: "100%", maxWidth: 420, border: "1px solid rgba(239,68,68,0.3)" }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
              Excluir corretor?
            </h2>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
              Tem certeza que deseja excluir <strong style={{ color: "var(--text-primary)" }}>{confirmDelete.name}</strong>?
              Esta ação remove o acesso ao sistema e desvincula os leads atribuídos. Não pode ser desfeita.
            </p>

            {deleteMsg && (
              <div
                className="rounded-lg px-3 py-2 mb-4"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#ef4444",
                  fontSize: 12,
                }}
              >
                {deleteMsg}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "10px",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{
                  flex: 1,
                  background: "#ef4444",
                  border: "none",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "10px",
                  borderRadius: 10,
                  cursor: deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
