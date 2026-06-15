import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useCorretores } from "../hooks/useCorretores";
import { useLeads } from "../hooks/useLeads";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Injetado pelo KanbanBoard para reaproveitar a mesma instância do hook. */
  createIndicacao: ReturnType<typeof useLeads>["createIndicacao"];
}

/* REGRA DE NEGOCIO: Indicacoes manuais ignoram o limite (cap) de 10 leads
   da roleta automatica do trafego pago para garantir que corretores possam
   cadastrar seus proprios clientes trazidos por fora. */
/** Máscara (DD) 9XXXX-XXXX a partir de string digitada. */
function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

const NAME_MAX = 120;
const OBS_MAX = 1000;

export function NovaIndicacaoModal({ open, onClose, createIndicacao }: Props) {
  const { isAdmin } = useAuth();
  const { corretores } = useCorretores(isAdmin);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneDigits = useMemo(() => digitsOnly(phone), [phone]);
  const nameValid = name.trim().length > 0 && name.trim().length <= NAME_MAX;
  const phoneValid = phoneDigits.length === 11;
  const corretorValid = !isAdmin || !!assignedTo;
  const canSubmit = nameValid && phoneValid && corretorValid && !saving;

  const reset = () => {
    setName("");
    setPhone("");
    setObservacoes("");
    setAssignedTo("");
    setError(null);
    setSaving(false);
  };

  const close = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    const { error: err } = await createIndicacao({
      name,
      phone,
      observacoes: observacoes || undefined,
      assignedTo: isAdmin ? assignedTo : undefined,
    });
    setSaving(false);
    if (err) {
      setError(err);
      toast.error(`Não foi possível salvar: ${err}`);
      return;
    }
    toast.success("Indicação cadastrada");
    reset();
    onClose();
  };

  if (!open) return null;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--glass-border)",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 13,
    color: "var(--text-primary)",
    fontFamily: "inherit",
    outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: "var(--text-muted)",
    marginBottom: 4,
    display: "block",
    fontWeight: 500,
  };

  return (
    <div className="modal-overlay" onClick={close}>
      <form
        onSubmit={handleSubmit}
        className="modal-content glass rounded-2xl p-5 sm:p-7 w-full mx-3 sm:mx-0"
        style={{
          maxWidth: 480,
          border: "1px solid rgba(212,175,55,0.25)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 700,
                fontSize: 18,
                color: "var(--text-primary)",
              }}
            >
              + Nova Indicação
            </h2>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              O lead entra automaticamente em <strong>Lead Novo</strong>.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "var(--text-muted)",
              cursor: "pointer",
              border: "none",
            }}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label style={labelStyle}>Nome completo *</label>
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
              placeholder="Ex.: João da Silva"
              maxLength={NAME_MAX}
              autoFocus
            />
          </div>

          <div>
            <label style={labelStyle}>Telefone *</label>
            <input
              style={inputStyle}
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              placeholder="(11) 91234-5678"
              inputMode="tel"
            />
            {phone && !phoneValid && (
              <p style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>
                Telefone deve ter 11 dígitos (DDD + 9 + número).
              </p>
            )}
          </div>

          {isAdmin && (
            <div>
              <label style={labelStyle}>Vincular ao Corretor *</label>
              <select
                style={inputStyle}
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <option value="" style={{ background: "#1a1a1a" }}>
                  Selecione um corretor
                </option>
                {corretores.map((c) => (
                  <option key={c.id} value={c.id} style={{ background: "#1a1a1a" }}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Observações</label>
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: 80 }}
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value.slice(0, OBS_MAX))}
              placeholder="Notas internas sobre a indicação"
              maxLength={OBS_MAX}
            />
            <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, textAlign: "right" }}>
              {observacoes.length}/{OBS_MAX}
            </p>
          </div>

          {error && (
            <div
              style={{
                fontSize: 12,
                color: "#ef4444",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 py-2.5 rounded-xl"
            style={{
              background: canSubmit ? "var(--gold, #D4AF37)" : "rgba(212,175,55,0.25)",
              color: canSubmit ? "#0a0a0a" : "var(--text-muted)",
              fontSize: 13,
              fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
              border: "none",
            }}
          >
            {saving ? "Salvando..." : "Salvar indicação"}
          </button>
          <button
            type="button"
            onClick={close}
            className="px-4 py-2.5 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "var(--text-muted)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid var(--glass-border)",
            }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
