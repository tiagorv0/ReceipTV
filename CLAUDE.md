# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ReceipTV** is a full-stack financial receipt manager with AI-powered extraction, accessed via **web browser and mobile devices**. Users upload receipt files (PDFs or images), and an LLM extracts structured data (beneficiary name, amount, date, bank, payment type). The app provides dashboards and reports for spending analysis.

The UI must always be **fully responsive**: every frontend feature must work correctly on both desktop and mobile screens.

## Commands

### Development
```bash
# Start both frontend and backend concurrently
npm run dev

# Start backend only (port 5000)
npm run server

# Start frontend only (port 5173)
npm run client

# Install all dependencies (server + client)
npm install && npm run install-all
```

### Docker
```bash
# Start PostgreSQL (required before running the server)
docker-compose up -d

# Start all services (db + backend + frontend)
docker-compose up
```

### Frontend (from `client/`)
```bash
npm run dev       # Dev server
npm run build     # Production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

### Backend (from `server/`)
```bash
npm start         # Start server with node
npm run dev       # Start with nodemon (hot reload)
```

### Database
```bash
# Run migrations (from root)
node migrate.js
```

## Architecture

### Monorepo Structure
- `client/` — React 19 + Vite 7 SPA
- `server/` — Node.js Express 5 REST API (ESM modules, `"type": "module"`)
- `database/` — PostgreSQL schema SQL files
- `migrate.js` — Migration runner script

### Backend (`server/`)

**Entry:** `server/index.js`
**API base:** `/api`

Route domains:
- `/api/auth/` — Register and login (JWT issued on login)
- `/api/receipts/` — CRUD + file upload + AI analysis
- `/api/reports/` — Aggregated spending reports

Key directories:
- `config/` — DB pool (`pg.Pool`) and Winston logger
- `routes/` — Express route definitions
- `middleware/` — JWT auth middleware
- `services/` — AI analysis logic (PDF text extraction + LLM calls)
- `utils/` — Shared helpers

**Database:** PostgreSQL 17 via `pg` (no ORM — raw SQL with `pg.Pool`). Connection via `DATABASE_URL` env var.

**AI Integration:** Uses Groq SDK (`groq-sdk`) with Llama-4-Scout model. Supports PDF (text extracted via `pdf-parse-new`) and images (base64-encoded). Returns structured JSON.

**File uploads:** `multer` — files stored as `BYTEA` in the database, not on disk.

**Docs:** Swagger UI at `/api-docs`.

**Logging:** Morgan (HTTP requests) + Winston (application logs) integrated.

### Frontend (`client/`)

**Entry:** `src/main.jsx` → `src/App.jsx`

Route structure:
- `/login` — public
- `/` — Dashboard (protected)
- `/upload` — Upload receipt (protected)
- `/history` — Receipt list with advanced filters, sorting and infinite pagination (protected)
- `/profile` — User profile, password change and account deletion (protected)

Key directories:
- `src/api/` — Axios instance (`index.js`) with JWT interceptor + service functions (`services.js`)
- `src/components/` — Reusable UI; `src/components/ui/` is shadcn/ui
- `src/pages/` — Route-level page components
- `src/hooks/` — Custom React hooks
- `src/utils/` — Date, currency, bank helpers
- `src/lib/` — Utility libraries

**Path alias:** `@` → `src/`

**Styling:** Tailwind CSS 4 (Vite plugin) + shadcn/ui components. Prefer shadcn/ui for interactive elements (buttons, inputs, cards).

**Charts:** Recharts

**Animations:** Framer Motion

**Responsive layout:** Sidebar (desktop) / Bottom Nav (mobile) — both rendered in the Layout component. The sidebar uses `md:sticky md:top-0 md:h-screen` so Profile and Logout links are always visible regardless of main content height.

## Environment Variables

### Server (`.env` in `server/`)
```
DATABASE_URL=postgresql://postgres:root@localhost:5434/receiptv
JWT_SECRET=
GROQ_API_KEY=
PORT=5000
```

### Client (`.env` in `client/`)
```
VITE_API_URL=http://localhost:5000/api
```

## Key Conventions

- **Language:** Always respond in **PT-BR (Brazilian Portuguese)** unless the user explicitly requests otherwise.
- **Responsive UI:** Every frontend change must work on both desktop and mobile. Use Tailwind's `md:` breakpoint as the primary split. Mobile-first: no prefix = mobile, `md:` = desktop.
- **Backend modules:** ESM (`import`/`export`) throughout — do not use `require()`.
- **Auth:** JWT tokens stored in `localStorage`, injected via Axios request interceptor. Protected routes use `<ProtectedRoute>` wrapper.
- **Error handling:** Propagate errors with clear messages but never expose raw SQL or full stack traces to the client.
- **Swagger:** Keep route documentation in sync when adding or modifying API endpoints.
- **Logging:** Add Winston logs at critical points (errors, auth flows, AI calls).
- **Scrollbar:** Global custom scrollbar defined in `client/src/index.css` (`@layer base`). Uses `scrollbar-width: thin` + `scrollbar-color` (Firefox) and `::-webkit-scrollbar` (Chromium). Track = `zinc-900`, thumb = `zinc-700`, hover = `zinc-600`. Do not override per-component.
- **Collapse animation:** Use CSS `grid-template-rows: 0fr → 1fr` (with `overflow-hidden` on the inner child) for smooth expand/collapse. Avoid `max-height` hacks and external animation libraries for this pattern.
- **Filter persistence:** Filter state in `HistoryPage` is persisted via `useSearchParams` (URL search params) as the source of truth, enabling shareable URLs and browser back/forward navigation. Always sync `setSearchParams` together with local state updates.
- **PasswordInput component:** Use `PasswordInput` from `src/components/ui/input.jsx` for all password fields. It manages show/hide internally — do not reimplement with manual Eye/EyeOff state.
- **Form layout (password fields):** Use stacked layout (`space-y-4`, label above input) instead of fixed-column grids for password forms to ensure full-width inputs on mobile.
