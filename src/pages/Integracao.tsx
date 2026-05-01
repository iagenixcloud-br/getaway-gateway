import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type CheckResult = {
  ok: boolean;
  page_name?: string;
  page_id?: string;
  token_type?: string;
  is_permanent?: boolean;
  expires_in_days?: number | null;
  scopes?: string[];
  missing?: string[];
  raw?: any;
};

const REQUIRED = [
  "leads_retrieval",
  "pages_manage_metadata",
  "pages_show_list",
  "pages_read_engagement",
];

const CLOUD_FUNCTIONS_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || "lzgdvvapzmuogtlivzxa"}.supabase.co/functions/v1`;
const CLOUD_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

async function invokeCloudFunction<T = any>(
  name: string,
  options: { method?: "GET" | "POST"; body?: unknown; authToken?: string } = {},
): Promise<{ data: T | null; error: string | null; status: number }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (CLOUD_PUBLISHABLE_KEY) headers.apikey = CLOUD_PUBLISHABLE_KEY;
  if (options.authToken) headers.Authorization = `Bearer ${options.authToken}`;

  const response = await fetch(`${CLOUD_FUNCTIONS_URL}/${name}`, {
    method: options.method || "POST",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const text = await response.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text ? { raw: text } : null;
  }

  if (!response.ok) {
    return {
      data,
      error: data?.error || data?.message || `Erro ${response.status} ao chamar ${name}`,
      status: response.status,
    };
  }

  return { data, error: null, status: response.status };
}

export function Integracao() {
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [debugging, setDebugging] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [debug, setDebug] = useState<any>(null);
  const [fbAppId, setFbAppId] = useState<string | null>(null);

  useEffect(() => {
    invokeCloudFunction<{ fb_app_id: string | null }>("fb-public-config", { method: "GET" })
      .then(({ data }) => setFbAppId(data?.fb_app_id ?? null));
  }, []);

  async function handleDebug() {
    setSaveMsg(null);
    setDebug(null);
    setDebugging(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setDebug({ ok: false, step: "session", error: "Nenhuma sessão ativa no navegador" });
        return;
      }
      const { data, error } = await invokeCloudFunction("fb-save-token", {
        body: { dry_run: true, token: token.trim() || undefined },
        authToken: accessToken,
      });
      if (error) {
        setDebug({ ok: false, step: "invoke", error, raw: data });
      } else {
        setDebug(data);
      }
    } catch (e: any) {
      setDebug({ ok: false, step: "exception", error: String(e?.message || e) });
    } finally {
      setDebugging(false);
    }
  }

  async function handleSaveAndValidate() {
    setSaveMsg(null);
    setCheck(null);

    if (!token.trim() || token.trim().length < 50) {
      setSaveMsg({ type: "err", text: "Cole um token válido (muito curto)." });
      return;
    }

    // 1) Salvar via edge function (passa o JWT do usuário explicitamente)
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setSaveMsg({ type: "err", text: "Sessão expirada. Faça login novamente." });
        setSaving(false);
        return;
      }
      const { data, error } = await invokeCloudFunction("fb-save-token", {
        body: { token: token.trim() },
        authToken: accessToken,
      });
      if (error || !data?.ok) {
        setSaveMsg({
          type: "err",
          text: data?.error || error || "Erro ao salvar o token.",
        });
        setSaving(false);
        return;
      }
      setSaveMsg({ type: "ok", text: "Token salvo com sucesso! Validando..." });
    } catch (e: any) {
      setSaveMsg({ type: "err", text: String(e?.message || e) });
      setSaving(false);
      return;
    }
    setSaving(false);

    // 2) Validar chamando fb-token-check
    setChecking(true);
    try {
      // Pequeno delay para o secret propagar
      await new Promise((r) => setTimeout(r, 1500));
      const { data, error } = await invokeCloudFunction("fb-token-check", {
        method: "GET",
      });
      if (error) {
        setCheck({ ok: false, raw: { error } });
        return;
      }
      const info = data?.debug_token?.data || {};
      const granted: string[] = info.scopes || [];
      const missing = REQUIRED.filter((p) => !granted.includes(p));
      setCheck({
        ok: missing.length === 0 && info.is_valid === true,
        page_name: data?.me?.name,
        page_id: data?.me?.id,
        token_type: info.type,
        is_permanent: info.expires_at === 0,
        expires_in_days:
          info.expires_at && info.expires_at > 0
            ? Math.round((info.expires_at - Date.now() / 1000) / 86400)
            : null,
        scopes: granted,
        missing,
        raw: data,
      });
      setToken(""); // limpa o campo após sucesso
    } catch (e: any) {
      setCheck({ ok: false, raw: { error: String(e?.message || e) } });
    } finally {
      setChecking(false);
    }
  }

  async function handleGenerateLongLived() {
    setSaveMsg(null);
    setCheck(null);
    setChecking(true);
    try {
      const { data, error } = await invokeCloudFunction("fb-token-extend", {
        method: "POST",
      });
      if (error) {
        setSaveMsg({ type: "err", text: error });
        return;
      }
      if (data?.new_token) {
        setToken(data.new_token);
        setSaveMsg({
          type: "ok",
          text: data.is_permanent
            ? "✅ Token permanente gerado! Clique em 'Salvar e Validar' abaixo."
            : `⚠️ Token gerado (expira em ${data.expires_in_days} dias). Salve abaixo.`,
        });
      } else {
        setSaveMsg({ type: "err", text: "Não foi possível gerar o token. Verifique o FB_PAGE_TOKEN atual." });
      }
    } catch (e: any) {
      setSaveMsg({ type: "err", text: String(e?.message || e) });
    } finally {
      setChecking(false);
    }
  }

  const busy = saving || checking;

  const FB_REDIRECT_URI = `${CLOUD_FUNCTIONS_URL}/fb-oauth-callback`;
  const FB_SCOPES = [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_metadata",
    "leads_retrieval",
    "pages_manage_ads",
  ].join(",");

  function handleConnectFacebook() {
    setSaveMsg(null);
    setCheck(null);
    if (!fbAppId) {
      setSaveMsg({ type: "err", text: "FB_APP_ID não configurado no backend." });
      return;
    }
    const authUrl =
      `https://www.facebook.com/v21.0/dialog/oauth?` +
      `client_id=${fbAppId}` +
      `&redirect_uri=${encodeURIComponent(FB_REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(FB_SCOPES)}` +
      `&response_type=code` +
      `&auth_type=rerequest`;

    const w = 600, h = 720;
    const left = window.screen.width / 2 - w / 2;
    const top = window.screen.height / 2 - h / 2;
    const popup = window.open(
      authUrl,
      "fb-oauth",
      `width=${w},height=${h},left=${left},top=${top}`,
    );
    if (!popup) {
      setSaveMsg({ type: "err", text: "Pop-up bloqueado. Permita pop-ups e tente de novo." });
      return;
    }

    const onMsg = (ev: MessageEvent) => {
      if (ev.data?.source !== "fb-oauth") return;
      window.removeEventListener("message", onMsg);
      if (ev.data.ok) {
        setSaveMsg({ type: "ok", text: ev.data.message || "Facebook conectado!" });
        // valida o token salvo
        invokeCloudFunction("fb-token-check", { method: "GET" }).then(({ data }) => {
          const info = data?.debug_token?.data || {};
          const granted: string[] = info.scopes || [];
          const missing = REQUIRED.filter((p) => !granted.includes(p));
          setCheck({
            ok: missing.length === 0 && info.is_valid === true,
            page_name: data?.me?.name,
            page_id: data?.me?.id,
            token_type: info.type,
            is_permanent: info.expires_at === 0,
            expires_in_days:
              info.expires_at && info.expires_at > 0
                ? Math.round((info.expires_at - Date.now() / 1000) / 86400)
                : null,
            scopes: granted,
            missing,
            raw: data,
          });
        });
      } else {
        setSaveMsg({ type: "err", text: ev.data.message || "Falha ao conectar." });
      }
    };
    window.addEventListener("message", onMsg);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Botão OAuth - método recomendado */}
      <div className="glass rounded-2xl p-6" style={{ border: "1px solid var(--glass-border)" }}>
        <h2 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 18, color: "var(--gold)" }}>
          Conectar com Facebook
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
          Autorize a página Salles Imóveis em um clique. O token permanente é salvo automaticamente
          e o webhook de leads é ativado.
        </p>
        <button
          onClick={handleConnectFacebook}
          className="mt-4 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all inline-flex items-center gap-2"
          style={{
            background: "#1877F2",
            color: "#fff",
            boxShadow: "0 4px 14px rgba(24,119,242,0.35)",
          }}
        >
          <span style={{ fontSize: 16 }}>🔗</span> Conectar com Facebook
        </button>
      </div>

      <div className="glass rounded-2xl p-6" style={{ border: "1px solid var(--glass-border)" }}>
        <h2 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 18, color: "var(--gold)" }}>
          Ou cole um token manualmente
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
          Use só se o botão acima não funcionar. Cole o Page Access Token gerado no Graph API Explorer.
        </p>

        <div className="mt-5 space-y-3">
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="EAA... (cole o token aqui)"
            rows={4}
            className="w-full rounded-xl px-4 py-3 font-mono text-xs"
            style={{
              background: "rgba(0,0,0,0.35)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
              outline: "none",
              resize: "vertical",
            }}
          />

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSaveAndValidate}
              disabled={busy || !token.trim()}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: busy
                  ? "rgba(212,175,55,0.3)"
                  : "linear-gradient(135deg, #e8c84a 0%, #D4AF37 50%, #b8960c 100%)",
                color: "#0a0a0a",
                cursor: busy || !token.trim() ? "not-allowed" : "pointer",
                opacity: !token.trim() ? 0.5 : 1,
                boxShadow: "0 4px 14px rgba(212,175,55,0.3)",
              }}
            >
              {saving ? "Salvando..." : checking ? "Validando..." : "💾 Salvar e Validar"}
            </button>

            <button
              onClick={handleGenerateLongLived}
              disabled={busy}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
                cursor: busy ? "not-allowed" : "pointer",
              }}
              title="Converte o FB_PAGE_TOKEN atual em um token permanente"
            >
              🔄 Gerar Token Permanente
            </button>

            <button
              onClick={handleDebug}
              disabled={debugging}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: "rgba(59,130,246,0.12)",
                border: "1px solid rgba(59,130,246,0.4)",
                color: "#93c5fd",
                cursor: debugging ? "not-allowed" : "pointer",
              }}
              title="Testa auth + role + Facebook sem gravar nada"
            >
              {debugging ? "Diagnosticando..." : "🐞 Diagnóstico"}
            </button>
          </div>

          {saveMsg && (
            <div
              className="rounded-lg px-4 py-3 text-sm"
              style={{
                background: saveMsg.type === "ok" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                border: `1px solid ${saveMsg.type === "ok" ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
                color: saveMsg.type === "ok" ? "#86efac" : "#fca5a5",
              }}
            >
              {saveMsg.text}
            </div>
          )}

          {debug && (
            <div
              className="rounded-lg px-4 py-3 text-xs space-y-2"
              style={{
                background: "rgba(0,0,0,0.4)",
                border: `1px solid ${debug.ok ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
              }}
            >
              <p style={{ color: debug.ok ? "#86efac" : "#fca5a5", fontWeight: 600, fontSize: 13 }}>
                {debug.ok ? "✅ Diagnóstico OK" : `❌ Falhou${debug.step ? ` na etapa: ${debug.step}` : ""}`}
              </p>
              {debug.message && <p style={{ color: "var(--text-muted)" }}>{debug.message}</p>}
              {debug.error && <p style={{ color: "#fca5a5" }}>Erro: {debug.error}</p>}
              <pre
                className="overflow-auto rounded p-2 mt-2"
                style={{ background: "rgba(0,0,0,0.4)", color: "var(--text-muted)", fontSize: 10, maxHeight: 240 }}
              >
                {JSON.stringify(debug, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      {check && (
        <div className="glass rounded-2xl p-6" style={{ border: "1px solid var(--glass-border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <span style={{ fontSize: 22 }}>{check.ok ? "✅" : "⚠️"}</span>
            <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>
              Resultado da Validação
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Página" value={check.page_name || "—"} />
            <Info label="Page ID" value={check.page_id || "—"} />
            <Info label="Tipo" value={check.token_type || "—"} />
            <Info
              label="Validade"
              value={
                check.is_permanent
                  ? "Permanente ♾️"
                  : check.expires_in_days != null
                  ? `~${check.expires_in_days} dias`
                  : "—"
              }
              highlight={check.is_permanent ? "ok" : "warn"}
            />
          </div>

          <div className="mt-5">
            <p style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
              Permissões obrigatórias
            </p>
            <div className="flex flex-wrap gap-2">
              {REQUIRED.map((p) => {
                const ok = check.scopes?.includes(p);
                return (
                  <span
                    key={p}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono"
                    style={{
                      background: ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                      border: `1px solid ${ok ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
                      color: ok ? "#86efac" : "#fca5a5",
                    }}
                  >
                    {ok ? "✓" : "✗"} {p}
                  </span>
                );
              })}
            </div>
          </div>

          {check.scopes && check.scopes.length > 0 && (
            <div className="mt-4">
              <p style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                Todas as permissões do token
              </p>
              <div className="flex flex-wrap gap-1.5">
                {check.scopes.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-1 rounded text-[10px] font-mono"
                    style={{ background: "rgba(255,255,255,0.06)", color: "var(--text-muted)" }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Info({ label, value, highlight }: { label: string; value: string; highlight?: "ok" | "warn" }) {
  const color = highlight === "ok" ? "#86efac" : highlight === "warn" ? "#fcd34d" : "var(--text-primary)";
  return (
    <div
      className="rounded-lg px-3 py-2"
      style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--glass-border)" }}
    >
      <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
        {label}
      </p>
      <p style={{ fontSize: 13, color, marginTop: 2, fontWeight: 600 }}>{value}</p>
    </div>
  );
}
