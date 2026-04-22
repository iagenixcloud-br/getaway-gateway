

## Substituir o "A" pelo logo da Andrade Consultoria Imobiliária

Vou trocar o quadradinho dourado com a letra "A" pelo **logo oficial** (prédios vermelhos dentro do círculo branco), em dois lugares: **sidebar** (`Layout.tsx`) e **tela de login** (`Login.tsx`). O resultado precisa ficar elegante, integrado ao tema dark navy + dourado existente — não apenas "colado".

### 1. Importar o logo como asset

- Copio `user-uploads://WhatsApp_Image_2026-04-22_at_14.39.41.jpeg` para `src/assets/andrade-logo.jpeg`.
- Importo como módulo ES6: `import logo from "@/assets/andrade-logo.jpeg"`.

### 2. Tratamento visual do logo

O logo original tem **fundo preto sólido**, o que destoaria do navy translúcido do app se eu jogasse a imagem crua. Solução para ficar bonito:

- Envolver o `<img>` num **container circular** (`rounded-full`) com fundo preto puro (`#000`), que casa com o fundo natural da arte do logo e cria uma "moeda" limpa.
- Borda fina dourada (`1px solid var(--gold)`) ao redor do círculo — costura o logo vermelho ao restante da identidade dourada do sistema.
- Manter a classe `gold-glow` existente para preservar o brilho dourado pulsante já presente.
- `object-cover` com leve escala (`scale-110`) e `object-position: center 35%` para cortar a parte de baixo (texto "ANDRADE / CONSULTORIA IMOBILIÁRIA"), deixando aparecer **só os prédios dentro do círculo** — o texto da marca já está escrito ao lado, repetir polui.

Resultado: badge circular preto, borda dourada, prédios vermelhos centralizados, glow sutil.

### 3. Locais alterados

**`src/components/Layout.tsx`** (sidebar, linhas 53-63):
- Substituo o `<div>` quadrado dourado com o "A" por um `<div>` circular `w-10 h-10 rounded-full` com `overflow-hidden`, fundo `#000`, borda `1px solid var(--gold)`, classe `gold-glow`, contendo o `<img>` recortado.
- Texto ao lado ("Andrade" + "Imobiliária Elite") **mantido** — funciona como wordmark complementar.

**`src/pages/Login.tsx`** (linhas 36-42):
- Mesma substituição, em tamanho maior: `w-14 h-14 rounded-full`.
- Texto ao lado mantido.

### 4. Arquivos afetados

- **Novo**: `src/assets/andrade-logo.jpeg` (copiado do upload)
- **Editado**: `src/components/Layout.tsx`
- **Editado**: `src/pages/Login.tsx`

### Fora de escopo

- Não vou trocar o `<title>` do `index.html` nem o favicon agora (o usuário pediu só "no lugar do A"). Se quiser depois, faço o favicon a partir do mesmo logo.
- Não removo nem altero a tipografia "Andrade / Imobiliária Elite" ao lado — ela continua reforçando a marca em texto.

