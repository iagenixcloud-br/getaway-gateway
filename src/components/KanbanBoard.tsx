import React, { useState, useEffect } from "react";
import { Lead, LeadStatus, LeadOrigin } from "../data/mockData";
import { useLeads } from "../hooks/useLeads";
import { useCorretores, CorretorOption } from "../hooks/useCorretores";
import { useAuth } from "../contexts/AuthContext";
import { EditableField } from "./EditableField";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
} from "@dnd-kit/core";

// ── Helpers ──────────────────────────────────────────────────
const originColors: Record<string, { bg: string; color: string }> = {
  FB: { bg: "rgba(24, 119, 242, 0.15)", color: "#1877F2" },
  IG: { bg: "rgba(225, 48, 108, 0.15)", color: "#E1306C" },
  WA: { bg: "rgba(37, 211, 102, 0.15)", color: "#25D366" },
  Site: { bg: "rgba(212, 175, 55, 0.15)", color: "#D4AF37" },
  Indicação: { bg: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6" },
};

const healthColor = (score: number) => {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
};

const waitingLabel = (hours: number) => {
  if (hours === 0) return null;
  if (hours < 1) return "Há poucos minutos";
  if (hours === 1) return "Sem contato há 1h";
  if (hours < 24) return `Sem contato há ${hours}h`;
  return `Sem contato há ${Math.floor(hours / 24)}d`;
};

const waitingUrgency = (hours: number): string => {
  if (hours === 0) return "";
  if (hours <= 2) return "#f59e0b";
  if (hours <= 8) return "#ef4444";
  return "#dc2626";
};

// ── Column Config ─────────────────────────────────────────────
const columns: { id: LeadStatus; label: string; color: string; icon: string }[] = [
  { id: "novo", label: "Novo Lead", color: "#06b6d4", icon: "✦" },
  { id: "atrasado", label: "Atrasado", color: "#f59e0b", icon: "⏱" },
  { id: "visitar", label: "Visitar", color: "#3b82f6", icon: "⌂" },
  { id: "agendados", label: "Agendados", color: "#8b5cf6", icon: "◈" },
  { id: "favoritos", label: "Favoritos", color: "#D4AF37", icon: "★" },
  { id: "fechado", label: "Negócio Fechado", color: "#22c55e", icon: "✓" },
  { id: "arquivados", label: "Arquivados", color: "#64748b", icon: "▣" },
];

// ── Lead Detail Modal ─────────────────────────────────────────
function LeadModal({
  lead,
  onClose,
  onMove,
  onUpdate,
}: {
  lead: Lead;
  onClose: () => void;
  onMove: (status: LeadStatus) => void;
  onUpdate: (patch: Partial<Lead>) => void;
}) {
  // Estado local do formulário (sincroniza com prop)
  const [form, setForm] = useState<Lead>(lead);
  useEffect(() => setForm(lead), [lead]);

  const set = <K extends keyof Lead>(key: K, value: Lead[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const dirty =
    form.name !== lead.name ||
    form.phone !== lead.phone ||
    form.property !== lead.property ||
    form.origin !== lead.origin;

  const handleSave = () => {
    onUpdate({
      name: form.name,
      phone: form.phone,
      property: form.property,
      origin: form.origin,
    });
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--glass-border)",
    borderRadius: 8,
    padding: "8px 10px",
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

  const origins: LeadOrigin[] = ["FB", "IG", "WA", "Site", "Indicação"];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass rounded-2xl p-8 w-full"
        style={{ maxWidth: 560, border: "1px solid rgba(212,175,55,0.2)", maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <img
            src={lead.avatar}
            alt={lead.name}
            className="w-16 h-16 rounded-2xl object-cover"
            style={{ border: "2px solid var(--gold)" }}
          />
          <div className="flex-1">
            <h2 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 20, marginBottom: 2 }}>
              Editar Lead
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Cadastrado em {new Date(lead.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="col-span-2">
            <label style={labelStyle}>Nome</label>
            <input
              style={inputStyle}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Telefone</label>
            <input
              style={inputStyle}
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label style={labelStyle}>Imóvel de Interesse</label>
            <input
              style={inputStyle}
              value={form.property}
              onChange={(e) => set("property", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label style={labelStyle}>Origem</label>
            <select
              style={inputStyle}
              value={form.origin}
              onChange={(e) => set("origin", e.target.value as LeadOrigin)}
            >
              {origins.map((o) => (
                <option key={o} value={o} style={{ background: "#1a1a1a" }}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Save / Cancel */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleSave}
            disabled={!dirty}
            className="flex-1 py-2.5 rounded-xl"
            style={{
              background: dirty ? "var(--gold)" : "rgba(212,175,55,0.2)",
              color: dirty ? "#0a0a0a" : "var(--text-muted)",
              fontSize: 13,
              fontWeight: 700,
              cursor: dirty ? "pointer" : "not-allowed",
              border: "none",
            }}
          >
            {dirty ? "Salvar alterações" : "Sem alterações"}
          </button>
          <button
            onClick={() => setForm(lead)}
            disabled={!dirty}
            className="px-4 py-2.5 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.05)",
              color: "var(--text-muted)",
              fontSize: 13,
              fontWeight: 600,
              cursor: dirty ? "pointer" : "not-allowed",
              border: "1px solid var(--glass-border)",
            }}
          >
            Resetar
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-xl"
            style={{ background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.3)", color: "#25D366", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
            WhatsApp
          </a>
          <button
            className="flex items-center justify-center gap-2 py-3 rounded-xl"
            style={{ background: "var(--gold-dim)", border: "1px solid rgba(212,175,55,0.3)", color: "var(--gold)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Agendar
          </button>
        </div>

        {/* Move Stage */}
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--glass-border)" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Mover para etapa:</p>
          <div className="flex gap-2 flex-wrap">
            {columns.map((col) => (
              <button
                key={col.id}
                onClick={() => {
                  if (lead.status !== col.id) {
                    onMove(col.id);
                    onClose();
                  }
                }}
                className="flex-1 py-2 rounded-lg text-center"
                style={{
                  background: lead.status === col.id ? `${col.color}25` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${lead.status === col.id ? col.color + "60" : "rgba(255,255,255,0.08)"}`,
                  fontSize: 11,
                  fontWeight: 600,
                  color: lead.status === col.id ? col.color : "var(--text-muted)",
                  cursor: "pointer",
                  minWidth: 70,
                }}
              >
                {col.icon} {col.label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Lead Card ─────────────────────────────────────────────────
function LeadCard({
  lead,
  onClick,
  isDragging,
  onUpdate,
}: {
  lead: Lead;
  onClick?: () => void;
  isDragging?: boolean;
  onUpdate?: (patch: Partial<Lead>) => void;
}) {
  const editable = !!onUpdate;
  return (
    <div
      className="glass glass-hover rounded-xl p-4"
      onClick={onClick}
      style={{ marginBottom: 8, opacity: isDragging ? 0.4 : 1, cursor: "grab" }}
    >
      {/* Nome */}
      <div style={{ marginBottom: 8 }}>
        {editable ? (
          <EditableField
            value={lead.name}
            onSave={(v) => onUpdate!({ name: v })}
            fontSize={14}
            fontWeight={600}
            color="var(--text-primary)"
            placeholder="Nome do lead"
          />
        ) : (
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
        )}
      </div>

      {/* Telefone */}
      <div className="flex items-center gap-2 mb-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.8 11.5a19.79 19.79 0 01-3.07-8.67A2 2 0 013.7 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L7.91 8.2a16 16 0 006.29 6.29l1.46-1.46a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 15.24v1.68z" />
        </svg>
        {editable ? (
          <EditableField value={lead.phone} onSave={(v) => onUpdate!({ phone: v })} placeholder="Telefone" />
        ) : (
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{lead.phone}</span>
        )}
      </div>

      {/* Imóvel solicitado */}
      <div className="flex items-center gap-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
        {editable ? (
          <EditableField value={lead.property} onSave={(v) => onUpdate!({ property: v })} placeholder="Imóvel de interesse" />
        ) : (
          <span style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {lead.property}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Draggable wrapper ─────────────────────────────────────────
function DraggableLeadCard({
  lead,
  onClick,
  onUpdate,
}: {
  lead: Lead;
  onClick: () => void;
  onUpdate: (patch: Partial<Lead>) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });
  const [downPos, setDownPos] = React.useState<{ x: number; y: number } | null>(null);
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ touchAction: "none" }}
      onPointerDownCapture={(e) => setDownPos({ x: e.clientX, y: e.clientY })}
      onClickCapture={(e) => {
        if (downPos) {
          const dx = Math.abs(e.clientX - downPos.x);
          const dy = Math.abs(e.clientY - downPos.y);
          // Só abre o modal se o clique não veio de um campo editável
          const target = e.target as HTMLElement;
          const insideEditable = target.closest("input, textarea, select, [data-editable]");
          if (dx < 5 && dy < 5 && !insideEditable) onClick();
        }
      }}
    >
      <LeadCard lead={lead} isDragging={isDragging} onUpdate={onUpdate} />
    </div>
  );
}

// ── Droppable column wrapper ──────────────────────────────────
function DroppableArea({
  id,
  color,
  children,
}: {
  id: LeadStatus;
  color: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="flex-1 overflow-y-auto space-y-0 rounded-xl transition-colors"
      style={{
        minHeight: 400,
        maxHeight: "calc(100vh - 340px)",
        background: isOver ? `${color}15` : "transparent",
        outline: isOver ? `2px dashed ${color}80` : "none",
        outlineOffset: -4,
      }}
    >
      {children}
    </div>
  );
}

// ── Main Kanban ───────────────────────────────────────────────
export function KanbanBoard() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const { leads: allLeads, loading, error, updateLeadStatus, updateLead } = useLeads();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const getColumnLeads = (status: LeadStatus) =>
    allLeads.filter((l) => l.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    const lead = allLeads.find((l) => l.id === event.active.id);
    setActiveLead(lead || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as LeadStatus;
    const lead = allLeads.find((l) => l.id === active.id);
    if (!lead || lead.status === newStatus) return;
    updateLeadStatus(lead.id, newStatus);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
    <div>
      {(loading || error) && (
        <div
          className="glass rounded-xl px-4 py-2 mb-4"
          style={{
            border: error ? "1px solid #ef444450" : "1px solid var(--glass-border)",
            fontSize: 12,
            color: error ? "#ef4444" : "var(--text-muted)",
          }}
        >
          {error ? `Erro ao carregar leads: ${error}` : "Conectando ao Supabase..."}
        </div>
      )}

      {/* Top Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {columns.map((col) => {
          const count = getColumnLeads(col.id).length;
          return (
            <div
              key={col.id}
              className="glass rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <div
                className="w-2 h-8 rounded-full"
                style={{ background: col.color, opacity: 0.7 }}
              />
              <div>
                <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{col.label}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: col.color }}>{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colLeads = getColumnLeads(col.id);
          return (
            <div
              key={col.id}
              className="kanban-column flex-shrink-0 flex flex-col"
              style={{ minWidth: 280, maxWidth: 300 }}
            >
              {/* Column Header */}
              <div
                className="flex items-center justify-between px-4 py-3 rounded-xl mb-3"
                style={{
                  background: `${col.color}10`,
                  border: `1px solid ${col.color}25`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: col.color }}>{col.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {col.label}
                  </span>
                </div>
                <span
                  className="badge"
                  style={{ background: `${col.color}20`, color: col.color }}
                >
                  {colLeads.length}
                </span>
              </div>

              {/* Cards (droppable) */}
              <DroppableArea id={col.id} color={col.color}>
                {colLeads.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center py-12 rounded-xl"
                    style={{ border: `2px dashed ${col.color}20`, color: "var(--text-muted)" }}
                  >
                    <span style={{ fontSize: 24, marginBottom: 8, opacity: 0.3 }}>✦</span>
                    <span style={{ fontSize: 12 }}>Solte um lead aqui</span>
                  </div>
                ) : (
                  colLeads.map((lead) => (
                    <DraggableLeadCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => setSelectedLead(lead)}
                      onUpdate={(patch) => updateLead(lead.id, patch)}
                    />
                  ))
                )}
              </DroppableArea>

              {/* Add Lead Button */}
              <button
                className="mt-2 w-full py-2.5 rounded-xl flex items-center justify-center gap-2 glass-hover"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px dashed ${col.color}30`,
                  color: "var(--text-muted)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 16, color: col.color }}>+</span>
                Adicionar Lead
              </button>
            </div>
          );
        })}

      </div>

      {/* Modal */}
      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onMove={(newStatus) => updateLeadStatus(selectedLead.id, newStatus)}
          onUpdate={(patch) => updateLead(selectedLead.id, patch)}
        />
      )}
    </div>

    <DragOverlay dropAnimation={null}>
      {activeLead ? (
        <div style={{ width: 280, transform: "rotate(2deg)" }}>
          <LeadCard lead={activeLead} />
        </div>
      ) : null}
    </DragOverlay>
    </DndContext>
  );
}
