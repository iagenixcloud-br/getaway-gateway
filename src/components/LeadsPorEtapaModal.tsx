import React, { useEffect, useMemo, useState } from "react";
import { X, Copy, Check, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Lead, LeadStatus } from "../data/mockData";

interface Props {
  status: LeadStatus;
  label: string;
  color: string;
  icon: string;
  leads: Lead[];
  onClose: () => void;
}

function formatDuration(hours: number): string {
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const h = hours % 24;
  return h > 0 ? `${days}d ${h}h` : `${days}d`;
}

export function LeadsPorEtapaModal({ label, color, icon, leads, onClose }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...leads].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [leads],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const copy = async (id: string, phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Leads na etapa ${label}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass rounded-2xl w-full max-w-2xl flex flex-col"
        style={{
          maxHeight: "85vh",
          border: `1px solid ${color}55`,
          boxShadow: `0 10px 40px ${color}22`,
        }}
      >
        {/* Header */}
        <header
          className="flex items-center gap-3 p-4 sm:p-5"
          style={{ borderBottom: "1px solid var(--glass-border)" }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}20`, border: `1px solid ${color}40` }}
          >
            <span style={{ fontSize: 20 }}>{icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 700,
                fontSize: 16,
                color: "var(--text-primary)",
              }}
            >
              {label}
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {sorted.length} {sorted.length === 1 ? "lead" : "leads"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <X size={18} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {sorted.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                textAlign: "center",
                padding: 32,
              }}
            >
              Nenhum lead nesta etapa.
            </p>
          ) : (
            <ul className="space-y-2">
              {sorted.map((lead) => (
                <li
                  key={lead.id}
                  className="rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--glass-border)",
                    minHeight: 56,
                  }}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img
                      src={lead.avatar}
                      alt={lead.name}
                      className="w-10 h-10 rounded-full flex-shrink-0"
                      style={{ border: `2px solid ${color}` }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {lead.name}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          fontFamily: "monospace",
                        }}
                      >
                        {lead.phone || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-between sm:justify-end">
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      há {formatDuration(lead.waitingHours)}
                    </span>
                    {lead.phone && (
                      <button
                        onClick={() => copy(lead.id, lead.phone)}
                        aria-label="Copiar telefone"
                        className="w-9 h-9 rounded-lg flex items-center justify-center transition"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid var(--glass-border)",
                          color:
                            copiedId === lead.id ? "#22c55e" : "var(--text-primary)",
                        }}
                      >
                        {copiedId === lead.id ? <Check size={15} /> : <Copy size={15} />}
                      </button>
                    )}
                    <Link
                      to={`/leads?leadId=${lead.id}`}
                      onClick={onClose}
                      aria-label="Abrir lead"
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition"
                      style={{
                        background: `${color}20`,
                        border: `1px solid ${color}55`,
                        color,
                      }}
                    >
                      <ExternalLink size={15} />
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
