Plano: Exportar leads para Google Sheets

Contexto atual
-------------
- `src/pages/Exportar.tsx` já exporta CSV com separador vírgula e BOM UTF-8, o que é compatível com Google Sheets.
- O fato do arquivo CSV estar abrindo no Visual Studio Code é uma configuração do sistema operacional/navegador do usuário para arquivos `.csv`, não um bug do app.
- Nenhum conector Google Sheets está configurado no workspace ainda (não há clients de `google_sheets`).

O que será feito
----------------
1. Melhorar a experiência do CSV para Google Sheets
   - Manter o botão/download CSV existente.
   - Garantir que o CSV continue usando vírgula como delimitador, UTF-8 BOM e escaping correto (já está assim).
   - Adicionar um texto/ícone informativo na tela explicando que, após baixar, basta arrastar o arquivo para o Google Sheets ou usar `Arquivo > Importar` dentro do Sheets.
   - Adicionar um link secundário "Abrir sheets.google.com" para facilitar o upload manual.

2. Configurar Google Sheets App User Connector (exportação direta)
   - Linkar um cliente OAuth do workspace para o connector `google_sheets` (`connector_app_user--connect_client`).
   - Escopos necessários: `https://www.googleapis.com/auth/userinfo.email`, `https://www.googleapis.com/auth/userinfo.profile`, `https://www.googleapis.com/auth/spreadsheets`.
   - Redirect URI obrigatório: `https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback`.
   - Nota: isso exige que o workspace tenha um Google OAuth web client configurado. Se ainda não existir, você precisará criar/aprovar pelo painel de App User Connectors.

3. Criar Edge Function `export-leads-to-sheets`
   - Receber via POST os mesmos filtros da tela: `status`, `corretor`, `periodo`, `incluirArquivados` e opcionalmente a lista de `ids` selecionados.
   - Validar JWT e garantir que o usuário tenha role `admin` ou `master`.
   - Buscar os leads no banco externo (`gycrprnkuwlzntqvpoxl`) com os mesmos filtros da query do frontend.
   - Usar a conexão do App User Connector para chamar o Google Sheets API via gateway Lovable:
     - Criar nova planilha (`POST /sheets/v4/spreadsheets`) com título tipo `Leads_YYYY-MM-DD`.
     - Escrever os dados em uma aba (`PUT /sheets/v4/spreadsheets/{id}/values/A1:Z{n}?valueInputOption=USER_ENTERED`) com os mesmos cabeçalhos do CSV.
   - Retornar a URL da planilha (`https://docs.google.com/spreadsheets/d/{id}/edit`) para o frontend abrir.

4. Atualizar frontend `src/pages/Exportar.tsx`
   - Adicionar botão primário "Exportar para Google Sheets" ao lado do botão "Exportar CSV".
   - Se o usuário ainda não tiver conectado o Google, mostrar um botão "Conectar Google Sheets" que inicia o OAuth.
   - Durante a exportação, mostrar estado de loading.
   - Em caso de sucesso, abrir a nova planilha em uma aba do navegador.
   - Em caso de erro, exibir toast com a mensagem detalhada.

5. Testes
   - Verificar que o CSV baixado importa corretamente no Google Sheets (colunas alinhadas, caracteres especiais OK).
   - Verificar que o botão de exportação direta cria uma nova planilha no Google Drive da conta conectada e preenche os dados.

Pendente de decisão
-------------------
- Confirmar se você tem permissão de workspace admin para criar o App User Connector. Se não tiver, a exportação direta só será possível depois que um admin criar o client OAuth do Google.