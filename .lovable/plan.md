# Extrato Mensal de Cobrança — Aba Assinaturas

Adicionar geração de extrato mensal por mês/ano com prévia em tabela e exportação em PDF timbrado da IA Genix.

## 1. Upload da logo

Salvar a imagem enviada como asset do projeto via `lovable-assets` a partir de `/mnt/user-uploads/07a125a3-5849-4c71-9c5e-2c1e7d33df53.jpeg`, gerando `src/assets/ia-genix-logo.jpg.asset.json` para import no componente.

## 2. Backend — RPC `extrato_mensal`

Criar migration com a função exata já validada (retorna os 16 corretores ativos):

```sql
create or replace function extrato_mensal(mes_referencia date)
returns table (
  profile_id uuid,
  nome text,
  email text,
  valor numeric
) as $$
  select
    p.id,
    p.name,
    p.email,
    50.00 as valor
  from profiles p
  join profile_status_historico h on h.profile_id = p.id
  where h.is_active = true
    and h.data_inicio <= (date_trunc('month', mes_referencia) + interval '1 month - 1 day')::date
    and (h.data_fim is null or h.data_fim >= date_trunc('month', mes_referencia)::date)
  group by p.id, p.name, p.email
  order by p.name;
$$ language sql stable;
```

Complementos na mesma migration: `SET search_path = public`, `SECURITY DEFINER`, e `GRANT EXECUTE ... TO authenticated`. Sem filtro por `user_roles` — a fonte da verdade é `profile_status_historico`.

## 3. UI — `src/pages/Assinaturas.tsx`

Acima dos cards atuais, adicionar barra de controles:

- Dois `<select>` estilizados (glass): **Mês** (Jan–Dez pt-BR) e **Ano** (atual −2 até atual +1). Default: mês/ano atuais.
- Botão **"Gerar extrato"** (dourado) → chama `supabase.rpc("extrato_mensal", { mes_referencia: "YYYY-MM-01" })` e guarda o resultado em estado.
- Botão **"Baixar PDF"** (secundário) → habilitado somente quando há extrato gerado.

Abaixo, seção **Prévia do Extrato** (glass card):

- Tabela: Nome | Email | Valor (R$ 50,00).
- Bloco de totais alinhado à direita:
  - Licença CRM: R$ 600,00
  - Usuários: `N × R$ 50,00 = R$ X`
  - **Total geral: R$ (X + 600)** (destaque em dourado)

Os cards existentes no topo continuam refletindo o mês corrente (comportamento atual preservado).

Responsivo: controles em `flex-wrap`, tabela em `overflow-x:auto`.

## 4. PDF — jsPDF + jspdf-autotable

Instalar `jspdf` e `jspdf-autotable`. Criar helper `src/lib/extratoPdf.ts` com função `gerarExtratoPDF({ mes, ano, linhas, totais })`:

- A4 retrato, margens 15mm.
- **Cabeçalho**: logo IA Genix à esquerda (~15mm altura, via `addImage` a partir do asset carregado como dataURL). Ao lado: "IA Genix" (bold 12pt), "CNPJ 62.468.644/0001-66", "Rua Prefeito José Basílio de Alvarenga, Centro — Santa Isabel/SP — CEP 07500-000".
- **Bloco Cliente** (abaixo, com linha separadora): "Cliente: Andrade Consultoria Imobiliária", "CNPJ 53.573.430/0001-69", "Rua General Andrade Neves, nº 85, Centro — Niterói/RJ".
- **Título centralizado**: `Extrato de Cobrança — {Mês}/{Ano}` (bold 14pt).
- **Tabela** (autoTable): Nome | Email | Valor (R$). Cabeçalho preto/dourado.
- **Totais** abaixo da tabela, alinhados à direita:
  - Licença CRM: R$ 600,00
  - Total de usuários: N × R$ 50,00 = R$ X
  - **Total geral: R$ Y** (bold)
- **Rodapé** (em toda página, via `didDrawPage`):
  - Linha 1: "Conforme Cláusulas 5 e 6 do Contrato de Prestação de Serviços"
  - Linha 2: `Emitido em DD/MM/AAAA` + numeração de página à direita
- Salvar como `extrato-ia-genix-YYYY-MM.pdf`.

## 5. Aspectos técnicos

- Logo convertida para dataURL uma vez no mount (fetch do `asset.json.url` → blob → base64) e reutilizada.
- Formatação monetária: helper `formatCurrency` já existente na página.
- Nomes de meses em pt-BR via `Intl.DateTimeFormat`.
- Sem mudanças em RLS de outras tabelas; nenhuma alteração no fluxo de auth existente.

## Arquivos afetados

```text
src/assets/ia-genix-logo.jpg.asset.json      (novo, via lovable-assets)
supabase/migrations/<ts>_extrato_mensal.sql  (RPC validada)
src/lib/extratoPdf.ts                         (novo helper de PDF)
src/pages/Assinaturas.tsx                     (controles + prévia + botões)
package.json                                  (+ jspdf, jspdf-autotable)
```
