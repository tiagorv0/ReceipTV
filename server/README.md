# ReceipTV — Backend

API REST do ReceipTV: Node.js 24 + Express 5 + TypeScript 5 + PostgreSQL 17.

**Última atualização:** 13 de abril de 2026

## Stack

- **Node.js 24+** com **Express 5** (ESM)
- **TypeScript 5** em strict mode
- **PostgreSQL 17** via `pg` (SQL parametrizado, sem ORM)
- **Groq SDK** para IA (Llama 4 Scout) — extração de comprovantes
- **PDFKit** para geração de PDF
- **Archiver** para exportação ZIP
- **Nodemailer** para envio de e-mail
- **JWT** (jsonwebtoken) + **bcryptjs** para autenticação
- **Multer** para upload (armazenamento em BYTEA)
- **Morgan** + **Winston** para logging
- **Swagger** (swagger-jsdoc) para documentação de API

## Estrutura

```
src/
├── index.ts                    # Bootstrap: middlewares, rotas, Swagger
├── config/
│   ├── database.ts             # pg.Pool via DATABASE_URL
│   ├── logger.ts               # Winston (console + file)
│   └── migrations.ts           # Runner de migrações automático
├── routes/
│   ├── auth.ts                 # Registro, login, refresh, perfil, senha, conta
│   ├── receipts.ts             # Upload IA, manual, CRUD, exportação
│   └── reports.ts              # Dashboard, relatórios
├── middleware/
│   └── auth.ts                 # Verifica JWT do cookie → req.user
├── services/
│   ├── ai.ts                   # Integração Groq (PDF + imagem → JSON)
│   ├── pdf-export.ts           # PDFKit: tabela de comprovantes
│   ├── zip-export.ts           # Archiver: bundle ZIP
│   └── mailer.ts               # Nodemailer: envio de e-mail
├── types/
│   ├── index.ts                # Barrel exports
│   ├── user.ts                 # User, UserPublic, UserJwtPayload
│   ├── receipt.ts              # Receipt, ReceiptFilters, AnalysisResult
│   ├── auth.ts                 # Tipos de autenticação
│   ├── express.d.ts            # Augmentation de Request.user
│   └── env.d.ts                # Tipagem de process.env
└── utils/
    └── title-case.ts           # Formatação de strings

migrations/                     # Arquivos SQL incrementais (001_..., 002_..., etc.)
dist/                          # Output compilado (gitignored)
tsconfig.json
package.json
```

## Banco de Dados

### Tabelas principais

**users**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**receipts**
```sql
CREATE TABLE receipts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  nome VARCHAR(255),
  valor DECIMAL(10,2),
  data_pagamento DATE,
  banco VARCHAR(100),
  tipo_pagamento VARCHAR(50),
  descricao TEXT,
  arquivo_data BYTEA,  -- Arquivo binário (PDF/imagem)
  arquivo_mimetype VARCHAR(50),
  arquivo_nome VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(user_id, data_pagamento)
);
```

**refresh_tokens**
```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**schema_migrations**
```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Conectar

```bash
PGPASSWORD=root psql -h localhost -p 5434 -U postgres -d receiptv
```

### Migrações

Rodar automaticamente na inicialização via `config/migrations.ts`.

Criar nova migração:
```bash
# Manualmente em migrations/ com nome incremental
# Exemplo: 006_add_new_column.sql

npm run migrate  # Rodar migrações
```

## API

**Base URL:** `http://localhost:5000/api`

**Swagger UI:** `http://localhost:5000/api-docs`

### Autenticação

#### POST `/auth/register`
Criar conta.

**Request:**
```json
{
  "username": "tiago",
  "email": "tiago@example.com",
  "password": "senha123"
}
```

**Response:** 201
```json
{
  "user": {
    "id": 1,
    "username": "tiago",
    "email": "tiago@example.com"
  },
  "message": "Conta criada com sucesso"
}
```

**Cookies:** `accessToken`, `refreshToken` (httpOnly)

#### POST `/auth/login`
Autenticar usuário.

**Request:**
```json
{
  "username": "tiago",
  "password": "senha123"
}
```

**Response:** 200
```json
{
  "user": {
    "id": 1,
    "username": "tiago",
    "email": "tiago@example.com"
  },
  "message": "Login realizado com sucesso"
}
```

**Cookies:** `accessToken` (15 min), `refreshToken` (30 dias)

#### POST `/auth/refresh`
Renovar access token.

**Request:** Cookie `refreshToken`

**Response:** 200
```json
{
  "message": "Token renovado"
}
```

**Cookies:** Novo `accessToken`

#### POST `/auth/logout`
Logout e revogar refresh token.

**Request:** Requer autenticação (JWT)

**Response:** 200
```json
{
  "message": "Logout realizado"
}
```

#### GET `/auth/me`
Verificar sessão ativa.

**Request:** Requer autenticação

**Response:** 200
```json
{
  "id": 1,
  "username": "tiago",
  "email": "tiago@example.com"
}
```

#### GET `/auth/profile`
Dados completos do usuário.

**Request:** Requer autenticação

**Response:** 200
```json
{
  "id": 1,
  "username": "tiago",
  "email": "tiago@example.com",
  "created_at": "2026-04-13T12:00:00Z"
}
```

#### PUT `/auth/password`
Alterar senha.

**Request:** Requer autenticação
```json
{
  "currentPassword": "senha123",
  "newPassword": "novaSenha456"
}
```

**Response:** 200
```json
{
  "message": "Senha alterada com sucesso"
}
```

#### DELETE `/auth/account`
Deletar conta do usuário.

**Request:** Requer autenticação

**Response:** 200
```json
{
  "message": "Conta deletada com sucesso"
}
```

### Comprovantes (Receipts)

#### POST `/receipts/analyze`
Upload com análise automática por IA.

**Request:** Requer autenticação
- Content-Type: `multipart/form-data`
- Field: `file` (PDF ou imagem)

**Response:** 201
```json
{
  "id": 123,
  "nome": "Açaí Natural Juice",
  "valor": 25.50,
  "data_pagamento": "2026-04-13",
  "banco": "Nubank",
  "tipo_pagamento": "PIX",
  "descricao": "Compra em loja física",
  "arquivo_nome": "receipt.pdf",
  "arquivo_mimetype": "application/pdf",
  "created_at": "2026-04-13T12:30:00Z"
}
```

#### POST `/receipts/manual`
Entrada manual sem IA.

**Request:** Requer autenticação
```json
{
  "nome": "Supermercado XYZ",
  "valor": 150.75,
  "data_pagamento": "2026-04-13",
  "banco": "Itaú",
  "tipo_pagamento": "TED",
  "descricao": "Compras mensais"
}
```

**Response:** 201
```json
{
  "id": 124,
  "nome": "Supermercado XYZ",
  "valor": 150.75,
  "data_pagamento": "2026-04-13",
  "banco": "Itaú",
  "tipo_pagamento": "TED",
  "descricao": "Compras mensais",
  "created_at": "2026-04-13T12:40:00Z"
}
```

#### GET `/receipts`
Listar comprovantes com filtros.

**Query params:**
- `dataDe` (YYYY-MM-DD)
- `dataAte` (YYYY-MM-DD)
- `banco` (string)
- `tipo` (PIX, TED, BOLETO, etc.)
- `search` (beneficiário)
- `limit` (padrão: 20)
- `offset` (paginação)

**Response:** 200
```json
{
  "receipts": [
    {
      "id": 123,
      "nome": "Açaí Natural Juice",
      "valor": 25.50,
      "data_pagamento": "2026-04-13",
      "banco": "Nubank",
      "tipo_pagamento": "PIX",
      "created_at": "2026-04-13T12:30:00Z"
    }
  ],
  "total": 50,
  "hasMore": true
}
```

#### GET `/receipts/:id/file`
Download do arquivo original.

**Request:** Requer autenticação

**Response:** 200
- Content-Type: `application/pdf` ou `image/png`, etc.
- Body: arquivo binário

#### PUT `/receipts/:id`
Editar comprovante.

**Request:** Requer autenticação
```json
{
  "nome": "Açaí Natural Juice - Editado",
  "valor": 26.00,
  "data_pagamento": "2026-04-13",
  "banco": "Nubank",
  "tipo_pagamento": "PIX",
  "descricao": "Compra editada"
}
```

**Response:** 200
```json
{
  "id": 123,
  "nome": "Açaí Natural Juice - Editado",
  "valor": 26.00,
  "data_pagamento": "2026-04-13",
  "banco": "Nubank",
  "tipo_pagamento": "PIX",
  "descricao": "Compra editada"
}
```

#### DELETE `/receipts/:id`
Remover comprovante.

**Request:** Requer autenticação

**Response:** 200
```json
{
  "message": "Comprovante removido"
}
```

#### POST `/receipts/export`
Exportar em PDF, ZIP ou e-mail.

**Request:** Requer autenticação
```json
{
  "format": "pdf",  // ou "zip" ou "email"
  "dataDe": "2026-04-01",
  "dataAte": "2026-04-30",
  "email": "tiago@example.com"  // obrigatório se format = "email"
}
```

**Response:** 200
- Se `pdf`: arquivo PDF (Content-Type: `application/pdf`)
- Se `zip`: arquivo ZIP (Content-Type: `application/zip`)
- Se `email`: `{ "message": "E-mail enviado" }`

### Relatórios (Reports)

#### GET `/reports/summary`
Dashboard: totais, gráficos.

**Request:** Requer autenticação

**Query params:**
- `dataDe` (opcional)
- `dataAte` (opcional)

**Response:** 200
```json
{
  "totalGasto": 5432.50,
  "mediaValor": 125.75,
  "totalComprovantes": 43,
  "porBanco": [
    { "banco": "Nubank", "total": 2000.00, "quantidade": 25 },
    { "banco": "Itaú", "total": 1500.00, "quantidade": 18 }
  ],
  "porTipo": [
    { "tipo": "PIX", "total": 3000.00, "quantidade": 30 },
    { "tipo": "TED", "total": 2432.50, "quantidade": 13 }
  ],
  "porMes": [
    { "mes": "2026-04", "total": 2500.00, "quantidade": 20 }
  ]
}
```

## Autenticação

### Fluxo JWT + Refresh Token

1. **Login:** `POST /auth/login` → Access (15 min) + Refresh (30 dias) tokens
2. **Cookies:** Ambos `httpOnly`, `secure` em produção
3. **Middleware:** `/middleware/auth.ts` valida JWT → popula `req.user`
4. **Expiração:** Access token expira → cliente chama `POST /auth/refresh`
5. **Refresh:** Valida refresh token (BD), emite novo access token
6. **Revogação:** Refresh token hash revogado em logout

### Segurança

- Senhas hashadas com **bcryptjs** (salt rounds: 10)
- SQL parametrizado (nunca interpolação)
- Tokens em cookies `httpOnly` (CSRF protection)
- Validação de entrada em todos os endpoints
- Winston logging de operações críticas

## IA — Extração de Comprovantes

### Modelo
**Groq:** `meta-llama/llama-4-scout-17b-16e-instruct`

### PDFs
1. Texto extraído com `pdf-parse-new`
2. Enviado ao Groq
3. Resposta esperada: JSON estruturado

### Imagens
1. Convertidas para base64
2. Enviado ao Groq como vision
3. Resposta: JSON estruturado

### Resposta esperada
```json
{
  "nome": "string",
  "valor": number,
  "data": "YYYY-MM-DD",
  "banco": "string",
  "tipo_pagamento": "PIX|TED|BOLETO|OUTRA",
  "descricao": "string (opcional)"
}
```

### Tratamento de erro
Se Groq falha:
- Registra erro no Winston
- Retorna 500 com mensagem clara

## Logging

### Winston
**Nível padrão:** `debug` (dev), `warn` (prod)

**Transportes:**
- Console
- File: `logs/error.log` (errors)
- File: `logs/all.log` (todos)

**Usar:**
```ts
import logger from './config/logger.js';

logger.info('Login bem-sucedido', { userId: 1 });
logger.error('Erro na análise IA', { error: err.message });
```

### Morgan
HTTP request logging integrado ao Winston.

## Desenvolvimento

### Instalar

```bash
# De server/
npm install
```

### Rodar

```bash
# Desenvolvimento com hot reload
npm run dev

# Produção
npm run build
npm start

# Type-check
npm run typecheck
```

### Variáveis de Ambiente

Criar `.env`:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:root@localhost:5434/receiptv
JWT_SECRET=sua_chave_secreta_super_segura
GROQ_API_KEY=sua_chave_da_api_groq
NODE_ENV=development

# Opcional - SMTP para exportação por e-mail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_de_app
SMTP_FROM=noreply@receiptv.com
```

### TypeScript + ESM

- `"type": "module"` em `package.json`
- Imports relativos **com extensão `.js`**: `import pool from './config/database.js'`
- O compilador TypeScript resolve para `.ts`

### Migrações

Rodam automaticamente na inicialização. Para adicionar:

1. Criar arquivo `migrations/006_descricao.sql`
2. Escrever SQL parametrizado
3. Reiniciar servidor

## Endpoints com Swagger

Documentar **todas** as rotas com JSDoc `@swagger`:

```ts
/**
 * @swagger
 * /api/receipts:
 *   get:
 *     summary: Listar comprovantes
 *     tags: [Receipts]
 *     parameters:
 *       - name: dataDe
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: Lista de comprovantes
 */
router.get('/', authMiddleware, (req, res) => {
  // ...
});
```

## Performance

- Connection pooling: `pg.Pool` (10 conexões por padrão)
- SQL indexes em `receipts(user_id, data_pagamento)`
- Paginação em listagens (limit + offset)
- Caching de tipos TypeScript em build

## Troubleshooting

**Erro: ECONNREFUSED 127.0.0.1:5434**
- PostgreSQL não está rodando
- Executar `docker-compose up -d`

**Erro: JWT inválido**
- Token expirado → cliente chama `POST /auth/refresh`
- JWT_SECRET mismatch → verificar `.env`

**Erro: GROQ_API_KEY inválido**
- Verificar chave em `.env`
- Testar em dashboard Groq: https://console.groq.com

**PDF não extrai texto**
- Arquivo corrompido ou scanned sem OCR
- pdf-parse-new pode não extrair de imagens
- Fallback: converter para imagem + vision

## Contribuindo

1. Consulte `CLAUDE.md` (raiz) e `server/CLAUDE.md`
2. SQL parametrizado sempre
3. Winston logging em operações críticas
4. JSDoc com `@swagger` em rotas novas
5. Type-check: `npm run typecheck`

## Links úteis

- Express: https://expressjs.com
- pg: https://node-postgres.com
- Groq: https://groq.com
- PDFKit: http://pdfkit.org
- Nodemailer: https://nodemailer.com
- Winston: https://github.com/winstonjs/winston
- JWT: https://jwt.io
