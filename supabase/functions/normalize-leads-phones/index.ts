// ============================================================
// Edge Function: normalize-leads-phones
// Normaliza todos os telefones da tabela leads (CRM externo)
// para o formato: +55 DD 9XXXXXXXX
// Apenas admin pode disparar.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Retorna telefone no formato "+55 DD 9XXXXXXXX" ou null se não der para normalizar.
export function formatPhoneBR(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = String(raw).replace(/\D/g, "");
  if (!d) return null;

  // Tira DDI 55 inicial (se já tiver e o resto fizer sentido)
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) {
    d = d.slice(2);
  }
  // Tira 0 inicial (ex: 021...)
  while (d.startsWith("0")) d = d.slice(1);

  // Agora esperamos DDD (2) + assinante (8 ou 9)
  if (d.length < 10 || d.length > 11) return null;

  const ddd = d.slice(0, 2);
  let sub = d.slice(2);

  // DDD válido brasileiro: 11..99, não começa com 0
  if (!/^[1-9][1-9]$/.test(ddd)) return null;

  if (sub.length === 8) {
    sub = "9" + sub;
  } else if (sub.length === 9) {
    if (sub[0] !== "9") {
      // Fixo de 9 dígitos é improvável; forçamos prefixo 9 para padronizar móvel.
      sub = "9" + sub.slice(1);
    }
  } else {
    return null;
  }

  return `+55 ${ddd} ${sub}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const EXT_SERVICE = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY");
    if (!EXT_URL || !EXT_SERVICE) {
      return new Response(JSON.stringify({ error: "CRM externo não configurado" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const crm = createClient(EXT_URL, EXT_SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Auth admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await crm.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roles } = await crm
      .from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas admin pode normalizar telefones" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({} as any));
    const dryRun = body?.dry_run === true;

    // Busca todos os leads
    const { data: leads, error: selErr } = await crm
      .from("leads").select("id, phone").not("phone", "is", null);
    if (selErr) {
      return new Response(JSON.stringify({ error: selErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let alreadyOk = 0;
    let toUpdate: Array<{ id: string; from: string; to: string }> = [];
    let invalid: Array<{ id: string; phone: string }> = [];

    for (const l of leads || []) {
      const original = String(l.phone || "");
      const formatted = formatPhoneBR(original);
      if (!formatted) {
        invalid.push({ id: l.id, phone: original });
        continue;
      }
      if (formatted === original) {
        alreadyOk++;
      } else {
        toUpdate.push({ id: l.id, from: original, to: formatted });
      }
    }

    let updated = 0;
    if (!dryRun) {
      // Updates individuais em paralelo limitado
      const chunkSize = 25;
      for (let i = 0; i < toUpdate.length; i += chunkSize) {
        const chunk = toUpdate.slice(i, i + chunkSize);
        const results = await Promise.all(chunk.map(u =>
          crm.from("leads").update({ phone: u.to }).eq("id", u.id)
        ));
        updated += results.filter(r => !r.error).length;
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      dry_run: dryRun,
      total: leads?.length || 0,
      already_ok: alreadyOk,
      to_update: toUpdate.length,
      updated,
      invalid_count: invalid.length,
      invalid_sample: invalid.slice(0, 20),
      update_sample: toUpdate.slice(0, 20),
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("normalize-leads-phones error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
