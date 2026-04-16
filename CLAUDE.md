# CLAUDE.md

## Project

**ReceipTV**: full-stack receipt manager, AI extraction, web + mobile. Users upload PDFs/images → LLM extracts (beneficiary, amount, date, bank, payment type). Dashboard + reports for spending analysis.

UI always **fully responsive**: desktop + mobile.

## Languages

TypeScript (frontend + backend), active JS→TS migration. Follow existing TS patterns. Node.js backend, Docker deploy.

## Commands

### Dev
```bash
npm run dev        # both frontend + backend
npm run server     # backend only (port 5000)
npm run client     # frontend only (port 5173)
npm install && npm run install-all  # all deps
```

### Docker
```bash
docker-compose up -d   # PostgreSQL only
docker-compose up      # db + backend + frontend
```

### Frontend (`client/`)
```bash
npm run dev       # dev server
npm run build     # prod build
npm run lint      # ESLint
npm run preview   # preview build
```

### Backend (`server/`)
```bash
npm start         # node dist/index.js
npm run dev       # tsx watch (hot reload)
npm run build     # tsc → dist/
npm run typecheck # type-check only
```

### DB
```bash
npm run migrate   # run migrations (from root)
```

## Architecture

Monorepo:
- `client/` — React 19 + Vite 7 SPA (TS 5)
- `server/` — Express 5 REST API (TS 5 + ESM)
- `database/` — PostgreSQL schema SQL

**Backend entry:** `server/src/index.ts` | base: `/api`

Routes:
- `/api/auth/` — register/login (JWT)
- `/api/receipts/` — CRUD + upload + AI
- `/api/reports/` — aggregated reports

Dirs (`server/src/`): `config/` (DB pool + logger), `routes/`, `middleware/` (JWT), `services/` (AI), `types/`, `utils/`

DB: PostgreSQL 17 via `pg` (raw SQL). `DATABASE_URL` env.
AI: Groq SDK, Llama-4-Scout. PDF (pdf-parse-new) + images (base64).
Files: multer → stored BYTEA in DB, not disk.
Docs: Swagger UI `/api-docs`.
Logging: Morgan + Winston.

**Frontend entry:** `src/main.tsx` → `src/App.tsx`

Routes: `/login` (public), `/` Dashboard, `/upload`, `/history`, `/profile`, `/share-target` (PWA)

Dirs: `src/api/` (Axios + interceptor), `src/types/`, `src/components/` (shadcn/ui in `ui/`), `src/pages/`, `src/hooks/`, `src/utils/`, `src/lib/`

Path alias: `@` → `src/`
Styling: Tailwind CSS 4 + shadcn/ui.
Charts: Recharts. Animations: Framer Motion.
Layout: Sidebar (desktop `md:sticky md:top-0 md:h-screen`) / BottomNav (mobile).

## Env Vars

Server (`server/.env`):
```
DATABASE_URL=postgresql://postgres:root@localhost:5434/receiptv
JWT_SECRET=
GROQ_API_KEY=
PORT=5000
SUPABASE_LOG_URL=postgresql://postgres:[senha]@[host]:5432/postgres
```

Client (`client/.env`):
```
VITE_API_URL=http://localhost:5000/api
```

## Conventions

- **Hooks:** `.env` edits auto-blocked (PreToolUse). ESLint `--fix` after `client/src/` edits (PostToolUse).
- **Language:** PT-BR always, unless user requests otherwise.
- **Responsive:** mobile-first. No prefix = mobile, `md:` = desktop.
- **Backend:** ESM only, no `require()` (except `createRequire` for CJS). Relative imports need `.js` ext.
- **Auth:** JWT in cookies (httpOnly), Axios interceptor, `<ProtectedRoute>` wrapper.
- **Errors:** clear Portuguese messages, never expose raw SQL or stack traces.
- **Swagger:** keep docs in sync on every route change.
- **Logging:** Winston at auth, upload, AI call points. Transport opcional para Supabase via `SUPABASE_LOG_URL` (persiste `info`, `warn`, `error` em banco).
- **Scrollbar:** global in `client/src/index.css`. Track=`zinc-900`, thumb=`zinc-700`, hover=`zinc-600`. No per-component override.
- **Collapse animation:** CSS `grid-template-rows: 0fr→1fr` + `overflow-hidden`. No `max-height` hacks.
- **Filter persistence:** `HistoryPage` uses `useSearchParams` as truth. Sync `setSearchParams` + local state together.
- **PasswordInput:** use `PasswordInput` from `src/components/ui/input.tsx`. No manual Eye/EyeOff reimpl.
- **Password forms:** stacked layout (`space-y-4`, label above input). No fixed-column grids.
