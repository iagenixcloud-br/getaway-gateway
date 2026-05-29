import React from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  label: string;
  color: string;
  valor: number;
  origemValor: number;
  origemLabel: string; // ex: "negócios"
  pct: number; // 0-100
  bridgeText?: string; // texto entre cards
  destaque?: boolean; // card final
}

function pctColor(p: number) {
  if (p >= 65) return "#1D9E75";
  if (p >= 50) return "#D4AF37";
  return "#D85A30";
}

export function FunilCard({
  label,
  color,
  valor,
  origemValor,
  origemLabel,
  pct,
  bridgeText,
  destaque = false,
}: Props) {
  const naoConverteu = Math.max(origemValor - valor, 0);
  const showPct = origemValor > 0;
  const pctClamped = Math.min(Math.max(pct, 0), 100);
  const cor = pctColor(pct);

  return (
    <>
      <div
        className="rounded-xl p-4"
        style={{
          background: "#112236",
          border: destaque
            ? `1.5px solid ${color}`
            : "0.5px solid rgba(255,255,255,0.08)",
          boxShadow: destaque ? `0 0 24px ${color}33` : undefined,
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: color,
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", letterSpacing: 0.3 }}>
              {label.toUpperCase()}
            </span>
          </div>
          {showPct && (
            <span
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: cor,
                fontFamily: "Montserrat, Inter, sans-serif",
              }}
            >
              {pct.toFixed(1)}%
            </span>
          )}
        </div>

        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#f1f5f9",
                fontFamily: "Montserrat, Inter, sans-serif",
                lineHeight: 1,
              }}
            >
              {valor}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
              dos {origemValor} {origemLabel}
            </div>
          </div>
          {showPct && (
            <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "right" }}>
              Não converteu
              <div style={{ color: "#cbd5e1", fontWeight: 700, fontSize: 14 }}>
                {naoConverteu}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            width: "100%",
            height: 6,
            borderRadius: 999,
            background: "rgba(255,255,255,0.06)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${pctClamped}%`,
              height: "100%",
              background: cor,
              transition: "width 0.6s ease",
            }}
          />
        </div>
      </div>

      {bridgeText && (
        <div
          className="flex flex-col items-center gap-1 my-1"
          style={{ color: "#64748b" }}
        >
          <ChevronDown size={18} />
          <p
            style={{
              fontSize: 11,
              color: "#94a3b8",
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            {bridgeText}
          </p>
        </div>
      )}
    </>
  );
}
