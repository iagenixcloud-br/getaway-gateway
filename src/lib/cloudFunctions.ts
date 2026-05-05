import { supabase } from "./supabase";

const SUPABASE_URL = "https://gycrprnkuwlzntqvpoxl.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5Y3Jwcm5rdXdsem50cXZwb3hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNzEyMzQsImV4cCI6MjA5MjY0NzIzNH0.w7RiS6L4gir4KIKWAZxdmXutyp7EDxIu9z62n0QUoRM";

/**
 * Invoca edge functions hospedadas no Supabase externo,
 * passando o token de autenticação do usuário logado.
 */
export async function invokeCloudFunction(
  fnName: string,
  body: Record<string, unknown>
): Promise<{ data: any; error: any }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) {
    return { data: null, error: { message: "Não autenticado" } };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
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
