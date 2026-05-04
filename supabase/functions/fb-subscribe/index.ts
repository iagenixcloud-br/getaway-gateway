import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const PAGE_ID = "101491475744542"; // Salles Imóveis
const FORM_ID = "849013068226913"; // Recreio 01 - Parcela Alta
console.log("fb-subscribe diagnostic function loaded", { page_id: PAGE_ID });

async function getFbToken(): Promise<string | null> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (url && key) {
      const admin = createClient(url, key);
      const { data } = await admin.from("integration_secrets").select("value").eq("name", "FB_PAGE_TOKEN").maybeSingle();
      if (data?.value) return data.value;
    }
  } catch (_) { /* fallback */ }
  return Deno.env.get("FB_PAGE_TOKEN") ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = await getFbToken();
  if (!token) {
    return new Response(JSON.stringify({ ok: false, error: "FB_PAGE_TOKEN não configurado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "list";

  try {
    if (action === "list") {
      // Lista apps inscritos atualmente
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${PAGE_ID}/subscribed_apps?access_token=${token}`,
      );
      const data = await res.json();
      const formRes = await fetch(
        `https://graph.facebook.com/v21.0/${FORM_ID}?fields=id,name,status&access_token=${token}`,
      );
      const form = await formRes.json();
      return new Response(JSON.stringify({ action: "list", page_id: PAGE_ID, form_id: FORM_ID, subscribed_apps: data, form }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "subscribe") {
      // Inscreve o app atual no campo leadgen (NÃO remove outros apps)
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${PAGE_ID}/subscribed_apps?subscribed_fields=leadgen&access_token=${token}`,
        { method: "POST" },
      );
      const data = await res.json();

      // Lista de novo pra confirmar que outros apps continuam
      const listRes = await fetch(
        `https://graph.facebook.com/v21.0/${PAGE_ID}/subscribed_apps?access_token=${token}`,
      );
      const listData = await listRes.json();

      return new Response(JSON.stringify({
        action: "subscribe",
        subscribe_result: data,
        all_subscribed_apps_after: listData,
      }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "action deve ser 'list' ou 'subscribe'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
