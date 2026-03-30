# Andrade Imobiliária CRM Elite — Lovable Setup

## Estrutura de Arquivos

```
src/
├── App.tsx                          ← Entry point (substituir o existente)
├── index.css                        ← Estilos globais (substituir o existente)
├── data/
│   └── mockData.ts                  ← Todos os dados mock
└── components/
    ├── Layout.tsx                   ← Sidebar + TopBar
    ├── Dashboard.tsx                ← KPIs + gráficos
    ├── KanbanBoard.tsx              ← Pipeline de leads
    ├── PropertyGallery.tsx          ← Galeria de imóveis
    ├── BrokerRanking.tsx            ← Ranking dos corretores
    └── WhatsAppConfig.tsx           ← Config do relatório diário
```

## Como Usar no Lovable

1. Cole cada arquivo no local correspondente do projeto Lovable
2. O `App.tsx` já importa tudo e gerencia a navegação
3. Nenhuma dependência extra necessária além do que o Lovable já tem (React + Tailwind)

## Paleta de Cores

| Variável CSS | Valor | Uso |
|---|---|---|
| `--navy` | `#001f3f` | Background principal |
| `--gold` | `#D4AF37` | Acentos e destaques |
| `--glass-bg` | `rgba(255,255,255,0.04)` | Cards glassmorphism |
| `--glass-border` | `rgba(255,255,255,0.08)` | Bordas dos cards |

## Fontes (já no index.css via @import)
- **Inter** — textos gerais
- **Montserrat** — títulos e números de destaque

## Funcionalidades de cada tela

### Dashboard
- 6 KPI cards com animação de contagem numérica (useCountUp hook)
- Mini sparklines SVG para cada métrico
- Funil de vendas com barras de progresso
- Gráfico de origens de leads
- Feed de atividade em tempo real
- Quick-view dos 5 corretores

### Kanban
- 5 colunas: Novo → Contato → Visita → Proposta → Fechado
- Cards com "tempo de espera" colorido por urgência (amarelo/vermelho)
- Health Score com barra de progresso
- Modal completo ao clicar no lead
- VGV potencial por coluna

### Galeria de Imóveis
- Filtros por bairro, tipo e faixa de preço
- Alternância grid/lista
- Modal com detalhes, stats e botão Tour 360°
- Cards com hover animado

### Ranking de Corretores
- Pódio visual top-3 com alturas diferentes
- Tabela completa com barras de progresso e % vs. líder
- Modal individual com gráfico de barras por mês e sistema de medalhas
- Status online/offline/ocupado

### WhatsApp Config
- Formulário com phone, nome, horário
- Toggles de conteúdo do relatório
- Mockup de celular com preview da mensagem em tempo real
- Botão "Enviar Teste" (visual apenas)
