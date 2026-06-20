## Objetivo

Verificar se os campos `qual_entrada_desejada` e `ja_investe_em_imoveis` (e variações) existem nos formulários do Facebook e se estão chegando preenchidos nos leads. **Read-only, sem mexer no CRM.**

## Passos

### 1. Criar edge function temporária `fb-inspect-fields` (só leitura)

GET endpoint que, usando o `FB_PAGE_TOKEN` já salvo:

- Lista forms ativos da página `101491475744542` via `GET /{PAGE_ID}/leadgen_forms?fields=id,name,status`.
- Pra cada form ativo:
  - **Schema do form:** `GET /{FORM_ID}?fields=questions{key,label,type}` — mostra os campos configurados no Facebook (independente de ter lead).
  - **3 leads mais recentes:** `GET /{FORM_ID}/leads?fields=id,created_time,field_data&limit=3` — mostra o que os usuários preencheram.
- Marca no JSON de retorno:
  - `has_qual_entrada` + key/label exatos encontrados
  - `has_ja_investe` + key/label exatos encontrados
  - Exemplo de `value` preenchido (se houver lead)

### 2. Deploy + chamada

Faço deploy, chamo a função, te trago um resumo legível tipo:

```
Form: Recreio 01 - Parcela Alta
  qual_entrada_desejada → SIM (key: "qual_o_valor_da_entrada", exemplo: "R$ 30.000")
  ja_investe_em_imoveis → NÃO está no form
  campos extras: full_name, phone, email, ...
```

### 3. Apago a função

`fb-inspect-fields` é descartável. Removo depois de te mostrar o resultado.

## O que NÃO faço

- Não escrevo em lead nenhum.
- Não mexo em `parseFields`, webhook, trigger, schema do CRM.
- Não toco no plano do trigger do `+` (continua separado).
