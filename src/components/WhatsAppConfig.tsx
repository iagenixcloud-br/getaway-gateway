import React, { useState } from "react";

// ── WhatsApp Config Screen ────────────────────────────────────
export function WhatsAppConfig() {
  const [phone, setPhone] = useState("(11) 99234-5678");
  const [ownerName, setOwnerName] = useState("Rafael Andrade");
  const [sendTime, setSendTime] = useState("08:00");
  const [includeRanking, setIncludeRanking] = useState(true);
  const [includeLeads, setIncludeLeads] = useState(true);
  const [includeProperties, setIncludeProperties] = useState(false);
  const [includeVGV, setIncludeVGV] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1200);
  };

  // ── Today's date for preview ────────────────────────────────
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── Generate preview message ─────────────────────────────────
  const previewLines: string[] = [
    `📊 *Andrade Imobiliária — Relatório Diário*`,
    `${today}`,
    ``,
    `Bom dia, ${ownerName || "Rafael"}! Aqui está seu resumo:`,
    ``,
  ];

  if (includeVGV) {
    previewLines.push(`💰 *VGV Acumulado:* R$ 112.8M`);
    previewLines.push(`📈 *Ticket Médio:* R$ 3.2M`);
    previewLines.push(`✅ *Conversão:* 8.3%`);
    previewLines.push(``);
  }

  if (includeLeads) {
    previewLines.push(`👥 *Pipeline de Leads:*`);
    previewLines.push(`• Novos hoje: 8 leads`);
    previewLines.push(`• Em contato: 12 leads`);
    previewLines.push(`• Visitas agendadas: 5`);
    previewLines.push(`• ⚠️ Sem contato há +24h: 2 leads`);
    previewLines.push(``);
  }

  if (includeRanking) {
    previewLines.push(`🏆 *Top Corretores do Mês:*`);
    previewLines.push(`1° 🥇 Rafael Andrade — R$ 32.4M`);
    previewLines.push(`2° 🥈 Priscila Monteiro — R$ 27.8M`);
    previewLines.push(`3° 🥉 Carlos Eduardo — R$ 21.5M`);
    previewLines.push(``);
  }

  if (includeProperties) {
    previewLines.push(`🏠 *Imóveis em Destaque:*`);
    previewLines.push(`• Penthouse Jardins — R$ 4.2M`);
    previewLines.push(`• Mansão Alphaville — R$ 8.5M`);
    previewLines.push(``);
  }

  previewLines.push(`---`);
  previewLines.push(`_Andrade Imobiliária CRM Elite_`);
  previewLines.push(`_Powered by IA_`);

  const Toggle = ({
    checked,
    onChange,
    label,
    description,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    description: string;
  }) => (
    <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)" }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{label}</p>
        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="relative flex-shrink-0"
        style={{ width: 44, height: 24, borderRadius: 12, background: checked ? "var(--gold)" : "rgba(255,255,255,0.1)", transition: "background 0.2s", cursor: "pointer", border: "none" }}
      >
        <div
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: checked ? "#001f3f" : "rgba(255,255,255,0.5)",
            transition: "left 0.2s",
          }}
        />
      </button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-2 gap-6">
        {/* ── Left: Config Form ─────────────────────────────── */}
        <div className="space-y-4">
          {/* Connection Card */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(37,211,102,0.15)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
                  Configurar WhatsApp
                </h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Relatório diário automático via n8n</p>
              </div>
            </div>

            {/* Phone Input */}
            <div className="space-y-4">
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                  Número do Proprietário
                </label>
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(37,211,102,0.3)" }}
                >
                  <span style={{ fontSize: 16 }}>🇧🇷</span>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>+55</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    style={{
                      flex: 1,
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  />
                  <div className="w-2 h-2 rounded-full" style={{ background: "#25D366" }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                  Nome do Proprietário
                </label>
                <input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Nome para cumprimento"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    fontSize: 14,
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                  Horário de Envio
                </label>
                <input
                  type="time"
                  value={sendTime}
                  onChange={(e) => setSendTime(e.target.value)}
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: 12,
                    padding: "12px 16px",
                    fontSize: 14,
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Content Config */}
          <div className="glass rounded-2xl p-6">
            <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text-primary)", marginBottom: 4 }}>
              Conteúdo do Relatório
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
              Escolha o que incluir no resumo diário
            </p>

            <div className="space-y-2">
              <Toggle
                checked={includeVGV}
                onChange={setIncludeVGV}
                label="Indicadores Financeiros"
                description="VGV acumulado, ticket médio e taxa de conversão"
              />
              <Toggle
                checked={includeLeads}
                onChange={setIncludeLeads}
                label="Status do Pipeline"
                description="Novos leads, em contato e alertas de follow-up"
              />
              <Toggle
                checked={includeRanking}
                onChange={setIncludeRanking}
                label="Ranking de Corretores"
                description="Top 3 com total de vendas do mês"
              />
              <Toggle
                checked={includeProperties}
                onChange={setIncludeProperties}
                label="Imóveis em Destaque"
                description="Imóveis marcados como featured"
              />
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 gold-glow"
            style={{
              background: saved
                ? "rgba(34,197,94,0.15)"
                : "linear-gradient(135deg, #D4AF37, #b8960c)",
              border: saved ? "1px solid rgba(34,197,94,0.4)" : "none",
              color: saved ? "#22c55e" : "#001f3f",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.3s",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Salvando...
              </>
            ) : saved ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Configuração Salva!
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                </svg>
                Salvar Configuração
              </>
            )}
          </button>

          {/* Test Button */}
          <button
            className="w-full py-3 rounded-2xl flex items-center justify-center gap-2"
            style={{
              background: "rgba(37,211,102,0.08)",
              border: "1px solid rgba(37,211,102,0.3)",
              color: "#25D366",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
            Enviar Mensagem de Teste Agora
          </button>
        </div>

        {/* ── Right: Preview ────────────────────────────────── */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
              Preview do Relatório
            </h3>
            <span className="badge" style={{ background: "rgba(37,211,102,0.1)", color: "#25D366", fontSize: 10 }}>
              Atualização automática
            </span>
          </div>

          {/* Phone Mockup */}
          <div className="flex justify-center">
            <div
              className="relative"
              style={{
                width: 280,
                background: "#111",
                borderRadius: 32,
                padding: "12px 8px",
                boxShadow: "0 40px 80px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.1)",
              }}
            >
              {/* Phone Top Bar */}
              <div className="flex items-center justify-between px-3 py-1 mb-2">
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{sendTime}</span>
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.3)" }} />
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.3)" }} />
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.3)" }} />
                </div>
              </div>

              {/* WhatsApp Chat */}
              <div
                style={{
                  background: "#0d1117",
                  borderRadius: 20,
                  overflow: "hidden",
                }}
              >
                {/* Chat Header */}
                <div
                  className="flex items-center gap-3 px-3 py-3"
                  style={{ background: "#1a2530" }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "var(--gold)", flexShrink: 0 }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#001f3f" }}>A</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>Andrade CRM</p>
                    <p style={{ fontSize: 10, color: "#25D366" }}>● Online</p>
                  </div>
                </div>

                {/* Chat Body */}
                <div
                  className="p-3 space-y-2 overflow-y-auto"
                  style={{
                    background: "#0d1117",
                    minHeight: 360,
                    maxHeight: 420,
                    backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)",
                    backgroundSize: "20px 20px",
                  }}
                >
                  {/* Date Chip */}
                  <div className="flex justify-center">
                    <span
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.4)",
                        fontSize: 10,
                        padding: "3px 10px",
                        borderRadius: 8,
                      }}
                    >
                      Hoje
                    </span>
                  </div>

                  {/* Message Bubble */}
                  <div className="flex justify-start">
                    <div
                      className="whatsapp-bubble px-3 py-2 max-w-full"
                      style={{ maxWidth: "95%" }}
                    >
                      {previewLines.map((line, i) => (
                        <p
                          key={i}
                          style={{
                            fontSize: 11,
                            lineHeight: 1.5,
                            color: line.startsWith("*") || line.endsWith("*")
                              ? "#fff"
                              : line.startsWith("_")
                              ? "rgba(255,255,255,0.4)"
                              : "rgba(255,255,255,0.8)",
                            fontWeight: line.startsWith("📊") || line.startsWith("💰") || line.startsWith("👥") || line.startsWith("🏆") || line.startsWith("🏠") ? 600 : 400,
                            marginBottom: line === "" ? 4 : 0,
                          }}
                        >
                          {line === "---" ? (
                            <span style={{ display: "block", height: 1, background: "rgba(255,255,255,0.1)", margin: "4px 0" }} />
                          ) : line.includes("*") ? (
                            <span dangerouslySetInnerHTML={{
                              __html: line.replace(/\*(.*?)\*/g, "<strong style='color:#fff'>$1</strong>")
                                        .replace(/_(.*?)_/g, "<em style='color:rgba(255,255,255,0.4)'>$1</em>")
                            }} />
                          ) : line}
                        </p>
                      ))}
                      {/* Message Time */}
                      <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textAlign: "right", marginTop: 4 }}>
                        {sendTime} ✓✓
                      </p>
                    </div>
                  </div>
                </div>

                {/* Input Bar */}
                <div
                  className="flex items-center gap-2 px-3 py-2"
                  style={{ background: "#1a2530", borderTop: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div
                    className="flex-1 rounded-full px-3 py-1.5"
                    style={{ background: "rgba(255,255,255,0.05)", fontSize: 10, color: "rgba(255,255,255,0.2)" }}
                  >
                    Mensagem
                  </div>
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: "#25D366" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-5 p-3 rounded-xl" style={{ background: "rgba(37,211,102,0.05)", border: "1px solid rgba(37,211,102,0.1)" }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.5 }}>
              💡 Esta mensagem será enviada automaticamente pelo n8n<br />
              todos os dias às <strong style={{ color: "var(--gold)" }}>{sendTime}</strong> para o número configurado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
