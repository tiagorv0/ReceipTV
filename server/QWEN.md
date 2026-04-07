# server/ — ReceipTV Backend

## Visão Geral

API REST em Node.js + Express 5 que gerencia comprovantes de pagamento com extração automática de dados via IA (Groq com Llama 4 Scout). Autenticação baseada em cookies httpOnly com JWT, banco de dados PostgreSQL sem ORM, e serviços de exportação PDF/ZIP/e-mail.

**Stack:** Express 5 + PostgreSQL 17 (pg) + Groq SDK + JWT/bcrypt + Multer + Swagger

---

## Estrutura de Diretórios

```
server/
├── index.js                    # Entry point — bootstrap do Express
├── package.json                # Dependências + type: module (ESM)
├── Dockerfile                  # Node 24 Alpine, porta 5000
│
├── config/
│   ├── database.js             # pg.Pool com SSL condicional, timeouts
│   ├── logger.js               # Winston com níveis custom + Morgan stream
│   └── migrations.js           # Runner de migrações SQL automático
│
├── middleware/
│   └── auth.js                 # Middleware de verificação JWT (cookie)
│
├── routes/
│   ├── auth.js                 # Rotas de autenticação (login, register, refresh, etc.)
│   ├── receipts.js             # CRUD + upload + IA + export
│   └── reports.js              # Relatórios agregados
│
├── services/
│   ├── ai.js                   # Análise de comprovantes via Groq (Llama 4 Scout)
│   ├── mailer.js               # Envio de e-mails via Nodemailer (SMTP)
│   ├── pdf-export.js           # Geração de PDF com PDFKit
│   └── zip-export.js           # Geração de ZIP com Archiver
│
├── utils/
│   └── title-case.js           # Helper de formatação (Title Case)
│
└── migrations/
    ├── 001_add_arquivo_columns.sql
    ├── 002_create_refresh_tokens.sql
    ├── 003_add_user_email.sql
    ├── 004_add_receipts_indexes.sql
    └── 005_normalize_users_lowercase.sql
```

---

## Comandos

```bash
npm start         # Produção: node index.js
npm run dev       # Desenvolvimento: node --watch index.js (hot reload)
```

Executar migrações manualmente (já roda automaticamente no startup):

```bash
node server/config/migrations.js
```

---

## Variáveis de Ambiente

Criar arquivo `.env` na raiz do `server/`:

```env
# Obrigatórias
DATABASE_URL=postgresql://postgres:root@localhost:5434/receiptv
JWT_SECRET=sua_chave_secreta
GROQ_API_KEY=sua_groq_api_key
PORT=5000

# Opcionais (SMTP para envio de e-mails)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Ambiente
NODE_ENV=development|production
```

---

## Superfície Completa da API

Base URL: `/api`

### Autenticação (`/api/auth`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `POST` | `/auth/register` | Não | Cria usuário (`username`, `email`, `password`) |
| `POST` | `/auth/login` | Não | Autentica; emite cookies `accessToken` (15min) + `refreshToken` (1h ou 30d com `rememberMe`) |
| `POST` | `/auth/refresh` | Não | Renova tokens via rotação (detecta reutilização e revoga sessão) |
| `POST` | `/auth/logout` | Sim (cookie) | Revoga refresh token e limpa cookies |
| `GET` | `/auth/me` | Não (cookie) | Retorna `{ id, username }` do JWT |
| `GET` | `/auth/profile` | Sim | Retorna `{ id, username, email }` do BD |
| `PUT` | `/auth/password` | Sim | Altera senha (valida atual, mín. 8 caracteres) |
| `DELETE` | `/auth/account` | Sim | Exclui conta + comprovantes (CASCADE) + revoga sessões |

### Comprovantes (`/api/receipts`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `POST` | `/receipts/analyze` | Sim | Upload de arquivo → IA extrai dados → salva no BD |
| `POST` | `/receipts/manual` | Sim | Registro manual (com ou sem arquivo anexado) |
| `PUT` | `/receipts/:id` | Sim | Atualiza comprovante (verifica posse; arquivo opcional) |
| `GET` | `/receipts` | Sim | Lista comprovantes com filtros `startDate`/`endDate` |
| `GET` | `/receipts/:id/file` | Sim | Download do arquivo original (BYTEA) |
| `DELETE` | `/receipts/:id` | Sim | Remove comprovante (verifica posse) |
| `POST` | `/receipts/export` | Sim | Exporta como PDF ou ZIP; delivery: `download`, `email` ou `whatsapp` |

### Relatórios (`/api/reports`)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| `GET` | `/reports/summary` | Sim | Retorna `{ total, count, byBank, byType, monthly }` |

### Documentação

- **Swagger UI**: `GET /api-docs` (gerado via swagger-jsdoc + swagger-ui-express)

---

## Arquitetura

### Autenticação JWT

- **Access token**: 15 minutos, cookie httpOnly, armazenado em `accessToken`
- **Refresh token**: 1 hora (sessão temporária) ou 30 dias (rememberMe), cookie httpOnly, armazenado em `refreshToken`
- **Rotação de tokens**: a cada refresh, o token antigo é revogado e um novo par é emitido
- **Detecção de reutilização**: se um refresh token revogado é reutilizado, toda a sessão do usuário é comprometida e revogada
- **Token hash**: refresh tokens armazenados como SHA-256 no banco (nunca em plaintext)
- **Middleware**: `middleware/auth.js` lê `accessToken` do cookie, valida e popula `req.user` com `{ id, username }`

### Banco de Dados

- **PostgreSQL 17** via `pg.Pool` — sem ORM, SQL puro
- **SSL** habilitado apenas em produção (`rejectUnauthorized: false`)
- **Configurações**: max 5 conexões, idle timeout 30s, statement timeout 10s

#### Tabelas

| Tabela | Colunas Principais |
|--------|-------------------|
| `users` | `id`, `username` (UNIQUE), `email` (UNIQUE), `password` (bcrypt), `created_at` |
| `receipts` | `id`, `user_id` (FK CASCADE), `nome`, `valor`, `data_pagamento`, `banco`, `tipo_pagamento`, `descricao`, `arquivo_data` (BYTEA), `arquivo_mimetype`, `arquivo_nome`, `created_at` |
| `refresh_tokens` | `id`, `user_id` (FK CASCADE), `token_hash` (SHA-256), `expires_at`, `revoked_at`, `created_at` |
| `schema_migrations` | `version` (PK), `applied_at` |

#### Migrações

Executadas automaticamente no startup do servidor (`runMigrations()` em `index.js`):

| # | Arquivo | Descrição |
|---|---------|-----------|
| 001 | `001_add_arquivo_columns.sql` | Adiciona colunas de arquivo (BYTEA) em `receipts` |
| 002 | `002_create_refresh_tokens.sql` | Cria tabela `refresh_tokens` com indexes e FK CASCADE |
| 003 | `003_add_user_email.sql` | Adiciona coluna `email` UNIQUE em `users` |
| 004 | `004_add_receipts_indexes.sql` | Indexes em `receipts(user_id)` e `receipts(user_id, data_pagamento)` |
| 005 | `005_normalize_users_lowercase` | Normaliza `username` e `email` para lowercase |

### Serviço de IA (`services/ai.js`)

- **Modelo**: `meta-llama/llama-4-scout-17b-16e-instruct` via Groq SDK
- **Entrada**: buffer do arquivo + MIME type
- **PDFs**: extrai texto com `pdf-parse-new` e envia como texto ao LLM
- **Imagens**: converte para base64 e envia como vision (`image_url`)
- **Retorno esperado**: JSON `{ nome, valor, data, banco, tipo_pagamento, descricao }`
- **Temperatura**: 0.1 (baixa, para consistência)
- **Tratamento**: remove markdown code blocks da resposta antes do `JSON.parse`

### Exportação

| Serviço | Biblioteca | Descrição |
|---------|------------|-----------|
| **PDF** (`pdf-export.js`) | PDFKit | Relatório com header verde, tabela paginada, filtros aplicados, resumo em BRL |
| **ZIP** (`zip-export.js`) | Archiver (zlib 6) | Arquivos originais dos comprovantes + `resumo.txt` com metadados |
| **E-mail** (`mailer.js`) | Nodemailer (SMTP) | Envia PDF anexado por e-mail |

### Logging

- **Winston**: níveis custom (`error`, `warn`, `info`, `http`, `debug`)
  - Console (com cores)
  - `logs/error.log` (apenas erros)
  - `logs/all.log` (tudo)
- **Morgan**: log de requisições HTTP injetado no Winston
- **Nível**: `debug` em desenvolvimento, `warn` em produção

---

## Convenções de Desenvolvimento

- **ESM modules** (`import`/`export`) — **não usar `require()`** (exceto `createRequire` em `ai.js` para `pdf-parse-new`)
- **Erros**: propagar com mensagens claras, nunca expor SQL ou stack traces ao cliente
- **Logging**: adicionar logs Winston em pontos críticos (erros, auth, chamadas IA, exports)
- **Files**: armazenados como `BYTEA` no banco, não em disco
- **Title Case**: nomes e bancos são capitalizados via `utils/title-case.js` antes de salvar
- **CORS**: origens permitidas — `localhost:5173`, `receiptv.onrender.com`, `receiptv-backend.onrender.com`
- **Swagger**: manter documentação em sync ao adicionar ou modificar endpoints (usar blocos `@swagger` nos routes)

---

## Dependências Principais

### Produção
- `express` ^5 (framework HTTP)
- `pg` ^8 (PostgreSQL client)
- `groq-sdk` ^0.37 (IA Groq)
- `bcryptjs` ^3 (hash de senhas)
- `jsonwebtoken` ^9 (JWT)
- `dotenv` ^17 (env vars)
- `multer` ^2 (file upload em memória)
- `cors` + `cookie-parser`
- `morgan` + `winston` (logging)
- `pdf-parse-new` ^2 (extração texto PDF)
- `pdfkit` ^0.18 (geração PDF)
- `archiver` ^7 (geração ZIP)
- `nodemailer` ^8 (envio e-mail)
- `swagger-jsdoc` + `swagger-ui-express` (docs)

---

## Docker

```dockerfile
FROM node:24-alpine
ARG env=production
ENV NODE_ENV=$env
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "index.js"]
```

`.dockerignore`: ignora `node_modules/` e `logs/`.
