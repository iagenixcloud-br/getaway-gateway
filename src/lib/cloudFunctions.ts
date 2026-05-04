import { supabase } from "./supabase";

/**
 * Invoca edge functions hospedadas no Lovable Cloud,
 * passando o token de autenticação do Supabase externo.
 */
export async function invokeCloudFunction(
  fnName: string,
  body: Record<string, unknown>
): Promise<{ data: any; error: any }> {
  const CLOUD_URL = import.meta.env.VITE_SUPABASE_URL; // Lovable Cloud URL
  const CLOUD_ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // Pega o token da sessão do supabase externo (onde o usuário está logado)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) {
    return { data: null, error: { message: "Não autenticado" } };
  }

  try {
    const res = await fetch(`${CLOUD_URL}/functions/v1/${fnName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: CLOUD_ANON,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return { data: null, error: { message: data?.error || `Erro ${res.status}` } };
    }
    return { data, error: null };
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : "Erro de rede" } };
  }
}
