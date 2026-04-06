---
name: node-typescript-backend-best-practices
description: Boas práticas para backend Node.js com TypeScript, Express 5, ESM, PostgreSQL via pg.Pool (sem ORM), JWT, Multer, Winston e Groq SDK. Use ao escrever, revisar ou migrar código TypeScript do servidor. Cobre tsconfig, tipagem de domínio, Express augmentation, extensões de import, pg generics, e padrões TS-specific. Complementa node-backend-best-practices (padrões JS gerais) e security-best-practices (segurança).
---

# Node.js + TypeScript Backend — Boas Práticas

Complementa `node-backend-best-practices` (padrões JS/Express/pg). Aqui: **apenas o que muda ou se adiciona com TypeScript**.

---

## tsconfig.json — Configuração Base

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

**Por que `module: "Node16"`:** resolve extensões `.js` corretamente em ESM e é o padrão recomendado para Node.js.

---

## Extensões de Import — Regra Crítica

Com `module: "Node16"`, imports **devem** usar extensão `.js` (TS resolve para `.ts` em compilação):

```ts
// ✅ Correto — TS resolve database.ts, runtime resolve database.js
import pool from './config/database.js';
import { Receipt } from './types/receipt.js';

// ❌ Errado — falha em runtime
import pool from './config/database';
import pool from './config/database.ts';
```

---

## Estrutura de Diretórios

```
server/
├── src/
│   ├── index.ts
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── types/          # interfaces e tipos do domínio
│   │   ├── index.ts    # barrel re-exports
│   │   ├── receipt.ts
│   │   ├── user.ts
│   │   ├── auth.ts
│   │   ├── express.d.ts
│   │   └── env.d.ts
│   └── utils/
├── dist/               # output compilado (gitignored)
├── migrations/         # permanece .sql
└── tsconfig.json
```

---

## Tipos do Domínio — Padrões

### Express Request Augmentation

```ts
// src/types/express.d.ts
import { UserJwtPayload } from './user.js';

declare module 'express' {
  interface Request {
    user?: UserJwtPayload;
  }
}
```

### Tipagem do `process.env`

```ts
// src/types/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    DATABASE_URL: string;
    JWT_SECRET: string;
    GROQ_API_KEY?: string;
    NODE_ENV?: 'development' | 'production';
  }
}
```

### Interfaces de domínio — convenções

```ts
// ✅ Interface para row do banco (snake_case, reflete a tabela)
export interface Receipt {
  id: number;
  user_id: number;
  nome: string;
  valor: number;
  data_pagamento: string;
  arquivo_data: Buffer | null;
  created_at: Date;
}

// ✅ Tipos derivados com utility types
export type ReceiptRow = Omit<Receipt, 'arquivo_data'>;
export type UserPublic = Pick<User, 'id' | 'username' | 'email'>;
export type UserJwtPayload = Pick<User, 'id' | 'username'> & { jti: string; iat: number; exp: number };

// ❌ Não duplique campos — derive com Pick/Omit/Partial
```

---

## PostgreSQL com Generics

```ts
// ✅ Tipar resultado de queries com generic
const { rows } = await pool.query<Receipt>(
  'SELECT * FROM receipts WHERE user_id = $1',
  [userId]
);
// rows é Receipt[]

// ✅ Tipar contagem
const { rows: [{ count }] } = await pool.query<{ count: string }>(
  'SELECT COUNT(*) FROM receipts WHERE user_id = $1',
  [userId]
);

// ✅ Tipar erros do pg
import { DatabaseError } from 'pg';

try {
  await pool.query('INSERT INTO users ...');
} catch (err) {
  if (err instanceof DatabaseError && err.code === '23505') {
    // unique violation — tratar
  }
  throw err;
}
```

### Params dinâmicos

```ts
// ✅ Array tipado para construção dinâmica de queries
const conditions: string[] = [];
const params: (string | number)[] = [];

if (filters.nome) {
  params.push(`%${filters.nome}%`);
  conditions.push(`nome ILIKE $${params.length}`);
}
```

---

## Express 5 + TypeScript

### Tipagem de handlers

```ts
import { Router, Request, Response } from 'express';

const router = Router();

// ✅ Express 5 captura async errors — sem wrapper
router.get('/', async (req: Request, res: Response) => {
  const { rows } = await pool.query<Receipt>('SELECT ...');
  res.json(rows);
});

// ✅ Tipar req.body com interface
router.post('/', async (req: Request<{}, {}, RegisterRequest>, res: Response) => {
  const { username, email, password } = req.body; // tipado
});

// ✅ Tipar req.params
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const id = parseInt(req.params.id, 10);
});
```

### Middleware tipado

```ts
import { Request, Response, NextFunction } from 'express';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }
  const token = header.slice(7);
  req.user = jwt.verify(token, process.env.JWT_SECRET) as UserJwtPayload;
  next();
}
```

---

## JWT com TypeScript

```ts
import jwt from 'jsonwebtoken';
import { UserJwtPayload } from './types/user.js';

// ✅ Cast explícito — jwt.verify retorna JwtPayload | string
const payload = jwt.verify(token, secret) as UserJwtPayload;

// ✅ Sign com tipo explícito do payload
const token = jwt.sign(
  { id: user.id, username: user.username } satisfies Pick<UserJwtPayload, 'id' | 'username'>,
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```

---

## Pacotes CommonJS em ESM TypeScript

```ts
// ✅ pdf-parse-new é CJS — usar createRequire
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse-new') as (buffer: Buffer) => Promise<{ text: string }>;

// ✅ pg — import default + destructure
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
```

---

## Scripts do `package.json`

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

- **Dev:** `tsx watch` (roda `.ts` direto, sem build)
- **Produção/Docker:** `tsc` + `node dist/`

---

## Dockerfile

```dockerfile
FROM node:24-alpine
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

---

## Anti-Patterns

```ts
// ❌ `any` desnecessário
const data: any = await pool.query('...');

// ✅ Use generic
const { rows } = await pool.query<Receipt>('...');

// ❌ Type assertion sem necessidade
const user = req.user as User; // user já é UserJwtPayload pelo augmentation

// ❌ Non-null assertion sem garantia
const file = req.file!; // pode ser undefined se upload falhou

// ✅ Verifique antes
if (!req.file) { res.status(400).json({ error: 'Arquivo obrigatório' }); return; }
const file = req.file; // agora é Multer.File garantido

// ❌ Interfaces vazias ou redundantes
interface EmptyProps {}

// ❌ Enums para valores simples — use union types
type PaymentType = 'pix' | 'boleto' | 'cartao' | 'transferencia';
```

---

## Checklist de Revisão TS

- [ ] Extensões `.js` em todos os imports relativos
- [ ] `strict: true` no tsconfig — sem `@ts-ignore` desnecessário
- [ ] Queries `pg` com generic: `pool.query<Type>(...)`
- [ ] `DatabaseError` importado de `pg` para tratar erros específicos
- [ ] `express.d.ts` com augmentation de `Request.user`
- [ ] `env.d.ts` com todas as variáveis usadas
- [ ] Zero `any` explícito (exceto CJS compat como `pdf-parse-new`)
- [ ] `satisfies` em vez de `as` quando possível
- [ ] `tsc --noEmit` passa com zero erros
- [ ] `dist/` no `.gitignore`
