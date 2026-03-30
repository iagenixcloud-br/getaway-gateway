import React, { useState } from "react";
import { properties, Property } from "../data/mockData";

// ── Helpers ───────────────────────────────────────────────────
function formatPrice(price: number): string {
  if (price >= 1_000_000) return `R$ ${(price / 1_000_000).toFixed(1)}M`;
  return `R$ ${(price / 1_000).toFixed(0)}K`;
}

// ── Filter Config ─────────────────────────────────────────────
const neighborhoods = ["Todos", "Jardins", "Itaim Bibi", "Moema", "Alphaville", "Vila Nova Conceição"];
const types = ["Todos", "Apartamento", "Cobertura", "Penthouse", "Casa", "Mansão"];
const priceRanges = [
  { label: "Todos", min: 0, max: Infinity },
  { label: "Até R$ 2M", min: 0, max: 2_000_000 },
  { label: "R$ 2M – 4M", min: 2_000_000, max: 4_000_000 },
  { label: "Acima de R$ 4M", min: 4_000_000, max: Infinity },
];

// ── Property Modal ────────────────────────────────────────────
function PropertyModal({ property, onClose }: { property: Property; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"details" | "tour">("details");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content glass rounded-2xl w-full overflow-hidden"
        style={{ maxWidth: 680, maxHeight: "90vh", border: "1px solid rgba(212,175,55,0.2)", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image Header */}
        <div className="relative" style={{ height: 260, overflow: "hidden", flexShrink: 0 }}>
          <img
            src={property.imageUrl}
            alt={property.title}
            className="w-full h-full object-cover property-img"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(0,10,25,0.95) 0%, rgba(0,10,25,0.3) 60%, transparent 100%)" }}
          />

          {/* Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            {property.featured && (
              <span className="badge gold-glow" style={{ background: "var(--gold)", color: "#001f3f", fontWeight: 700 }}>
                ★ Destaque
              </span>
            )}
            <span className="badge" style={{ background: "rgba(0,0,0,0.6)", color: "var(--text-primary)" }}>
              {property.type}
            </span>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.6)", color: "var(--text-primary)" }}
          >
            ✕
          </button>

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h2 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 22, color: "#fff", marginBottom: 4 }}>
              {property.title}
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
              📍 {property.neighborhood}, {property.city}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Price + Stats */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Preço de Venda (VGV)</p>
              <p className="gold-text" style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 32 }}>
                {formatPrice(property.price)}
              </p>
            </div>
            <a
              href={property.tour360Url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-5 py-3 rounded-xl gold-glow"
              style={{
                background: "var(--gold-dim)",
                border: "1px solid rgba(212,175,55,0.4)",
                color: "var(--gold)",
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                cursor: "pointer",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
              </svg>
              Tour 360°
            </a>
          </div>

          {/* Property Stats Grid */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { icon: "⬛", label: "Área", value: `${property.area}m²` },
              { icon: "🛏", label: "Quartos", value: property.bedrooms },
              { icon: "🚿", label: "Banheiros", value: property.bathrooms },
              { icon: "🚗", label: "Vagas", value: property.parkingSpots },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1 p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)" }}
              >
                <span style={{ fontSize: 18 }}>{stat.icon}</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{stat.value}</span>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 16 }}>
            {property.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {property.tags.map((tag) => (
              <span
                key={tag}
                className="badge"
                style={{ background: "var(--gold-dim)", color: "var(--gold)", border: "1px solid rgba(212,175,55,0.2)" }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              className="py-3 rounded-xl flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #D4AF37, #b8960c)",
                color: "#001f3f",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Agendar Visita
            </button>
            <button
              className="py-3 rounded-xl flex items-center justify-center gap-2"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              Compartilhar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Property Card ─────────────────────────────────────────────
function PropertyCard({ property, onClick }: { property: Property; onClick: () => void }) {
  return (
    <div
      className="glass rounded-2xl overflow-hidden property-card cursor-pointer"
      style={{ transition: "all 0.3s ease" }}
      onClick={onClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(212,175,55,0.3)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(212,175,55,0.08)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "";
        (e.currentTarget as HTMLDivElement).style.borderColor = "";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "";
      }}
    >
      {/* Image */}
      <div className="relative overflow-hidden" style={{ height: 220 }}>
        <img
          src={property.imageUrl}
          alt={property.title}
          className="w-full h-full object-cover property-img"
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,10,25,0.8) 0%, transparent 60%)" }}
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {property.featured && (
            <span className="badge" style={{ background: "var(--gold)", color: "#001f3f", fontWeight: 700, fontSize: 10 }}>
              ★ Destaque
            </span>
          )}
        </div>

        {/* 360° Badge */}
        <div className="absolute top-3 right-3">
          <span
            className="badge gold-glow"
            style={{ background: "rgba(212,175,55,0.2)", color: "var(--gold)", border: "1px solid rgba(212,175,55,0.3)", fontSize: 10 }}
          >
            360°
          </span>
        </div>

        {/* Price on Image */}
        <div className="absolute bottom-3 left-3">
          <p className="gold-text" style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 22 }}>
            {formatPrice(property.price)}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 4 }}>
          {property.title}
        </h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          📍 {property.neighborhood}, {property.city}
        </p>

        {/* Stats Row */}
        <div className="flex items-center gap-4 mb-4" style={{ borderTop: "1px solid var(--glass-border)", paddingTop: 12 }}>
          {[
            { value: `${property.area}m²`, label: "Área" },
            { value: `${property.bedrooms} dorms`, label: "" },
            { value: `${property.parkingSpots} vagas`, label: "" },
          ].map((stat, i) => (
            <span key={i} style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {stat.value}
            </span>
          ))}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {property.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="badge"
              style={{ background: "rgba(212,175,55,0.08)", color: "rgba(212,175,55,0.7)", fontSize: 10 }}
            >
              {tag}
            </span>
          ))}
          {property.tags.length > 2 && (
            <span className="badge" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", fontSize: 10 }}>
              +{property.tags.length - 2}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Gallery ──────────────────────────────────────────────
export function PropertyGallery() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [activeNeighborhood, setActiveNeighborhood] = useState("Todos");
  const [activeType, setActiveType] = useState("Todos");
  const [activePriceRange, setActivePriceRange] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered = properties.filter((p) => {
    const range = priceRanges[activePriceRange];
    return (
      (activeNeighborhood === "Todos" || p.neighborhood === activeNeighborhood) &&
      (activeType === "Todos" || p.type === activeType) &&
      p.price >= range.min &&
      p.price <= range.max
    );
  });

  const FilterBtn = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
      style={{
        background: active ? "var(--gold-dim)" : "rgba(255,255,255,0.04)",
        border: active ? "1px solid rgba(212,175,55,0.4)" : "1px solid var(--glass-border)",
        color: active ? "var(--gold)" : "var(--text-muted)",
        cursor: "pointer",
        fontSize: 12,
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      {/* Filters Bar */}
      <div className="glass rounded-2xl p-5 mb-6">
        <div className="flex items-start gap-6 flex-wrap">
          {/* Bairro */}
          <div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Bairro
            </p>
            <div className="flex gap-2 flex-wrap">
              {neighborhoods.map((n) => (
                <FilterBtn key={n} label={n} active={activeNeighborhood === n} onClick={() => setActiveNeighborhood(n)} />
              ))}
            </div>
          </div>

          {/* Tipo */}
          <div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Tipo
            </p>
            <div className="flex gap-2 flex-wrap">
              {types.map((t) => (
                <FilterBtn key={t} label={t} active={activeType === t} onClick={() => setActiveType(t)} />
              ))}
            </div>
          </div>

          {/* Preço */}
          <div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Faixa de Preço
            </p>
            <div className="flex gap-2">
              {priceRanges.map((r, i) => (
                <FilterBtn key={i} label={r.label} active={activePriceRange === i} onClick={() => setActivePriceRange(i)} />
              ))}
            </div>
          </div>

          {/* View Toggle */}
          <div className="ml-auto self-end flex gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: viewMode === "grid" ? "var(--gold-dim)" : "rgba(255,255,255,0.04)",
                border: viewMode === "grid" ? "1px solid rgba(212,175,55,0.4)" : "1px solid var(--glass-border)",
                color: viewMode === "grid" ? "var(--gold)" : "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: viewMode === "list" ? "var(--gold-dim)" : "rgba(255,255,255,0.04)",
                border: viewMode === "list" ? "1px solid rgba(212,175,55,0.4)" : "1px solid var(--glass-border)",
                color: viewMode === "list" ? "var(--gold)" : "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between mb-4">
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{filtered.length}</span> imóveis encontrados
        </p>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Ordenar por:</span>
          <select
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 12,
              outline: "none",
            }}
          >
            <option>Maior Preço</option>
            <option>Menor Preço</option>
            <option>Mais Recentes</option>
            <option>Destaque</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-3 gap-5">
          {filtered.map((p) => (
            <PropertyCard key={p.id} property={p} onClick={() => setSelectedProperty(p)} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="glass glass-hover rounded-2xl overflow-hidden cursor-pointer flex"
              style={{ height: 130 }}
              onClick={() => setSelectedProperty(p)}
            >
              <img src={p.imageUrl} alt={p.title} className="w-48 h-full object-cover flex-shrink-0" />
              <div className="flex-1 p-4 flex items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{p.title}</h3>
                    {p.featured && (
                      <span className="badge" style={{ background: "var(--gold)", color: "#001f3f", fontSize: 10 }}>★ Destaque</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>📍 {p.neighborhood}, {p.city}</p>
                  <div className="flex gap-3">
                    {p.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="badge" style={{ background: "var(--gold-dim)", color: "var(--gold)", fontSize: 10 }}>{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="gold-text" style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 800, fontSize: 24 }}>
                    {formatPrice(p.price)}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.area}m² • {p.bedrooms} dorms</p>
                  <span className="badge mt-2" style={{ background: "var(--gold-dim)", color: "var(--gold)", border: "1px solid rgba(212,175,55,0.3)" }}>
                    Tour 360°
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedProperty && (
        <PropertyModal property={selectedProperty} onClose={() => setSelectedProperty(null)} />
      )}
    </div>
  );
}
