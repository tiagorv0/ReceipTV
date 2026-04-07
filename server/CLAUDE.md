# CLAUDE.md — server/

Instruções específicas para trabalhar na camada **backend** do ReceipTV.
Consulte também o `CLAUDE.md` na raiz do monorepo para convenções globais.

## Stack

- **Node.js 24** + **Express 5** + **TypeScript 5** (strict mode)
- **PostgreSQL 17** via `pg` (sem ORM — SQL puro)
- **JWT** (jsonwebtoken) + **bcryptjs** para autenticação
- **Groq SDK** (Llama 4 Scout) para extração de dados de comprovantes
- **Multer** para upload de arquivos
- **PDFKit** para geração de PDFs no servidor
- **Archiver** para exportação ZIP
- **Nodemailer** para envio de e-mail
- **Winston** + **Morgan** para logging
- **Swagger** (swagger-jsdoc + swagger-ui-express) para documentação

## Módulos ESM + TypeScript

Todo o código usa **ESM** (`import`/`export`) com TypeScript. O `package.json` declara `"type": "module"`.
**Nunca usar `require()`** (exceto `createRequire` para módulos CJS como `pdf-parse-new`).

Imports relativos **devem** usar extensão `.js` (o TypeScript resolve para `.ts` em compilação):
```ts
import pool from './config/database.js'; // ✅
import pool from './config/database';    // ❌
```

## Estrutura de diretórios

```
server/
├── src/                        # código-fonte TypeScript
│   ├── index.ts                # bootstrap do Express (middlewares, rotas, Swagger)
│   ├── config/
│   │   ├── database.ts         # pg.Pool via DATABASE_URL
│   │   ├── logger.ts           # Winston (console + arquivos error.log / all.log)
│   │   └── migrations.ts       # runner de migrações SQL automático
│   ├── routes/
│   │   ├── auth.ts             # registro, login, logout, refresh, me, profile, password, account
│   │   ├── receipts.ts         # upload AI, manual, listagem, download, exclusão, exportação
│   │   └── reports.ts          # relatórios agregados (totais, por banco/tipo, mensal)
│   ├── middleware/
│   │   └── auth.ts             # verifica JWT do cookie → popula req.user
│   ├── services/
│   │   ├── ai.ts               # integração Groq (PDF text / imagem base64 → JSON estruturado)
│   │   ├── pdf-export.ts       # PDFKit: tabela de comprovantes com totais
│   │   ├── zip-export.ts       # Archiver: bundle de comprovantes
│   │   └── mailer.ts           # Nodemailer SMTP
│   ├── types/                  # interfaces e tipos do domínio
│   │   ├── index.ts            # barrel re-exports
│   │   ├── user.ts             # User, UserPublic, UserJwtPayload
│   │   ├── receipt.ts          # Receipt, ReceiptRow, ReceiptFilters, AnalysisResult
│   │   ├── auth.ts             # LoginRequest, RegisterRequest, RefreshTokenRecord
│   │   ├── express.d.ts        # augmentation do Request.user
│   │   └── env.d.ts            # tipagem do process.env
│   └── utils/
│       └── title-case.ts       # helper de formatação de strings
├── dist/                       # output compilado (gitignored)
├── migrations/                 # arquivos .sql aplicados por config/migrations.ts
├── tsconfig.json
└── package.json
```

## Banco de dados

Usar **sempre SQL parametrizado** — nunca interpolação de strings em queries.

### Tabelas principais

| Tabela | Descrição |
|--------|-----------|
| `users` | id, username, email, password (bcrypt), created_at |
| `receipts` | id, user_id (FK), nome, valor, data_pagamento, banco, tipo_pagamento, descricao, arquivo_data (BYTEA), arquivo_mimetype, arquivo_nome, created_at |
| `refresh_tokens` | id, user_id (FK), token_hash, expires_at, revoked_at, created_at |
| `schema_migrations` | controle de migrações já aplicadas |

Arquivos de comprovante são armazenados como **BYTEA** em `receipts.arquivo_data` — **não no disco**.

## Autenticação

- `POST /api/auth/login` → gera access token (15 min) + refresh token (30 dias, hash no BD) → cookies httpOnly
- `POST /api/auth/refresh` → valida cookie `refreshToken`, emite novo access token
- `POST /api/auth/logout` → limpa cookies + revoga token no BD
- Middleware `middleware/auth.js` valida JWT do cookie `accessToken` → `req.user = { id, username }`
- Senha hasheada com `bcryptjs` (salt rounds padrão)

## Endpoints principais

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/auth/register` | Não | Criar conta |
| POST | `/api/auth/login` | Não | Autenticar |
| POST | `/api/auth/refresh` | Não | Renovar token |
| POST | `/api/auth/logout` | Sim | Logout |
| GET | `/api/auth/me` | Sim | Verificar sessão |
| GET | `/api/auth/profile` | Sim | Dados do usuário |
| PUT | `/api/auth/password` | Sim | Alterar senha |
| DELETE | `/api/auth/account` | Sim | Excluir conta |
| POST | `/api/receipts/analyze` | Sim | Extração por IA (Groq) |
| POST | `/api/receipts/manual` | Sim | Entrada manual |
| GET | `/api/receipts` | Sim | Listagem com filtros de data |
| GET | `/api/receipts/:id/file` | Sim | Download do arquivo original |
| DELETE | `/api/receipts/:id` | Sim | Remover comprovante |
| POST | `/api/receipts/export` | Sim | Exportar PDF / ZIP / e-mail |
| GET | `/api/reports/summary` | Sim | Dados do dashboard |

## Serviço de IA (`services/ai.js`)

- Modelo: `meta-llama/llama-4-scout-17b-16e-instruct` via Groq SDK
- PDFs: texto extraído com `pdf-parse-new` antes de enviar ao LLM
- Imagens: convertidas para base64 (vision)
- Retorno esperado: `{ nome, valor, data, banco, tipo_pagamento, descricao }`
- Registrar chamadas e erros com Winston (`logger.info` / `logger.error`)

## Logging

- `config/logger.js` — Winston com dois transportes: console + arquivo
- Nível de log: `debug` em desenvolvimento, `warn` em produção
- Usar `logger.info()` em fluxos de auth, upload e exportação
- Usar `logger.error()` em todos os catch de operações críticas
- Morgan está configurado no `index.js` e repassa para Winston — **não adicionar outro Morgan**

## Swagger

Documentar **todas** as rotas novas com JSDoc `@swagger`. O Swagger UI fica em `/api-docs`.
O `swaggerOptions.apis` aponta para `./src/routes/*.ts` (código-fonte TypeScript).
Manter os schemas de request/response sincronizados com a implementação real.

## Tratamento de erros

- Nunca expor SQL raw ou stack traces ao cliente
- Retornar mensagens de erro claras em português
- Usar status HTTP adequados: 400 (validação), 401 (não autenticado), 403 (sem permissão), 404 (não encontrado), 500 (erro interno)
- Registrar o erro completo no Winston antes de enviar resposta simplificada

## Migrações

Arquivos em `migrations/` são aplicados automaticamente na inicialização via `config/migrations.js`.
Nomear novos arquivos com prefixo incremental: `006_descricao.sql`.
Use a skill `/new-migration <descricao>` para criar o próximo arquivo com numeração automática.

## Variáveis de ambiente

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

## Comandos

```bash
npm run dev      # tsx watch src/index.ts (desenvolvimento, hot reload)
npm run build    # tsc (compila para dist/)
npm start        # node dist/index.js (produção)
npm run typecheck  # tsc --noEmit (verificar tipos sem compilar)
```
