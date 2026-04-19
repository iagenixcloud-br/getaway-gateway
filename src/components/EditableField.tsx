import React, { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onSave: (newValue: string) => void;
  placeholder?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  multiline?: boolean;
  className?: string;
  /** Se true, ocupa toda a largura disponível */
  fullWidth?: boolean;
}

/**
 * Campo editável inline. Clica → vira input. Salva ao apertar Enter ou sair (blur).
 * Esc cancela. Para o evento de drag/click do card pai.
 */
export function EditableField({
  value,
  onSave,
  placeholder = "—",
  fontSize = 12,
  fontWeight = 400,
  color = "var(--text-muted)",
  multiline = false,
  className = "",
  fullWidth = true,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.select?.();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== value.trim()) onSave(trimmed);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  // Evita que o card pai dispare drag ou abertura de modal
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  if (editing) {
    const Tag = multiline ? "textarea" : "input";
    return (
      <Tag
        ref={ref as never}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !multiline) {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            cancel();
          }
        }}
        onPointerDown={stop}
        onMouseDown={stop}
        onClick={stop}
        placeholder={placeholder}
        className={className}
        style={{
          fontSize,
          fontWeight,
          color: "var(--text-primary)",
          background: "rgba(212,175,55,0.08)",
          border: "1px solid rgba(212,175,55,0.4)",
          borderRadius: 6,
          padding: "2px 6px",
          width: fullWidth ? "100%" : "auto",
          outline: "none",
          fontFamily: "inherit",
          resize: multiline ? "vertical" : "none",
        }}
      />
    );
  }

  return (
    <span
      onPointerDown={stop}
      onMouseDown={stop}
      onClick={(e) => {
        stop(e);
        setEditing(true);
      }}
      className={className}
      style={{
        fontSize,
        fontWeight,
        color: value ? color : "var(--text-muted)",
        cursor: "text",
        display: "inline-block",
        width: fullWidth ? "100%" : "auto",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: multiline ? "normal" : "nowrap",
        borderRadius: 4,
        padding: "1px 4px",
        margin: "-1px -4px",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      title="Clique para editar"
    >
      {value || placeholder}
    </span>
  );
}
