# Codemaps — Arquitetura ReceipTV

**Última atualização:** 13 de abril de 2026

Guia de navegação da arquitetura do ReceipTV. Este documento fornece uma visão de alto nível dos módulos principais e seus relacionamentos.

## Visão Geral

ReceipTV é uma aplicação full-stack para gerenciamento de comprovantes financeiros com extração por IA:

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Pages: Dashboard, Upload, History, Reports, Profile │   │
│  │ Components: UI, Forms, Charts, Navigation            │   │
│  │ API Client: Axios + JWT Interceptor                  │   │
│  └──────────────────────────────────────────────────────┘   │
└────────┬────────────────────────────────────────────────────┘
         │ HTTP/REST + JWT
         │
┌────────▼────────────────────────────────────────────────────┐
│              BACKEND (Node.js + Express)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Routes: /auth, /receipts, /reports                   │   │
│  │ Services: AI (Groq), PDF Export, ZIP Export, Mailer  │   │
│  │ Middleware: JWT Auth                                 │   │
│  │ Database: pg.Pool → PostgreSQL                       │   │
│  └──────────────────────────────────────────────────────┘   │
└────────┬────────────────────────────────────────────────────┘
         │ SQL
         │
┌────────▼────────────────────────────────────────────────────┐
│              DATABASE (PostgreSQL 17)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Tables: users, receipts, refresh_tokens             │   │
│  │ Storage: Comprovantes em BYTEA (binário)             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

         ┌──────────────────────┐
         │  Groq API (Llama 4)  │
         │  IA Extraction       │
         └──────────────────────┘
```

## Stack Geral

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Runtime** | Node.js | 24+ |
| **Frontend** | React | 19 |
| **Build (Frontend)** | Vite | 7 |
| **Build (Backend)** | TypeScript | 5 |
| **Web Framework** | Express | 5 |
| **Database** | PostgreSQL | 17 |
| **Client SQL** | pg | 8 |
| **Auth** | JWT + bcryptjs | 9 + 3 |
| **IA** | Groq SDK | 0.37 |
| **Styling** | Tailwind CSS | 4 |
| **UI Components** | shadcn/ui | Custom |
| **Charts** | Recharts | 2 |
| **Animations** | Framer Motion | Latest |
| **PWA** | Workbox | 7 |

## Áreas Principais

### 1. **Frontend** (`client/`)

**Responsabilidade:** SPA React responsiva (mobile-first).

**Componentes chave:**
- `src/pages/` — Páginas de rota (Dashboard, Upload, History, Reports, Profile, Login)
- `src/components/` — Componentes reutilizáveis (Forms, Charts, Navigation, Modals)
- `src/api/index.ts` — Axios com interceptor JWT
- `src/types/` — Interfaces de domínio (Receipt, User, ApiResponse)
- `src/hooks/` — Custom hooks (useSessionSync para logout entre abas)
- `src/utils/` — Helpers puros (formatação de moeda, datas, bancos)

**Padrão:**
```
User Action (Login Page) 
  ↓
Request to /api/auth/login (Axios)
  ↓
JWT Token in cookie (httpOnly)
  ↓
Protected Route Check (/api/auth/me)
  ↓
Dashboard + Features (Upload, History, etc.)
```

**Responsividade:**
- Mobile-first: sem prefixo = ≤767px
- `md:` = ≥768px (desktop)
- Sidebar fixo no desktop, BottomNav no mobile

### 2. **Backend** (`server/`)

**Responsabilidade:** API REST com autenticação, análise IA e persistência.

**Componentes chave:**
- `src/routes/` — Endpoints (auth, receipts, reports)
- `src/middleware/auth.ts` — Validação JWT
- `src/services/ai.ts` — Integração Groq (PDF + imagem → JSON)
- `src/services/pdf-export.ts` — Geração PDF com PDFKit
- `src/services/zip-export.ts` — Empacotamento ZIP com Archiver
- `src/services/mailer.ts` — Nodemailer para e-mail
- `src/config/database.ts` — pg.Pool
- `src/config/logger.ts` — Winston (console + files)
- `src/config/migrations.ts` — Runner automático de SQL

**Padrão:**
```
Requisição HTTP
  ↓
Express Middleware (Morgan, CORS)
  ↓
Routes (/auth, /receipts, /reports)
  ↓
Middleware Auth (valida JWT)
  ↓
Handler → Service → Database
  ↓
Response JSON (ou arquivo binário)
```

### 3. **Database** (`database/` + `server/migrations/`)

**Responsabilidade:** Persistência de dados com migrações automáticas.

**Tabelas:**
- `users` — Autenticação (id, username, email, password_hash)
- `receipts` — Comprovantes (id, user_id, nome, valor, data, banco, tipo, arquivo em BYTEA)
- `refresh_tokens` — Sessões (id, user_id, token_hash, expires_at, revoked_at)
- `schema_migrations` — Controle de versão de schema

**Fluxo:**
```
Migration File (001_..., 002_..., etc.)
  ↓ (npm start OU npm run dev)
config/migrations.ts
  ↓
Verifica schema_migrations
  ↓
Executa SQL não aplicado
  ↓
Update schema_migrations
```

## Fluxos Principais

### Fluxo 1: Login e Autenticação

```
1. User POST /api/auth/login {username, password}
   ↓
2. Backend: Valida username (lowercase)
   ↓
3. Backend: bcryptjs.compare(password, hash_no_bd)
   ↓
4. Backend: Gera JWT access (15 min) + refresh (30 dias)
   ↓
5. Backend: Hash refresh token → salva em BD
   ↓
6. Backend: Retorna cookies httpOnly (access, refresh)
   ↓
7. Frontend: Armazena (cookies)
   ↓
8. Requisições subsequentes: Axios injeta Authorization header
   ↓
9. Backend: Middleware auth.ts valida JWT → req.user
   ↓
10. Se 401: Frontend POST /api/auth/refresh → novo access token
```

### Fluxo 2: Upload com IA

```
1. User seleciona arquivo (PDF/imagem) em UploadPage
   ↓
2. Frontend POST /api/receipts/analyze (multipart/form-data)
   ↓
3. Backend: Multer salva em memory (não disco)
   ↓
4. Backend: pdf-parse-new extrai texto (se PDF)
   ↓
5. Backend: services/ai.ts envia para Groq
   ↓
   Groq API: Retorna JSON estruturado
   ↓
6. Backend: Valida resposta JSON
   ↓
7. Backend: Salva em receipts (arquivo em BYTEA)
   ↓
8. Backend: Retorna dados extraídos
   ↓
9. Frontend: Mostra dados para confirmação (EditReceiptModal)
```

### Fluxo 3: Listagem com Filtros

```
1. User vai em HistoryPage (URL com search params)
   ↓
2. Frontend: useSearchParams obtém filtros da URL
   ↓
3. Frontend GET /api/receipts?dataDe=...&dataAte=...&banco=...
   ↓
4. Backend: Executa SQL parametrizado com WHERE clauses
   ↓
5. Backend: Paginação (limit + offset)
   ↓
6. Backend: Retorna { receipts: [], total, hasMore }
   ↓
7. Frontend: Renderiza lista
   ↓
8. User scrolla até fim → Intersection Observer
   ↓
9. Frontend: Carrega próxima página (offset += 20)
```

### Fluxo 4: Exportação PDF/ZIP

```
1. User clica "Exportar" em HistoryPage
   ↓
2. Frontend POST /api/receipts/export {format: 'pdf', dataDe, dataAte}
   ↓
3. Backend: Query comprovantes do período
   ↓
4. Backend: services/pdf-export.ts (PDFKit)
   OR services/zip-export.ts (Archiver + PDF individual)
   ↓
5. Backend: Retorna arquivo binário
   ↓
6. Frontend: Trigger download (blob → URL.createObjectURL)
```

## Dependências Principais

### Frontend
```json
{
  "react": "19.2.0",
  "react-dom": "19.2.0",
  "react-router-dom": "7.13.1",
  "vite": "7.3.1",
  "typescript": "6.0.2",
  "tailwindcss": "4.2.1",
  "@tailwindcss/vite": "4.2.1",
  "recharts": "2.15.4",
  "framer-motion": "latest",
  "@react-pdf/renderer": "4.3.2",
  "axios": "1.13.6",
  "shadcn": "4.0.2",
  "vite-plugin-pwa": "1.2.0"
}
```

### Backend
```json
{
  "express": "5.2.1",
  "typescript": "5.9.3",
  "pg": "8.20.0",
  "groq-sdk": "0.37.0",
  "bcryptjs": "3.0.3",
  "jsonwebtoken": "9.0.3",
  "multer": "2.1.1",
  "pdfkit": "0.18.0",
  "archiver": "7.0.1",
  "nodemailer": "8.0.4",
  "morgan": "1.10.1",
  "winston": "3.19.0",
  "swagger-jsdoc": "6.2.8",
  "swagger-ui-express": "5.0.1"
}
```

## Padrões de Código

### Frontend — TypeScript + React 19

```tsx
// Componente com props tipado
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

export function Button({ onClick, children }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

// API call com typing
const { data } = await axios.get<Receipt[]>('/api/receipts');

// Hook customizado
function useSessionSync() {
  useEffect(() => {
    const bc = new BroadcastChannel('logout');
    bc.onmessage = () => window.location.href = '/login';
    return () => bc.close();
  }, []);
}
```

### Backend — TypeScript 5 + ESM

```ts
// Import com extensão .js
import pool from './config/database.js';
import logger from './config/logger.js';

// Handler com typing
async function handleLogin(req: Request, res: Response) {
  try {
    const { username, password } = req.body;
    
    // SQL parametrizado
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );
    
    // Logging
    logger.info('Login attempt', { username });
    
    res.json({ user: result.rows[0] });
  } catch (error) {
    logger.error('Login error', { error });
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
}
```

## Convenções Obrigatórias

### Responsividade
- Mobile-first: sem prefixo = mobile (≤767px)
- Desktop: `md:` = ≥768px
- Sempre testar em 390px e 1280px

### TypeScript
- Strict mode obrigatório
- Interfaces em `types/`
- Sem `any` explícito desnecessário

### Backend SQL
- Parametrizado sempre: `$1, $2, ...`
- Nunca: `... WHERE id = ${id}`
- Indexes em campos de busca frequente

### Logging
- Winston em operações críticas (auth, upload, exportação)
- Nunca expor stack traces brutos ao cliente
- Mensagens em português

### Git
- Commits descritivos em português/inglês
- Branches feature: `feature/nome`
- PRs com descrição clara

## Arquivos Importantes

| Arquivo | Propósito |
|---------|-----------|
| `CLAUDE.md` | Instruções globais |
| `server/CLAUDE.md` | Instruções backend |
| `client/CLAUDE.md` | Instruções frontend |
| `server/README.md` | Documentação API |
| `client/README.md` | Guia frontend |
| `server/tsconfig.json` | Strict mode + ESM |
| `client/vite.config.ts` | Build + PWA |
| `server/src/index.ts` | Entry point |
| `client/src/main.tsx` | Entry point |

## Próximos Passos — Roadmap

- [ ] Testes unitários (vitest + jest)
- [ ] Testes e2e (Playwright)
- [ ] CI/CD (GitHub Actions)
- [ ] Deploy em produção (Docker + VPS)
- [ ] Otimizações de performance
- [ ] Documentação de API autogenerada

---

**Última revisão:** 13 de abril de 2026
