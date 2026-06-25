Plano para verificar e corrigir a subida automática dos leads do Facebook:

1. Confirmar a causa do atraso
- Os logs do banco mostram importações manuais recentes, mas não há logs recentes da função `fb-lead-webhook`, indicando que o webhook automático provavelmente não está recebendo chamadas da Meta ou não está inscrito corretamente.
- A função manual `fb-sync-leads` está funcionando, por isso os leads apareceram ao clicar em “Leads de Hoje”.

2. Corrigir a inscrição automática do webhook
- Ajustar `fb-subscribe` para não depender de um único `FORM_ID` fixo e para validar a inscrição da página inteira em `leadgen`.
- Garantir que o retorno mostre claramente se a página está inscrita no webhook de leads.

3. Melhorar o fluxo de conexão Facebook
- Após conectar o Facebook via OAuth, manter a chamada que inscreve a página no webhook.
- Registrar no log se a inscrição falhar, em vez de apenas ignorar silenciosamente.

4. Tornar o webhook mais rastreável
- Adicionar logs estruturados quando o webhook recebe GET de verificação, POST da Meta, assinatura inválida, lead duplicado, erro ao buscar detalhes do lead e lead criado.
- Isso permite diferenciar “Meta não chamou” de “Meta chamou e o sistema recusou/erro”.

5. Verificar após a implementação
- Chamar a função de diagnóstico/inscrição para confirmar que a página está inscrita no campo `leadgen`.
- Consultar logs de `webhook_logs` e logs da função para confirmar que chamadas automáticas passam a aparecer.
- Manter a importação manual como fallback, mas a correção principal será no webhook automático.