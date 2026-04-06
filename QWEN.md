# ReceipTV - Project Context

## Project Overview

**ReceipTV** é um sistema full-stack de gerenciamento financeiro de comprovantes com extração automática de dados via IA. Usuários fazem upload de PDFs ou imagens de comprovantes e o sistema extrai automaticamente dados estruturados (beneficiário, valor, data, banco e tipo de pagamento) usando Groq com modelo Llama 4 Scout.

### Tecnologias Principais

| Camada | Stack |
|--------|-------|
| **Frontend** | React 19 + Vite 7, Tailwind CSS 4 + shadcn/ui, React Router 7, Recharts, Framer Motion |
| **Backend** | Node.js + Express 5 (ESM), PostgreSQL 17 via `pg`, Groq SDK, JWT, bcrypt |
| **Infra** | Docker + Docker Compose, PostgreSQL 17 |
| **PWA** | Workbox com Web Share Target API |

### Funcionalidades

- Extração de dados de comprovantes via IA (PDF e imagens)
- Autenticação JWT com senha criptografada (bcrypt)
- Dashboard com gráficos de gastos mensais e por banco (Recharts)
- Histórico de comprovantes com listagem, visualização e exclusão
- PWA instalável com suporte a compartilhamento de arquivos pelo mobile
- Interface responsiva: Sidebar (desktop) / Bottom Nav (mobile)
- API documentada com Swagger UI em `/api-docs`

---

## Estrutura do Projeto

```
ReceipTV/
├── client/                    # React SPA (Vite)
│   ├── src/
│   │   ├── api/               # Axios instance + serviços
│   │   ├── components/        # Componentes reutilizáveis + shadcn/ui
│   │   ├── hooks/             # Custom React hooks
│   │   ├── pages/             # Componentes de página (rotas)
│   │   ├── utils/             # Helpers (data, moeda, banco)
│   │   └── lib/               # Bibliotecas utilitárias
│   ├── public/
│   ├── vite.config.js
│   └── package.json
├── server/                    # API REST (Node.js/Express - ESM)
│   ├── config/                # DB pool + Winston logger
│   ├── middleware/            # Auth JWT
│   ├── routes/                # Rotas da API (auth, receipts, reports)
│   ├── services/              # AI analysis, mailer, PDF/ZIP export
│   ├── utils/                 # Helpers compartilhados
│   ├── index.js               # Entry point
│   └── package.json
├── database/
│   └── schema.sql             # Schema PostgreSQL
├── docker-compose.yml
├── package.json               # Root (scripts orquestração)
└── .nvmrc                     # Node 24
```

---

## Comandos Principais

### Pré-requisitos

- Node.js v24+ (definido em `.nvmrc`)
- Docker e Docker Compose

### Desenvolvimento

```bash
# Iniciar banco de dados PostgreSQL
docker-compose up -d

# Instalar todas as dependências (server + client)
npm install && npm run install-all

# Rodar frontend e backend simultaneamente
npm run dev

# Apenas backend (porta 5000)
npm run server

# Apenas frontend (porta 5173)
npm run client
```

### Docker (todos os serviços)

```bash
docker-compose up          # Construir e iniciar todos os serviços
docker-compose up -d       # Background mode
docker-compose down        # Parar serviços
```

### Endpoints

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 |
| Swagger Docs | http://localhost:5000/api-docs |

### Frontend (dentro de `client/`)

```bash
npm run dev       # Dev server
npm run build     # Build produção
npm run lint      # ESLint
npm run preview   # Preview build
```

### Backend (dentro de `server/`)

```bash
npm start         # Produção
npm run dev       # Desenvolvimento com hot reload (--watch)
```

---

## Variáveis de Ambiente

### Server (`server/.env`)

```env
DATABASE_URL=postgresql://postgres:root@localhost:5434/receiptv
JWT_SECRET=sua_chave_secreta
GROQ_API_KEY=sua_groq_api_key
PORT=5000
```

### Client (`client/.env`)

```env
VITE_API_URL=http://localhost:5000/api
```

---

## Arquitetura

### Banco de Dados (PostgreSQL 17)

**Tabelas:**

- **users**: `id`, `username`, `password` (bcrypt), `created_at`
- **receipts**: `id`, `user_id`, `nome`, `valor`, `data_pagamento`, `banco`, `tipo_pagamento`, `descricao`, `arquivo_data` (BYTEA), `arquivo_mimetype`, `arquivo_nome`, `created_at`

Conexão via `pg.Pool` (sem ORM — SQL puro). Arquivos armazenados como `BYTEA` no banco.

### Backend

**Entry point:** `server/index.js`

**Rotas da API (`/api`):**

| Rota | Descrição |
|------|-----------|
| `/api/auth/` | Registro e login (JWT) |
| `/api/receipts/` | CRUD + upload + análise IA |
| `/api/reports/` | Relatórios agregados de gastos |

**Integração IA:** Groq SDK com modelo `Llama-4-Scout`. Suporta PDF (extração via `pdf-parse-new`) e imagens (base64). Retorna JSON estruturado.

**Logging:** Morgan (HTTP) + Winston (aplicação).

### Frontend

**Entry point:** `src/main.jsx` → `src/App.jsx`

**Rotas:**

| Rota | Página | Acesso |
|------|--------|--------|
| `/login` | LoginPage | Público |
| `/` | DashboardPage | Protegido |
| `/upload` | UploadPage | Protegido |
| `/history` | HistoryPage | Protegido |
| `/profile` | ProfilePage | Protegido |

**Layout responsivo:** Sidebar (desktop, `md:`) / Bottom Nav (mobile).

**Path alias:** `@` → `src/`

---

## Convenções de Desenvolvimento

### Backend

- **ESM modules** (`import`/`export`) — não use `require()`
- **JWT** tokens em `localStorage`, injetados via Axios interceptor
- **Erros:** propagar com mensagens claras, nunca expor SQL ou stack traces ao cliente
- **Logging:** adicionar logs Winston em pontos críticos (erros, auth, chamadas IA)

### Frontend

- **Tailwind CSS 4** + **shadcn/ui** para componentes interativos
- **Responsivo:** mobile-first. Sem prefixo = mobile, `md:` = desktop
- **Scrollbar:** custom global em `client/src/index.css` (`scrollbar-width: thin`, track `zinc-900`, thumb `zinc-700`)
- **Collapse animation:** CSS `grid-template-rows: 0fr → 1fr` com `overflow-hidden`
- **Filter persistence:** `HistoryPage` usa `useSearchParams` para estado de filtros (URLs compartilháveis)
- **PasswordInput:** usar componente `PasswordInput` de `src/components/ui/input.jsx` — não reimplementar show/hide manualmente
- **Form layout (senhas):** stacked layout (`space-y-4`), label acima do input, full-width no mobile

---

## Serviços Adicionais

- **Mailer:** `server/services/mailer.js` (nodemailer)
- **PDF Export:** `server/services/pdf-export.js` (pdfkit)
- **ZIP Export:** `server/services/zip-export.js` (archiver)
- **PWA:** Service Worker em `client/src/sw.js`, manifesto com Web Share Target API
