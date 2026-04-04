---
name: node-backend-best-practices
description: Boas práticas para backend Node.js com Express 5, ESM (import/export), PostgreSQL via pg.Pool (sem ORM), JWT, Multer, Winston e Groq SDK. Use ao escrever rotas, middlewares, queries SQL, serviços de IA, upload de arquivos, autenticação JWT, ou ao revisar código do servidor. Complementa security-best-practices (segurança). Não duplica regras de segurança.
---

# Node.js Backend — Boas Práticas (Express 5 + ESM)

## ESM no Node.js — Armadilhas

```js
// ✅ Sempre import/export — NUNCA require()
import express from 'express';
import { readFile } from 'fs/promises';

// ✅ __dirname não existe em ESM — use import.meta
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ✅ JSON: importe com assert (ou leia com fs)
import config from './config.json' assert { type: 'json' };
// ou: const config = JSON.parse(await readFile('./config.json', 'utf8'));
```

---

## Express 5: Mudanças Importantes

### Async errors são propagados automaticamente

```js
// ✅ Express 5 captura rejeições de Promise sem try/catch
router.get('/receipts', async (req, res) => {
  const data = await db.query('SELECT * FROM receipts');
  res.json(data.rows);
  // qualquer throw aqui vai para o error handler global
});

// ❌ Não precisa mais de wrapper asyncHandler no Express 5
```

### Error handler centralizado (4 parâmetros)

```js
// server/index.js — sempre no final, depois de todas as rotas
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path, method: req.method });

  const status = err.status ?? err.statusCode ?? 500;
  const message = status < 500 ? err.message : 'Erro interno do servidor';

  res.status(status).json({ error: message });
});
```

---

## PostgreSQL com `pg.Pool`

### Parameterized queries — sempre

```js
// ✅ Parâmetros escapados automaticamente — imune a SQL injection
const { rows } = await pool.query(
  'SELECT * FROM receipts WHERE user_id = $1 AND amount > $2',
  [userId, minAmount]
);

// ❌ Interpolação de string é SQL injection
const result = await pool.query(`SELECT * FROM receipts WHERE id = ${id}`);
```

### Transações

```js
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO receipts(...) VALUES(...)', [...]);
  await client.query('UPDATE users SET receipt_count = receipt_count + 1 WHERE id = $1', [userId]);
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err; // propaga para o error handler do Express
} finally {
  client.release(); // SEMPRE libere o client
}
```

### Pool: configuração recomendada

```js
// server/config/db.js
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,              // conexões simultâneas máximas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error('Erro inesperado no pool PostgreSQL', err);
});

export default pool;
```

---

## Autenticação JWT

### Middleware de autenticação

```js
// server/middleware/auth.js
import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const token = header.slice(7);
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}
```

### Emissão de token

```js
const token = jwt.sign(
  { id: user.id, email: user.email },  // payload mínimo — sem dados sensíveis
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);
```

---

## Upload de Arquivos com Multer

```js
// server/middleware/upload.js
import multer from 'multer';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export const upload = multer({
  storage: multer.memoryStorage(), // armazena em buffer (salva como BYTEA no DB)
  limits: { fileSize: MAX_SIZE },
  fileFilter(req, file, cb) {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('Tipo de arquivo não permitido'), { status: 400 }));
    }
  },
});
```

---

## Winston: Logging

```js
// server/config/logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
```

**Quando logar:**
- `logger.error` — erros capturados no handler global, falhas de DB, erros de auth
- `logger.warn` — tentativas de acesso negadas, rate limits, inputs inválidos
- `logger.info` — início do servidor, conexão com DB confirmada
- `logger.debug` — chamadas de IA, queries lentas (apenas em dev)

```js
// ✅ Log estruturado — nunca concatene strings com dados
logger.error('Falha na query', { userId, query: sql, err });

// ❌ Nunca logue dados sensíveis
logger.info(`Login: user=${user.email} password=${password}`); // JAMAIS
```

---

## Organização de Rotas

```
server/
├── index.js          ← app setup, middlewares globais, error handler
├── routes/
│   ├── auth.js       ← /api/auth
│   ├── receipts.js   ← /api/receipts
│   └── reports.js    ← /api/reports
├── middleware/
│   ├── auth.js       ← JWT authenticate
│   └── upload.js     ← multer config
├── services/
│   ├── ai-analysis.js
│   └── pdf-export.js
└── config/
    ├── db.js
    └── logger.js
```

```js
// server/routes/receipts.js
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import pool from '../config/db.js';

const router = Router();

router.use(authenticate); // aplica auth em todas as rotas do arquivo

router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM receipts WHERE user_id = $1 ORDER BY date DESC',
    [req.user.id]
  );
  res.json(rows);
});

router.post('/', upload.single('file'), async (req, res) => {
  // req.file.buffer disponível para salvar como BYTEA
  // ...
  res.status(201).json(receipt);
});

export default router;
```

---

## Variáveis de Ambiente: Validação na Inicialização

```js
// server/index.js — valide no topo antes de qualquer import de serviço
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'GROQ_API_KEY'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`);
  process.exit(1);
}
```

---

## Checklist de Revisão

- [ ] Apenas `import`/`export` — sem `require()`
- [ ] `__dirname` via `import.meta` se necessário
- [ ] Todas as queries SQL usam `$1, $2` — sem interpolação
- [ ] Transações com `BEGIN/COMMIT/ROLLBACK` + `client.release()` no `finally`
- [ ] JWT verificado em middleware — nunca inline nas rotas
- [ ] Multer com `memoryStorage`, `fileFilter` e `limits.fileSize`
- [ ] Error handler com 4 parâmetros no final do `index.js`
- [ ] Log estruturado (objeto) — sem dados sensíveis logados
- [ ] Variáveis de ambiente validadas no boot
- [ ] Swagger atualizado ao adicionar/modificar endpoints
