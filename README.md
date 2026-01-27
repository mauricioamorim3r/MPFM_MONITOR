# MPFM Monitor - Sistema de Monitoramento e Avaliação de Desempenho

[![React](https://img.shields.io/badge/React-18.2+-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4+-blue.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

Sistema web para monitoramento contínuo e avaliação de desempenho de **Medidores Multifásicos (MPFM)** do FPSO Bacalhau, em conformidade com a **Resolução ANP nº 44/2015**.

## 📋 Sumário

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Instalação](#instalação)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Documentação](#documentação)
- [Uso](#uso)
- [API](#api)
- [Contribuição](#contribuição)

## 🎯 Visão Geral

O MPFM Monitor é uma aplicação completa para:

1. **Monitoramento SGM-FM**: Análise diária de variáveis críticas de medição
2. **Avaliação de Desempenho**: Workflow de calibração em 7 etapas
3. **Conformidade ANP**: Checklist regulatório RANP 44/2015

### Unidade

- **FPSO**: Bacalhau
- **Bacia**: Santos
- **Operador**: Equinor Brasil Energia Ltda.

## ✨ Funcionalidades

### Módulo de Monitoramento

- ✅ Dashboard com KPIs em tempo real
- ✅ Gráficos de histórico de balanço de massa (14 dias)
- ✅ Tabela de monitoramento diário com código de cores
- ✅ Sistema de alertas com classificação de severidade
- ✅ Importação de dados (Excel, CSV, PI System)
- ✅ Exportação de relatórios

### Módulo de Avaliação de Desempenho

- ✅ Gestão de eventos de calibração
- ✅ Workflow completo de 7 etapas:
  - 01 - Registro do Evento/Instrumento
  - 02 - Atualização PVT (Composição Molar)
  - 03 - Totalizadores (mín. 24h)
  - 04 - Cálculo de K-Factors
  - 05 - Balanço de Massa HC
  - 06 - Monitoramento Pós-Calibração
  - 07 - Registro de Alarmes/Eventos
- ✅ Geração de relatórios PDF/Excel

### Módulo de Conformidade

- ✅ Checklist ANP 44/2015
- ✅ Rastreamento de evidências
- ✅ Indicadores de conformidade

## 🛠️ Tecnologias

### Frontend

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | 18.2+ | Framework UI |
| TypeScript | 5.0+ | Type Safety |
| Tailwind CSS | 3.4+ | Estilização |
| shadcn/ui | latest | Componentes UI |
| Recharts | 2.10+ | Gráficos |
| Lucide React | 0.300+ | Ícones |

### Backend (Recomendado)

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Node.js + Express | 18+ | API REST |
| PostgreSQL | 15+ | Banco de dados |
| TimescaleDB | latest | Séries temporais |
| Redis | 7+ | Cache |

### Integrações

- **PI System** (OSIsoft): OPC-UA / PI Web API
- **Azure AD**: SSO / SAML 2.0

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Git

### Passos

```bash
# Clonar repositório
git clone https://github.com/mauricioamorim3r/MPFM_MONITOR.git
cd MPFM_MONITOR

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Iniciar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

## 📁 Estrutura do Projeto

```
MPFM_MONITOR/
├── docs/                          # Documentação
│   ├── PRD_MPFM_Bacalhau_v1.0.docx
│   └── Memorial_Descritivo_MPFM_v1.0.docx
│
├── src/
│   ├── components/               # Componentes React reutilizáveis
│   │   ├── ui/                   # Componentes base (Badge, Card, Input, etc.)
│   │   ├── charts/               # Componentes de gráficos
│   │   ├── monitoring/           # Componentes do módulo de monitoramento
│   │   └── calibration/          # Componentes do módulo de calibração
│   │
│   ├── pages/                    # Páginas da aplicação
│   │   ├── Dashboard.tsx
│   │   ├── Monitoring.tsx
│   │   ├── Calibration.tsx
│   │   └── Compliance.tsx
│   │
│   ├── hooks/                    # Custom hooks
│   ├── services/                 # Serviços de API
│   ├── types/                    # Definições TypeScript
│   ├── utils/                    # Funções utilitárias
│   ├── styles/                   # Estilos globais
│   ├── App.tsx                   # Componente principal
│   └── main.tsx                  # Entry point
│
├── public/                       # Assets estáticos
├── prototypes/                   # Protótipos JSX originais
│   ├── mpfm_sistema_integrado.jsx
│   └── mpfm_workflow_completo.jsx
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
└── README.md
```

## 📚 Documentação

| Documento | Descrição |
|-----------|-----------|
| [PRD](./docs/PRD_MPFM_Bacalhau_v1.0.docx) | Product Requirements Document |
| [Memorial Descritivo](./docs/Memorial_Descritivo_MPFM_v1.0.docx) | Especificações técnicas |

## 💻 Uso

### Monitoramento Diário

1. Acesse o módulo "Monitoramento SGM-FM"
2. Visualize os KPIs no dashboard
3. Analise a tabela de dados diários
4. Verifique alertas pendentes

### Avaliação de Desempenho

1. Acesse "Avaliação de Desempenho"
2. Clique em "Nova Avaliação"
3. Selecione o tipo e medidor
4. Preencha as 7 etapas do workflow
5. Gere o relatório final

## 🔌 API

### Endpoints Principais

```
GET  /api/monitoring/daily        # Dados diários
GET  /api/monitoring/balance      # Balanço de massa
POST /api/monitoring/import       # Upload de dados
GET  /api/meters                  # Lista de medidores
GET  /api/calibration/events      # Eventos de calibração
POST /api/calibration/event       # Criar evento
PUT  /api/calibration/event/:id   # Atualizar evento
GET  /api/alerts                  # Lista de alertas
POST /api/reports/generate        # Gerar relatório
```

### WebSocket Events

- `monitoring.update` - Novos dados disponíveis
- `calibration.step.complete` - Etapa concluída
- `alert.new` - Novo alerta gerado

## 📊 Regras de Negócio (ANP 44/2015)

| Parâmetro | Limite | Ação |
|-----------|--------|------|
| Balanço HC | ±10% | Investigar |
| Balanço Total | ±7% | Investigar |
| Dias Consecutivos | 10 dias | Calibrar |
| K-Factor Normal | 0.80 - 1.20 | Monitorar |
| Totalização | 24h mín | Obrigatório |

## 🤝 Contribuição

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Projeto proprietário - Equinor Brasil Energia Ltda.

## 📞 Contato

- **Projeto**: MPFM-BAC-2026
- **Unidade**: FPSO Bacalhau

---

Desenvolvido para Equinor Brasil | FPSO Bacalhau | 2026
