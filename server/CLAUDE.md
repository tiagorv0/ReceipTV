# CLAUDE.md — server/

See root CLAUDE.md for global conventions.

## Stack

Node.js 24 + Express 5 + TypeScript 5 (strict) | PostgreSQL 17 via `pg` (raw SQL) | JWT + bcryptjs | Groq SDK (Llama 4 Scout) | Multer | PDFKit | Archiver | Nodemailer | Winston + Morgan | Swagger

## ESM + TypeScript

All code ESM (`import`/`export`). `"type": "module"` in package.json. No `require()` (except `createRequire` for CJS like `pdf-parse-new`).

Relative imports need `.js` ext:
```ts
import pool from './config/database.js'; // ✅
import pool from './config/database';    // ❌
```

## Structure

```
server/
├── src/
│   ├── index.ts                # Express bootstrap
│   ├── config/
│   │   ├── database.ts         # pg.Pool via DATABASE_URL
│   │   ├── logger.ts           # Winston (console + error.log/all.log)
│   │   └── migrations.ts       # auto SQL migration runner
│   ├── routes/
│   │   ├── auth.ts             # register, login, logout, refresh, me, profile, password, account
│   │   ├── receipts.ts         # upload AI, manual, list, download, delete, export
│   │   └── reports.ts          # aggregated reports
│   ├── middleware/
│   │   └── auth.ts             # JWT cookie → req.user
│   ├── services/
│   │   ├── ai.ts               # Groq (PDF/image → structured JSON)
│   │   ├── pdf-export.ts       # PDFKit table with totals
│   │   ├── zip-export.ts       # Archiver bundle
│   │   └── mailer.ts           # Nodemailer SMTP
│   ├── types/
│   │   ├── index.ts            # barrel re-exports
│   │   ├── user.ts             # User, UserPublic, UserJwtPayload
│   │   ├── receipt.ts          # Receipt, ReceiptRow, ReceiptFilters, AnalysisResult
│   │   ├── auth.ts             # LoginRequest, RegisterRequest, RefreshTokenRecord
│   │   ├── express.d.ts        # Request.user augmentation
│   │   └── env.d.ts            # process.env types
│   └── utils/
│       └── title-case.ts
├── dist/                       # compiled output (gitignored)
├── migrations/                 # .sql files applied at startup
├── tsconfig.json
└── package.json
```

## DB

Always parametrized SQL — no string interpolation in queries.

| Table | Fields |
|-------|--------|
| `users` | id, username, email, password (bcrypt), created_at |
| `receipts` | id, user_id (FK), nome, valor, data_pagamento, banco, tipo_pagamento, descricao, arquivo_data (BYTEA), arquivo_mimetype, arquivo_nome, created_at |
| `refresh_tokens` | id, user_id (FK), token_hash, expires_at, revoked_at, created_at |
| `schema_migrations` | applied migration control |

Files stored as BYTEA in `receipts.arquivo_data` — not on disk.

## Auth

- `POST /api/auth/login` → access token (15 min) + refresh token (30 days, hash in DB) → httpOnly cookies
- `POST /api/auth/refresh` → validate `refreshToken` cookie → new access token
- `POST /api/auth/logout` → clear cookies + revoke in DB
- Middleware validates JWT from `accessToken` cookie → `req.user = { id, username }`
- Password hashed with bcryptjs (default salt rounds)

## Endpoints

| Method | Route | Auth | |
|--------|-------|------|-|
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Authenticate |
| POST | `/api/auth/refresh` | No | Renew token |
| POST | `/api/auth/logout` | Yes | Logout |
| GET | `/api/auth/me` | Yes | Check session |
| GET | `/api/auth/profile` | Yes | User data |
| PUT | `/api/auth/password` | Yes | Change password |
| DELETE | `/api/auth/account` | Yes | Delete account |
| POST | `/api/receipts/analyze` | Yes | AI extraction (Groq) |
| POST | `/api/receipts/manual` | Yes | Manual entry |
| GET | `/api/receipts` | Yes | List with filters |
| GET | `/api/receipts/:id/file` | Yes | Download file |
| DELETE | `/api/receipts/:id` | Yes | Delete receipt |
| POST | `/api/receipts/export` | Yes | Export PDF/ZIP/email |
| GET | `/api/reports/summary` | Yes | Dashboard data |

## AI Service

- Model: `meta-llama/llama-4-scout-17b-16e-instruct` via Groq
- PDF: text extracted with `pdf-parse-new` before LLM call
- Images: base64 (vision)
- Returns: `{ nome, valor, data, banco, tipo_pagamento, descricao }`
- Log calls + errors via Winston

## Logging

- Winston: console + file. `debug` in dev, `warn` in prod.
- `logger.info()` on auth, upload, export flows
- `logger.error()` on all critical catch blocks
- Morgan in `index.ts` pipes to Winston — don't add another Morgan

## Swagger

All new routes need JSDoc `@swagger`. UI at `/api-docs`. `swaggerOptions.apis` → `./src/routes/*.ts`. Keep schemas in sync.

## Error Handling

- Never expose raw SQL or stack traces to client
- Return clear Portuguese error messages
- HTTP status: 400 (validation), 401 (unauthenticated), 403 (forbidden), 404 (not found), 500 (internal)
- Log full error to Winston before sending simplified response

## Migrations

Files in `migrations/` applied automatically at startup via `config/migrations.ts`. Prefix: `006_descricao.sql`. Use `/new-migration <descricao>` skill for auto-numbering.

## Env Vars

```env
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=
GROQ_API_KEY=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
NODE_ENV=development|production
```

## Commands

```bash
npm run dev        # tsx watch (hot reload)
npm run build      # tsc → dist/
npm start          # node dist/index.js
npm run typecheck  # tsc --noEmit
```
