import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

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
  const [debugging, setDebugging] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [debug, setDebug] = useState<any>(null);
  const [fbAppId, setFbAppId] = useState<string | null>(null);

  useEffect(() => {
    invokeCloudFunction<{ fb_app_id: string | null }>("fb-public-config", { method: "GET" })
      .then(({ data }) => setFbAppId(data?.fb_app_id ?? null));

    // Verifica se já existe conexão salva ao carregar a página
    invokeCloudFunction("fb-token-check", { method: "GET" }).then(({ data, error }) => {
      if (error || !data) return;
      const info = data?.debug_token?.data || {};
      const granted: string[] = info.scopes || [];
      const missing = REQUIRED.filter((p) => !granted.includes(p));
      const isOk = missing.length === 0 && info.is_valid === true;
      setCheck({
        ok: isOk,
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
      if (isOk) {
        setSaveMsg({ type: "ok", text: "Facebook já conectado ✅" });
      }
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get("fb_oauth");
    if (!oauthStatus) return;

    const ok = oauthStatus === "success";
    const message = params.get("message") || (ok ? "Facebook conectado com sucesso!" : "Falha ao conectar com o Facebook.");
    setSaveMsg({ type: ok ? "ok" : "err", text: ok ? `${message} Validando conexão…` : message });
    window.history.replaceState({}, "", window.location.pathname);

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ source: "fb-oauth", ok, message }, window.location.origin);
        window.close();
      }
    } catch {}

    if (ok) {
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
        setSaveMsg({ type: missing.length === 0 && info.is_valid === true ? "ok" : "err", text: missing.length === 0 && info.is_valid === true ? "Conexão confirmada! ✅" : "Facebook salvou o retorno, mas a validação ainda não confirmou o token." });
      });
    }
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
        body: { dry_run: true },
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
  async function pollJobStatus(jobId: string) {
    const maxAttempts = 60; // poll for up to 5 min
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const res = await fetch(
          `${CLOUD_FUNCTIONS_URL}/fb-sync-leads?job_id=${jobId}`,
          { headers: { "Content-Type": "application/json", ...(CLOUD_PUBLISHABLE_KEY ? { apikey: CLOUD_PUBLISHABLE_KEY } : {}) } },
        );
        const data = await res.json();
        setSyncResult(data);

        if (data.status === "completed") {
          setSyncing(false);
          if (data.created > 0) {
            toast.success(`${data.created} lead(s) importado(s) com sucesso!`);
          } else {
            toast(`Nenhum lead novo. ${data.skipped || 0} já existente(s).`);
          }
          return;
        }
        if (data.status === "failed") {
          setSyncing(false);
          toast.error(data.error || "Falha na sincronização");
          return;
        }
        // still processing — continue polling
      } catch {
        // network blip, keep polling
      }
    }
    setSyncing(false);
    toast.error("Timeout — verifique os logs de webhook.");
  }

  async function handleSyncLeads() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        toast.error("Você precisa estar logado para sincronizar.");
        setSyncing(false);
        return;
      }
      const { data, error } = await invokeCloudFunction("fb-sync-leads", {
        method: "POST",
        body: { max_pages: 10, limit: 100 },
        authToken: accessToken,
      });
      if (error) {
        toast.error(error);
        setSyncResult({ ok: false, error });
        setSyncing(false);
      } else if (data?.job_id) {
        toast("Sincronização iniciada! Acompanhando progresso…");
        setSyncResult({ status: "processing", message: "Processando leads…" });
        pollJobStatus(data.job_id);
      } else {
        setSyncResult(data);
        setSyncing(false);
      }
    } catch (e: any) {
      toast.error(String(e?.message || e));
      setSyncResult({ ok: false, error: String(e?.message || e) });
      setSyncing(false);
    }
  }

  
  

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
      `&auth_type=rerequest` +
      `&state=${encodeURIComponent(btoa(JSON.stringify({ return_to: `${window.location.origin}/integracao` })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""))}`;

    const w = 600, h = 720;
    const left = window.screen.width / 2 - w / 2;
    const top = window.screen.height / 2 - h / 2;
    const popup = window.open(
      authUrl,
      "fb-oauth",
      `width=${w},height=${h},left=${left},top=${top}`,
    );

    // Detecta popup bloqueado: oferece abrir na mesma aba
    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      setSaveMsg({
        type: "err",
        text: "Pop-up bloqueado pelo navegador. Liberando e abrindo na mesma aba…",
      });
      setTimeout(() => {
        window.location.href = authUrl;
      }, 1200);
      return;
    }

    setSaveMsg({ type: "ok", text: "Janela do Facebook aberta. Autorize a página Salles Imóveis para continuar…" });

    let resolved = false;
    let pollTimer: number | null = null;
    let watchdogTimer: number | null = null;

    function cleanup() {
      window.removeEventListener("message", onMsg);
      if (pollTimer) window.clearInterval(pollTimer);
      if (watchdogTimer) window.clearTimeout(watchdogTimer);
    }

    async function refreshCheck() {
      const { data } = await invokeCloudFunction("fb-token-check", { method: "GET" });
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
      return missing.length === 0 && info.is_valid === true;
    }

    const onMsg = async (ev: MessageEvent) => {
      if (ev.data?.source !== "fb-oauth") return;
      resolved = true;
      cleanup();
      try { popup.close(); } catch {}
      if (ev.data.ok) {
        setSaveMsg({ type: "ok", text: ev.data.message || "Facebook conectado! Validando…" });
        await refreshCheck();
      } else {
        setSaveMsg({ type: "err", text: ev.data.message || "Falha ao conectar." });
      }
    };
    window.addEventListener("message", onMsg);

    // Fallback 1: usuário fechou o popup manualmente sem completar (ou o callback não conseguiu postMessage)
    pollTimer = window.setInterval(async () => {
      if (resolved) return;
      let isClosed = false;
      try { isClosed = popup.closed; } catch { isClosed = true; }
      if (isClosed) {
        cleanup();
        // Tenta validar mesmo assim — pode ter salvo o token antes de fechar
        setSaveMsg({ type: "ok", text: "Janela fechada. Verificando se a conexão foi salva…" });
        const ok = await refreshCheck();
        if (!ok) {
          setSaveMsg({
            type: "err",
            text: "A janela foi fechada antes de concluir. Tente novamente ou cole o token manualmente abaixo.",
          });
        } else {
          setSaveMsg({ type: "ok", text: "Conexão confirmada! ✅" });
        }
      }
    }, 800);

    // Fallback 2: travou por mais de 3 minutos — pergunta ao usuário
    watchdogTimer = window.setTimeout(() => {
      if (resolved) return;
      cleanup();
      try { popup.close(); } catch {}
      setSaveMsg({
        type: "err",
        text: "A autorização demorou demais. Verifique se concluiu no Facebook e clique em '🐞 Diagnóstico' para confirmar, ou tente de novo.",
      });
    }, 180_000);
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
          disabled={!fbAppId}
          className="mt-4 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all inline-flex items-center gap-2"
          style={{
            background: !fbAppId ? "rgba(24,119,242,0.4)" : "#1877F2",
            color: "#fff",
            boxShadow: "0 4px 14px rgba(24,119,242,0.35)",
            cursor: !fbAppId ? "wait" : "pointer",
          }}
        >
          <span style={{ fontSize: 16 }}>🔗</span>
          {fbAppId ? "Conectar com Facebook" : "Carregando..."}
        </button>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={handleDebug}
            disabled={debugging}
            className="px-4 py-2 rounded-xl font-semibold text-xs transition-all"
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

        <div className="mt-4 space-y-3">
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

      {/* Sincronização Emergencial */}
      <div className="glass rounded-2xl p-6" style={{ border: "1px solid var(--glass-border)" }}>
        <h2 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 18, color: "var(--gold)" }}>
          ⚡ Sincronização Emergencial
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
          Importa leads diretamente da API do Facebook, ignorando o webhook. Use quando os leads não estão chegando automaticamente.
        </p>
        <button
          onClick={handleSyncLeads}
          disabled={syncing}
          className="mt-4 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all inline-flex items-center gap-2"
          style={{
            background: syncing ? "rgba(239,68,68,0.4)" : "linear-gradient(135deg, #ef4444, #f97316)",
            color: "#fff",
            boxShadow: "0 4px 14px rgba(239,68,68,0.35)",
            cursor: syncing ? "not-allowed" : "pointer",
          }}
        >
          <span style={{ fontSize: 16 }}>{syncing ? "⏳" : "🔄"}</span>
          {syncing ? "Sincronizando..." : "Importar Leads Agora"}
        </button>

        {syncResult && (
          <div
            className="mt-4 rounded-lg px-4 py-3 text-sm space-y-1"
            style={{
              background: syncResult.status === "processing" ? "rgba(59,130,246,0.12)"
                : syncResult.status === "completed" ? "rgba(34,197,94,0.12)"
                : syncResult.status === "failed" || syncResult.ok === false ? "rgba(239,68,68,0.12)"
                : "rgba(34,197,94,0.12)",
              border: `1px solid ${syncResult.status === "processing" ? "rgba(59,130,246,0.4)"
                : syncResult.status === "failed" || syncResult.ok === false ? "rgba(239,68,68,0.4)"
                : "rgba(34,197,94,0.4)"}`,
              color: syncResult.status === "processing" ? "#93c5fd"
                : syncResult.status === "failed" || syncResult.ok === false ? "#fca5a5"
                : "#86efac",
            }}
          >
            {syncResult.status === "processing" && (
              <p>⏳ {syncResult.message || "Processando leads em segundo plano…"}</p>
            )}
            {syncResult.status === "completed" && (
              <>
                <p>✅ Sincronização concluída</p>
                <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                  Formulários: {syncResult.forms_checked} · Encontrados: {syncResult.fetched} · 
                  Novos: <strong style={{ color: "#86efac" }}>{syncResult.created}</strong> · 
                  Já existentes: {syncResult.skipped}
                  {syncResult.errors?.length > 0 && ` · Erros: ${syncResult.errors.length}`}
                </p>
              </>
            )}
            {(syncResult.status === "failed" || syncResult.ok === false) && (
              <p>❌ {syncResult.error || "Erro desconhecido"}</p>
            )}
            {!syncResult.status && syncResult.ok !== false && (
              <p>✅ {syncResult.message || "Operação concluída"}</p>
            )}
          </div>
        )}
      </div>
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
