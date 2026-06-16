## Diagnóstico

"Failed to fetch" acontece porque o projeto tem **dois Supabase**:

- **Lovable Cloud** (`lzgdvvapzmuogtlivzxa`) — onde edge functions são deployadas automaticamente. É para lá que o `seed-test-leads` foi.
- **CRM externo** (`gycrprnkuwlzntqvpoxl`) — onde fica o banco de dados real (leads, profiles) e onde o usuário se autentica via `src/lib/supabase.ts`.

O helper `invokeCloudFunction` em `src/lib/cloudFunctions.ts` aponta para o **CRM externo**, mas a função `seed-test-leads` não existe lá → preflight CORS volta 404 → "Failed to fetch".

## Correção

### 1. `supabase/config.toml`
Adicionar bloco para desabilitar `verify_jwt` (a função já faz validação de admin internamente contra o CRM externo):
```toml
[functions.seed-test-leads]
verify_jwt = false
```

### 2. `src/pages/Roleta.tsx` — trocar a invocação
Em vez de usar `invokeCloudFunction` (que vai pro CRM externo), chamar a função no Lovable Cloud passando o token do CRM externo no header. Igual ao padrão de `auto-fill-leads`, mas com URL e anon key do Lovable Cloud (que estão em `.env` como `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`).

Substituir o `handleSeed` por:
```ts
const handleSeed = async () => {
  if (!window.confirm("Gerar 100 leads...?")) return;
  setSeeding(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) { toast.error("Não autenticado"); return; }
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-test-leads`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ count: 100 }),
      }
    );
    const data = await res.json();
    if (!res.ok) { toast.error(`Falha: ${data?.error || res.status}`); return; }
    const per = data?.perCorretor || {};
    const breakdown = Object.entries(per).map(([n,q]) => `${n}: ${q}`).join(" • ");
    toast.success(`${data?.created ?? 0} leads criados${breakdown ? ` — ${breakdown}` : ""}`);
  } finally { setSeeding(false); }
};
```
Adicionar `import { supabase } from "../lib/supabase";` no topo.

## O que NÃO muda

- `seed-test-leads/index.ts` continua igual — ele já valida admin contra `EXTERNAL_SUPABASE_URL` usando o Bearer recebido, que é exatamente o token do CRM externo que o app usa.
- `cloudFunctions.ts`, `useLeads`, `useRoleta`, etc. — intocados.

Posso aplicar?