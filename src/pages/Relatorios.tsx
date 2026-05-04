import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { invokeCloudFunction } from "../lib/cloudFunctions";

interface ReportSettings {
  id: number;
  webhook_url: string | null;
  recipient_numbers: string[];
  schedule_hour: number;
  schedule_enabled: boolean;
}

interface ReportLog {
  id: string;
  mode: string;
  recipients: string[];
  success: boolean;
  n8n_status: number | null;
  created_at: string;
}

const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 13);
  if (d.length <= 2) return `+${d}`;
  if (d.length <= 4) return `+${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 9) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4)}`;
  return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 9)}-${d.slice(9)}`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function Relatorios() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<ReportSettings | null>(null);
  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newPhone, setNewPhone] = useState("");

  const load = async () => {
    const [{ data: s }, { data: l }] = await Promise.all([
      supabase.from("report_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("report_logs").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setSettings(
      (s as ReportSettings) || {
        id: 1,
        webhook_url: "",
        recipient_numbers: [],
        schedule_hour: 19,
        schedule_enabled: false,
      },
    );
    setLogs((l as ReportLog[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading || !isAdmin) return;
    load();
  }, [authLoading, isAdmin]);

  if (!authLoading && !isAdmin) return <Navigate to="/" replace />;

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    const { error } = await supabase.from("report_settings").upsert({
      id: 1,
      webhook_url: settings.webhook_url?.trim() || null,
      recipient_numbers: settings.recipient_numbers,
      schedule_hour: settings.schedule_hour,
      schedule_enabled: settings.schedule_enabled,
    });
    setSaving(false);
    if (error) setError(error.message);
    else setSuccess("Configuração salva!");
  };

  const sendNow = async () => {
    setSending(true);
    setError(null);
    setSuccess(null);
    const { data, error } = await supabase.functions.invoke("send-daily-report", {
      body: { mode: "manual" },
    });
    setSending(false);
    if (error || data?.error) {
      setError(error?.message || data?.error || "Erro ao enviar");
    } else {
      setSuccess(`Relatório enviado para ${data?.recipients} número(s)!`);
      load();
    }
  };

  const addPhone = () => {
    const digits = newPhone.replace(/\D/g, "");
    if (digits.length < 12) {
      setError("Número inválido. Use formato internacional, ex: +55 11 99999-9999");
      return;
    }
    if (settings && !settings.recipient_numbers.includes(digits)) {
      setSettings({ ...settings, recipient_numbers: [...settings.recipient_numbers, digits] });
    }
    setNewPhone("");
    setError(null);
  };

  const removePhone = (digits: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      recipient_numbers: settings.recipient_numbers.filter((n) => n !== digits),
    });
  };

  if (loading || !settings) {
    return <p style={{ color: "var(--text-muted)" }}>Carregando…</p>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {error && (
        <div className="p-3 rounded-lg" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444", color: "#fecaca" }}>
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid #22c55e", color: "#bbf7d0" }}>
          {success}
        </div>
      )}

      {/* Webhook n8n */}
      <section className="glass rounded-2xl p-6">
        <h2 style={{ fontFamily: "Montserrat, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
          Webhook do n8n
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, marginBottom: 16 }}>
          URL do webhook que recebe o relatório e envia via WhatsApp. Crie um workflow no n8n com um nó <strong>Webhook</strong> + nó <strong>WhatsApp</strong>.
        </p>
        <input
          type="url"
          placeholder="https://seu-n8n.app/webhook/relatorio-diario"
          value={settings.webhook_url || ""}
          onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
          className="w-full px-3 py-2 rounded-lg"
          style={{ background: "rgba(0,0,0,0.4)", border: "1px solid var(--glass-border)", color: "var(--text-primary)", fontSize: 13 }}
        />
      </section>

      {/* Números */}
      <section className="glass rounded-2xl p-6">
        <h2 style={{ fontFamily: "Montserrat, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
          Números que recebem o relatório
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, marginBottom: 16 }}>
          Adicione no formato internacional (ex: +55 11 99999-9999). Cada número receberá a mesma mensagem.
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="tel"
            placeholder="+55 11 99999-9999"
            value={newPhone}
            onChange={(e) => setNewPhone(maskPhone(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && addPhone()}
            className="flex-1 px-3 py-2 rounded-lg"
            style={{ background: "rgba(0,0,0,0.4)", border: "1px solid var(--glass-border)", color: "var(--text-primary)", fontSize: 13 }}
          />
          <button
            onClick={addPhone}
            className="px-4 py-2 rounded-lg font-semibold"
            style={{ background: "var(--gold)", color: "#0a0a0a", fontSize: 13 }}
          >
            Adicionar
          </button>
        </div>
        {settings.recipient_numbers.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Nenhum número cadastrado.</p>
        ) : (
          <ul className="space-y-2">
            {settings.recipient_numbers.map((n) => (
              <li
                key={n}
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--glass-border)" }}
              >
                <span style={{ color: "var(--text-primary)", fontSize: 13 }}>{maskPhone(n)}</span>
                <button
                  onClick={() => removePhone(n)}
                  className="text-xs px-2 py-1 rounded"
                  style={{ background: "rgba(239,68,68,0.15)", color: "#fecaca", border: "1px solid rgba(239,68,68,0.3)" }}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Agendamento */}
      <section className="glass rounded-2xl p-6">
        <h2 style={{ fontFamily: "Montserrat, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
          Agendamento automático
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, marginBottom: 16 }}>
          Quando ativo, o relatório é enviado todo dia no horário escolhido (fuso de Brasília).
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.schedule_enabled}
              onChange={(e) => setSettings({ ...settings, schedule_enabled: e.target.checked })}
              className="w-10 h-5 appearance-none rounded-full cursor-pointer transition-all"
              style={{ background: settings.schedule_enabled ? "var(--gold)" : "rgba(255,255,255,0.15)" }}
            />
            <span style={{ color: "var(--text-primary)", fontSize: 13 }}>
              {settings.schedule_enabled ? "Ativado" : "Desativado"}
            </span>
          </label>
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Horário:</span>
            <select
              value={settings.schedule_hour}
              onChange={(e) => setSettings({ ...settings, schedule_hour: parseInt(e.target.value, 10) })}
              className="px-3 py-2 rounded-lg"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid var(--glass-border)", color: "var(--text-primary)", fontSize: 13 }}
            >
              {Array.from({ length: 24 }).map((_, h) => (
                <option key={h} value={h}>{`${String(h).padStart(2, "0")}:00`}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Ações */}
      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg font-semibold flex-1"
          style={{ background: "var(--gold)", color: "#0a0a0a", fontSize: 14, opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Salvando…" : "Salvar configurações"}
        </button>
        <button
          onClick={sendNow}
          disabled={sending}
          className="px-5 py-2.5 rounded-lg font-semibold"
          style={{
            background: "rgba(34,197,94,0.15)",
            border: "1px solid #22c55e",
            color: "#bbf7d0",
            fontSize: 14,
            opacity: sending ? 0.6 : 1,
          }}
        >
          {sending ? "Enviando…" : "📤 Enviar agora"}
        </button>
      </div>

      {/* Histórico */}
      <section className="glass rounded-2xl p-6">
        <h2 style={{ fontFamily: "Montserrat, sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
          Histórico de envios
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, marginBottom: 12 }}>
          Últimos 20 envios
        </p>
        {logs.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Nenhum envio ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                <th className="text-left py-2 px-2" style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Quando</th>
                <th className="text-left py-2 px-2" style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Modo</th>
                <th className="text-left py-2 px-2" style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Destinatários</th>
                <th className="text-left py-2 px-2" style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td className="py-2 px-2" style={{ color: "var(--text-muted)", fontSize: 12 }}>{formatDate(log.created_at)}</td>
                  <td className="py-2 px-2" style={{ color: "var(--text-primary)", fontSize: 12 }}>{log.mode === "manual" ? "Manual" : "Automático"}</td>
                  <td className="py-2 px-2" style={{ color: "var(--text-primary)", fontSize: 12 }}>{log.recipients?.length ?? 0}</td>
                  <td className="py-2 px-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{
                        background: log.success ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                        color: log.success ? "#22c55e" : "#fecaca",
                        fontWeight: 600,
                      }}
                    >
                      {log.success ? "Enviado" : `Falhou (${log.n8n_status ?? "—"})`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
