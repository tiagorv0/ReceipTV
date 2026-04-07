# TDD — Migração do Backend de JavaScript para TypeScript

**Projeto:** ReceipTV — Backend (`server/`)
**Autor:** Tiago Vazzoller + Claude
**Data:** 2026-04-06
**Status:** Proposta

---

## 1. Objetivo

Converter todo o código do backend (`server/`) de JavaScript (ESM) para TypeScript, mantendo o comportamento funcional idêntico. A migração visa:

- **Segurança de tipos** em tempo de desenvolvimento e build
- **Autocomplete e refatoração** mais confiáveis na IDE
- **Detecção precoce de bugs** (parâmetros errados, propriedades inexistentes, etc.)
- **Documentação implícita** — tipos servem como contrato das interfaces

---

## 2. Escopo

### Incluído
- Todos os 13 arquivos `.js` em `server/` (1.596 linhas total)
- Configuração do `tsconfig.json`
- Atualização do `package.json` (scripts, dependências)
- Atualização do `Dockerfile`
- Criação de tipos/interfaces para domínios da aplicação (User, Receipt, etc.)
- Atualização do `server/CLAUDE.md`

### Excluído
- Frontend (`client/`) — permanece como está
- Arquivos SQL de migração (`migrations/*.sql`)
- Arquivos de configuração do Docker Compose (raiz)
- Alterações funcionais ou de comportamento na API

---

## 3. Inventário de Arquivos

| Arquivo Atual | Linhas | Arquivo Destino | Complexidade |
|---|---|---|---|
| `index.js` | 85 | `src/index.ts` | Baixa |
| `config/database.js` | 16 | `src/config/database.ts` | Baixa |
| `config/logger.js` | 56 | `src/config/logger.ts` | Baixa |
| `config/migrations.js` | 75 | `src/config/migrations.ts` | Média |
| `middleware/auth.js` | 17 | `src/middleware/auth.ts` | Baixa |
| `routes/auth.js` | 470 | `src/routes/auth.ts` | Alta |
| `routes/receipts.js` | 509 | `src/routes/receipts.ts` | Alta |
| `routes/reports.js` | 40 | `src/routes/reports.ts` | Baixa |
| `services/ai.js` | 93 | `src/services/ai.ts` | Média |
| `services/pdf-export.js` | 130 | `src/services/pdf-export.ts` | Média |
| `services/zip-export.js` | 70 | `src/services/zip-export.ts` | Baixa |
| `services/mailer.js` | 26 | `src/services/mailer.ts` | Baixa |
| `utils/title-case.js` | 9 | `src/utils/title-case.ts` | Baixa |

**Total:** ~1.596 linhas → estimativa de ~1.750 linhas (tipos adicionais)

---

## 4. Arquitetura Pós-Migração

### 4.1 Estrutura de Diretórios

```
server/
├── src/                          # ← código-fonte TypeScript
│   ├── index.ts
│   ├── config/
│   │   ├── database.ts
│   │   ├── logger.ts
│   │   └── migrations.ts
│   ├── middleware/
│   │   └── auth.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── receipts.ts
│   │   └── reports.ts
│   ├── services/
│   │   ├── ai.ts
│   │   ├── pdf-export.ts
│   │   ├── zip-export.ts
│   │   └── mailer.ts
│   ├── types/                    # ← interfaces e tipos do domínio
│   │   ├── index.ts              # re-exports
│   │   ├── receipt.ts
│   │   ├── user.ts
│   │   ├── auth.ts
│   │   ├── express.d.ts          # augmentation do Request
│   │   └── env.d.ts              # tipagem do process.env
│   └── utils/
│       └── title-case.ts
├── dist/                         # ← output compilado (gitignored)
├── migrations/                   # ← permanece .sql (não muda)
├── tsconfig.json
├── package.json
├── Dockerfile
└── .env
```

### 4.2 Decisão: `src/` + `dist/`

O código-fonte vai para `src/` e o build compila para `dist/`. Motivos:

- **Separação clara** entre fonte e artefato
- Permite usar `rootDir`/`outDir` no tsconfig sem conflito
- `node --watch dist/index.js` continua funcionando para dev (via `tsc --watch` em paralelo)
- Alternativa avaliada: **tsx** (roda `.ts` direto) — descartada para manter build explícito e compatibilidade com produção/Docker

---

## 5. Configuração do TypeScript

### 5.1 `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Justificativas:**
- `"module": "Node16"` — compatível com ESM no Node.js, resolve `.js` extensions corretamente
- `"strict": true` — ativa todas as checagens estritas de uma vez
- `"target": "ES2024"` — Node 24 suporta nativamente
- `"sourceMap": true` — stack traces apontam para `.ts` em dev

### 5.2 Extensões de Import

Com `module: "Node16"`, imports devem usar extensão `.js` (o TS resolve para `.ts` automaticamente):

```ts
// ✅ Correto
import pool from './config/database.js';

// ❌ Errado (não resolve em runtime)
import pool from './config/database';
import pool from './config/database.ts';
```

---

## 6. Dependências

### 6.1 Novas dependências de dev

```bash
npm install -D typescript @types/express @types/cors @types/cookie-parser \
  @types/morgan @types/multer @types/nodemailer @types/pg @types/bcryptjs \
  @types/jsonwebtoken @types/archiver @types/swagger-jsdoc \
  @types/swagger-ui-express @types/pdfkit tsx
```

### 6.2 Bibliotecas com tipos built-in (NÃO precisam de @types)

| Pacote | Tipos incluídos |
|--------|----------------|
| `groq-sdk` | Sim (escrito em TS) |
| `winston` | Sim (`index.d.ts`) |
| `dotenv` | Sim (`lib/main.d.ts`) |
| `pdf-parse-new` | Sim (`index.d.ts`) |
| `axios` | Sim (`index.d.ts`) |

### 6.3 Scripts atualizados (`package.json`)

```json
{
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx watch src/index.ts",
    "typecheck": "tsc --noEmit"
  }
}
```

**Nota:** `tsx` é usado apenas em dev para DX rápida (sem passo de build). Em produção e Docker, sempre usa `tsc` + `node dist/`.

---

## 7. Tipos do Domínio

### 7.1 `src/types/user.ts`

```ts
export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  created_at: Date;
}

export type UserPublic = Pick<User, 'id' | 'username' | 'email'>;
export type UserJwtPayload = Pick<User, 'id' | 'username'> & { jti: string; iat: number; exp: number };
```

### 7.2 `src/types/receipt.ts`

```ts
export interface Receipt {
  id: number;
  user_id: number;
  nome: string;
  valor: number;
  data_pagamento: string;
  banco: string | null;
  tipo_pagamento: string;
  descricao: string | null;
  arquivo_data: Buffer | null;
  arquivo_mimetype: string | null;
  arquivo_nome: string | null;
  created_at: Date;
}

export type ReceiptRow = Omit<Receipt, 'arquivo_data'>;

export interface ReceiptFilters {
  startDate?: string;
  endDate?: string;
  nome?: string;
  banco?: string;
  tipoPagamento?: string;
  valorMin?: string;
  valorMax?: string;
  sortBy?: string;
}

export interface AnalysisResult {
  nome: string;
  valor: number;
  data: string;
  banco: string;
  tipo_pagamento: string;
  descricao: string;
}
```

### 7.3 `src/types/auth.ts`

```ts
export interface LoginRequest {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface RefreshTokenRecord {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
}
```

### 7.4 `src/types/express.d.ts` — Augmentation do Request

```ts
import { UserJwtPayload } from './user.js';

declare module 'express' {
  interface Request {
    user?: UserJwtPayload;
  }
}
```

### 7.5 `src/types/env.d.ts` — Tipagem do `process.env`

```ts
declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    DATABASE_URL: string;
    JWT_SECRET: string;
    GROQ_API_KEY?: string;
    NODE_ENV?: 'development' | 'production';
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_USER?: string;
    SMTP_PASS?: string;
    SMTP_FROM?: string;
  }
}
```

---

## 8. Pontos de Atenção por Arquivo

### 8.1 `config/database.ts`
- `pg` usa import default `pkg` + destructuring `{ Pool }`. Com `@types/pg` + ESM, pode-se usar `import pg from 'pg'` e `const pool = new pg.Pool(...)` (padrão ESM do pg).

### 8.2 `config/migrations.ts`
- Usa `fs.readdirSync` e `fs.readFileSync` — tipar retorno do `client.query` com generics: `client.query<{ version: string }>('SELECT version ...')`.
- Bloco de execução direta (`process.argv[1]`) permanece funcional.

### 8.3 `middleware/auth.ts`
- Export default de função anônima → converter para função nomeada tipada.
- `req.user` precisa do type augmentation (seção 7.4).
- `jwt.verify` retorna `JwtPayload | string` — fazer cast para `UserJwtPayload`.

### 8.4 `routes/auth.ts`
- Arquivo mais extenso (470 linhas). Tipar `req.body` com as interfaces de `types/auth.ts`.
- `err.code` e `err.constraint` — erro do `pg` é `DatabaseError`, tipar com `import { DatabaseError } from 'pg'`.
- Funções helper (`generateAccessToken`, `hashToken`, etc.) já têm tipos implícitos simples.

### 8.5 `routes/receipts.ts`
- `multer` com `memoryStorage()` — `req.file` já é tipado por `@types/multer`.
- Queries parametrizadas com construção dinâmica de `conditions[]` e `params[]` — manter `params` como `(string | number)[]`.
- Dynamic imports (`await import('../services/pdf-export.js')`) funcionam normalmente em TS.

### 8.6 `services/ai.ts`
- **`pdf-parse-new`:** Usa `createRequire` para importar (CommonJS puro). Com tipos disponíveis, manter o padrão `createRequire` mas tipar o retorno.
- `groq-sdk` é totalmente tipado — aproveitar os tipos de `ChatCompletion`, `ChatCompletionMessageParam`, etc.

### 8.7 `services/pdf-export.ts`
- `PDFDocument` do `pdfkit` — `@types/pdfkit` cobre a API. Atenção ao `bufferPages: true` que pode precisar de assertion.
- Funções internas (`formatCurrency`, `formatDate`) são puras e triviais de tipar.

### 8.8 `services/zip-export.ts`
- `archiver` tipado por `@types/archiver`. O `Buffer.from(r.arquivo_data)` precisa garantir que `arquivo_data` não é `null` (já filtrado pelo `withFiles`).

---

## 9. Dockerfile Atualizado

```dockerfile
FROM node:24-alpine

ARG env=production
ENV NODE_ENV=$env

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/
COPY migrations/ ./migrations/

RUN npm run build

EXPOSE 5000

CMD ["node", "dist/index.js"]
```

**Mudanças:**
- Copia `tsconfig.json` e `src/` em vez de tudo
- Adiciona step `RUN npm run build` (compila TS → JS)
- CMD aponta para `dist/index.js`

---

## 10. Swagger

Os comentários `@swagger` JSDoc nas rotas continuam funcionando em `.ts`. O `swagger-jsdoc` lê os comentários do código-fonte.

Atualizar o path no `swaggerOptions`:

```ts
// Antes
apis: ['./routes/*.js']

// Depois (aponta para os .ts fonte)
apis: ['./src/routes/*.ts']
```

**Alternativa em produção:** Se o Swagger ler do `dist/`, usar `['./dist/routes/*.js']`. Recomendo apontar para `src/` e garantir que `swagger-jsdoc` consegue ler `.ts` (ele usa glob + fs.readFile, funciona).

---

## 11. Plano de Execução (Fases)

### Fase 1 — Setup (~5 min)
1. Criar diretório `server/src/` e `server/src/types/`
2. Instalar dependências (`typescript`, `@types/*`, `tsx`)
3. Criar `tsconfig.json`
4. Atualizar `package.json` (scripts)
5. Adicionar `dist/` ao `.gitignore`

### Fase 2 — Tipos do Domínio (~10 min)
1. Criar `src/types/user.ts`
2. Criar `src/types/receipt.ts`
3. Criar `src/types/auth.ts`
4. Criar `src/types/express.d.ts`
5. Criar `src/types/env.d.ts`
6. Criar `src/types/index.ts` (barrel export)

### Fase 3 — Migração dos Módulos Base (~15 min)
Converter na ordem de dependência (folhas primeiro):
1. `utils/title-case.ts`
2. `config/database.ts`
3. `config/logger.ts`
4. `middleware/auth.ts`
5. `config/migrations.ts`

### Fase 4 — Migração dos Services (~15 min)
1. `services/mailer.ts`
2. `services/pdf-export.ts`
3. `services/zip-export.ts`
4. `services/ai.ts`

### Fase 5 — Migração das Rotas (~20 min)
1. `routes/reports.ts` (mais simples, 40 linhas)
2. `routes/auth.ts` (mais extenso, 470 linhas)
3. `routes/receipts.ts` (509 linhas)

### Fase 6 — Entry Point e Integração (~10 min)
1. `index.ts`
2. `tsc --noEmit` — verificar zero erros
3. `npm run build` — gerar `dist/`
4. Testar: `node dist/index.js` → servidor sobe e responde

### Fase 7 — Cleanup e Docs (~5 min)
1. Remover arquivos `.js` antigos da raiz do `server/`
2. Atualizar `Dockerfile`
3. Atualizar `server/CLAUDE.md`
4. Atualizar script `migrate` no `package.json` raiz
5. Verificar que `npm run dev` funciona (tsx watch)

---

## 12. Atualização do `package.json` Raiz

```json
{
  "scripts": {
    "server": "cd server && npm run dev",
    "migrate": "cd server && tsx src/config/migrations.ts"
  }
}
```

---

## 13. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| `pdf-parse-new` com `createRequire` falha em TS strict | Média | Médio | Manter `createRequire` + declarar tipo manualmente se necessário |
| Swagger JSDoc não lê comentários de `.ts` | Baixa | Médio | Testar cedo; fallback: apontar para `dist/*.js` |
| Tipos do `pdfkit` incompletos (API `bufferPages`) | Baixa | Baixo | Usar type assertion pontual |
| Docker build mais lento (step `tsc`) | Certa | Baixo | Aceitável; adicionar `.dockerignore` para `node_modules` e `dist` |
| Express 5 + `@types/express` incompatibilidade | Baixa | Médio | `@types/express@5.x` já existe e cobre Express 5 |

---

## 14. Critérios de Aceite

- [ ] `tsc --noEmit` passa com zero erros
- [ ] `npm run build` gera `dist/` com todos os arquivos
- [ ] `node dist/index.js` sobe o servidor normalmente
- [ ] Todos os endpoints respondem identicamente (testar manualmente: login, upload, export, reports)
- [ ] `npm run dev` (tsx watch) funciona para desenvolvimento
- [ ] Docker build funciona (`docker-compose up`)
- [ ] Nenhum `any` explícito desnecessário (permitido apenas em casos justificados como `pdf-parse-new`)
- [ ] Swagger UI (`/api-docs`) continua funcional

---

## 15. O Que NÃO Muda

- **Comportamento da API** — zero breaking changes
- **Banco de dados** — mesmas queries, mesmas tabelas
- **Migrations** — arquivos `.sql` permanecem intocados
- **Frontend** — nenhuma alteração
- **Variáveis de ambiente** — mesmas keys
- **Lógica de negócio** — conversão 1:1 com adição de tipos
