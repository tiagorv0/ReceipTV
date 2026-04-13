# Guia de Tipos TypeScript — ReceipTV

**Última atualização:** 13 de abril de 2026

Documentação dos tipos compartilhados e padrões de tipagem entre frontend e backend.

## Princípio de Design

Os tipos no frontend **espelham** os tipos no backend:

```
server/src/types/receipt.ts  ←→  client/src/types/receipt.ts
server/src/types/user.ts     ←→  client/src/types/user.ts
server/src/types/auth.ts     ←→  client/src/types/auth.ts
```

**Diferença importante:**
- Backend: tipos "brutos" (com `Buffer` para arquivos em BYTEA)
- Frontend: tipos "secos" (sem `Buffer`, sem campos binários desnecessários)

## Tipos de Domínio

### User (Autenticação)

**Backend (`server/src/types/user.ts`):**
```ts
export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;  // nunca enviar ao client
  created_at: string;     // ISO 8601
}

export interface UserPublic {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface UserJwtPayload {
  id: number;
  username: string;
  iat: number;  // issued at
  exp: number;  // expiration
}
```

**Frontend (`client/src/types/user.ts`):**
```ts
export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}
```

**Uso no Frontend:**
```tsx
const [user, setUser] = useState<User | null>(null);

useEffect(() => {
  const fetchMe = async () => {
    const res = await axios.get<User>('/api/auth/me');
    setUser(res.data);
  };
  fetchMe();
}, []);
```

### Receipt (Comprovante)

**Backend (`server/src/types/receipt.ts`):**
```ts
export interface Receipt {
  id: number;
  user_id: number;
  nome: string;           // beneficiário
  valor: number;          // decimal
  data_pagamento: string; // YYYY-MM-DD
  banco: string;          // Nubank, Itaú, etc.
  tipo_pagamento: string; // PIX, TED, BOLETO
  descricao?: string;
  arquivo_data: Buffer;   // BYTEA do PostgreSQL
  arquivo_mimetype: string;
  arquivo_nome: string;
  created_at: string;
}

export interface ReceiptRow {
  id: number;
  user_id: number;
  nome: string;
  valor: number;
  data_pagamento: string;
  banco: string;
  tipo_pagamento: string;
  descricao?: string;
  arquivo_mimetype: string;
  arquivo_nome: string;
  created_at: string;
  // arquivo_data é omitido na resposta (muito grande)
}

export interface AnalysisResult {
  nome: string;
  valor: number;
  data: string;           // YYYY-MM-DD
  banco: string;
  tipo_pagamento: string;
  descricao?: string;
}

export interface ReceiptFilters {
  dataDe?: string;        // YYYY-MM-DD
  dataAte?: string;
  banco?: string;
  tipo?: string;
  search?: string;        // beneficiário
  limit?: number;
  offset?: number;
}
```

**Frontend (`client/src/types/receipt.ts`):**
```ts
export interface Receipt {
  id: number;
  nome: string;
  valor: number;
  data_pagamento: string;
  banco: string;
  tipo_pagamento: string;
  descricao?: string;
  arquivo_mimetype: string;
  arquivo_nome: string;
  created_at: string;
  // arquivo_data omitido (binário, nunca usado no client)
}

export interface ReceiptFilters {
  dataDe?: string;
  dataAte?: string;
  banco?: string;
  tipo?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AnalysisResult {
  nome: string;
  valor: number;
  data: string;
  banco: string;
  tipo_pagamento: string;
  descricao?: string;
}
```

**Uso no Frontend:**
```tsx
const [receipts, setReceipts] = useState<Receipt[]>([]);
const [filters, setFilters] = useState<ReceiptFilters>({
  dataDe: '2026-04-01',
  dataAte: '2026-04-30',
});

useEffect(() => {
  const fetch = async () => {
    const res = await axios.get<{ receipts: Receipt[]; total: number }>(
      '/api/receipts',
      { params: filters }
    );
    setReceipts(res.data.receipts);
  };
  fetch();
}, [filters]);
```

### API Response

**Backend (`server/src/types/api.ts`):**
```ts
export interface ApiResponse<T> {
  data?: T;
  message: string;
  error?: string;
  timestamp?: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  status: number;
  timestamp: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
```

**Frontend (`client/src/types/api.ts`):**
```ts
export interface ApiResponse<T> {
  data?: T;
  message: string;
  error?: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}
```

## Tipos de Autenticação

### Login/Register

**Backend (`server/src/types/auth.ts`):**
```ts
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserPublic;
  message: string;
  // tokens são cookies httpOnly
}

export interface RefreshTokenRecord {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: string;  // ISO 8601
  revoked_at?: string;
  created_at: string;
}
```

**Frontend (`client/src/types/auth.ts`):**
```ts
export interface LoginForm {
  username: string;
  password: string;
}

export interface RegisterForm {
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  message: string;
}
```

## Relatórios

**Backend (`server/src/types/report.ts`):**
```ts
export interface ReceiptSummary {
  totalGasto: number;
  mediaValor: number;
  totalComprovantes: number;
  porBanco: Array<{
    banco: string;
    total: number;
    quantidade: number;
  }>;
  porTipo: Array<{
    tipo: string;
    total: number;
    quantidade: number;
  }>;
  porMes: Array<{
    mes: string;    // YYYY-MM
    total: number;
    quantidade: number;
  }>;
}
```

**Frontend (`client/src/types/index.ts`):**
```ts
export interface ReceiptSummary {
  totalGasto: number;
  mediaValor: number;
  totalComprovantes: number;
  porBanco: Array<{
    banco: string;
    total: number;
    quantidade: number;
  }>;
  porTipo: Array<{
    tipo: string;
    total: number;
    quantidade: number;
  }>;
  porMes: Array<{
    mes: string;
    total: number;
    quantidade: number;
  }>;
}
```

## Padrões de Uso

### 1. Tipando requisições HTTP

**Backend (Express handler):**
```ts
import { Request, Response } from 'express';
import type { User } from '../types/user.js';

async function getProfile(req: Request, res: Response): Promise<void> {
  const user = req.user as User;  // augmented by auth middleware
  res.json(user);
}
```

**Frontend (Axios service):**
```ts
import axios from 'axios';
import type { User, LoginRequest } from '@/types';

export const authService = {
  login: async (data: LoginRequest): Promise<User> => {
    const response = await axios.post<User>('/api/auth/login', data);
    return response.data;
  },
};
```

### 2. Tipando estado React

```tsx
import { useState } from 'react';
import type { Receipt, ReceiptFilters } from '@/types';

interface HistoryPageState {
  receipts: Receipt[];
  filters: ReceiptFilters;
  loading: boolean;
  error: string | null;
  total: number;
}

export function HistoryPage() {
  const [state, setState] = useState<HistoryPageState>({
    receipts: [],
    filters: { dataDe: '', dataAte: '' },
    loading: false,
    error: null,
    total: 0,
  });

  return (
    <div>
      {state.receipts.map((receipt) => (
        <ReceiptCard key={receipt.id} receipt={receipt} />
      ))}
    </div>
  );
}
```

### 3. Tipando props de componentes

```tsx
import type { Receipt } from '@/types';

interface ReceiptCardProps {
  receipt: Receipt;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => Promise<void>;
}

export function ReceiptCard({
  receipt,
  onEdit,
  onDelete,
}: ReceiptCardProps) {
  return (
    <Card>
      <p>{receipt.nome}</p>
      <p>{receipt.valor.toFixed(2)}</p>
      {onEdit && <button onClick={() => onEdit(receipt.id)}>Editar</button>}
    </Card>
  );
}
```

## Conversão de Tipos

Alguns tipos precisam conversão entre o servidor e cliente:

### Date (string ↔ Date)

**Backend (PostgreSQL retorna ISO string):**
```ts
const created_at: string = '2026-04-13T12:30:00.000Z';
```

**Frontend (converter para Date para cálculos):**
```ts
const receipt: Receipt = {
  // ... outros campos
  created_at: '2026-04-13T12:30:00.000Z',
};

const date = new Date(receipt.created_at);
const formatted = date.toLocaleDateString('pt-BR');
```

### Número (decimal no BD)

**Backend (PostgreSQL DECIMAL):**
```sql
SELECT valor::numeric FROM receipts;  -- retorna string em node-postgres
```

**Tipagem:**
```ts
export interface Receipt {
  valor: number;  // frontend espera number
}
```

**Backend handler:**
```ts
const result = await pool.query('SELECT valor FROM receipts WHERE id = $1', [id]);
const receipt = {
  ...result.rows[0],
  valor: parseFloat(result.rows[0].valor),  // converter string → number
};
```

## Tipos de Ambiente

### Backend (augmenting Express Request)

**`server/src/types/express.d.ts`:**
```ts
import 'express';
import type { User } from './user.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;  // populated by auth middleware
    }
  }
}
```

**Uso:**
```ts
app.use((req, res, next) => {
  if (req.user) {
    console.log(`User: ${req.user.username}`);
  }
  next();
});
```

### Variáveis de Ambiente

**`server/src/types/env.d.ts`:**
```ts
declare namespace NodeJS {
  interface ProcessEnv {
    PORT: string;
    DATABASE_URL: string;
    JWT_SECRET: string;
    GROQ_API_KEY: string;
    NODE_ENV: 'development' | 'production' | 'test';
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_USER?: string;
    SMTP_PASS?: string;
  }
}
```

**Uso:**
```ts
const port = parseInt(process.env.PORT || '5000', 10);
const dbUrl = process.env.DATABASE_URL;  // tipo: string

if (!dbUrl) {
  throw new Error('DATABASE_URL não configurado');
}
```

## Dicas de Tipagem

### 1. Usar `interface` para objetos públicos
```ts
export interface User {
  id: number;
  username: string;
}
```

### 2. Usar `type` para aliases/unions
```ts
export type PaymentType = 'PIX' | 'TED' | 'BOLETO' | 'OUTRA';
export type SortOrder = 'asc' | 'desc';
```

### 3. Omitir campos sensíveis em tipos públicos
```ts
// ❌ Nunca retornar ao client
interface User {
  password_hash: string;  // NUNCA
}

// ✅ Usar tipo público
interface UserPublic {
  id: number;
  username: string;
  email: string;
}
```

### 4. Usar `Partial<T>` para optional
```ts
interface UpdateReceiptRequest extends Partial<Receipt> {
  id: number;  // obrigatório
}
```

### 5. Validação em runtime (zod)

Para validação rigorosa, considere usar `zod`:

```ts
import { z } from 'zod';

const receiptSchema = z.object({
  nome: z.string().min(1),
  valor: z.number().positive(),
  data_pagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  banco: z.string(),
  tipo_pagamento: z.enum(['PIX', 'TED', 'BOLETO', 'OUTRA']),
});

const validateReceipt = (data: unknown): Receipt => {
  return receiptSchema.parse(data);
};
```

## Sincronização entre Frontend e Backend

**Checklist:**
- [ ] Novo tipo criado no backend em `server/src/types/`
- [ ] Correspondente criado no frontend em `client/src/types/`
- [ ] Campos públicos sincronizados (campos sensíveis omitidos no frontend)
- [ ] TypeScript compila sem erros (`npm run typecheck`)
- [ ] Requisição HTTP tipada corretamente
- [ ] Testes de integração passam

---

**Última revisão:** 13 de abril de 2026
