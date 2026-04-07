# Codebase Structure

## Root
- `client/` — React 19 + Vite 7 SPA
- `server/` — Node.js Express 5 REST API
- `database/` — PostgreSQL schema SQL
- `migrate.js` — Migration runner
- `docker-compose.yml` — PostgreSQL + services

## Backend (`server/`)
- `index.js` — Entry point
- `config/database.js` — pg.Pool connection
- `config/logger.js` — Winston logger
- `config/migrations.js` — Migration config
- `routes/auth.js` — Register/login (JWT)
- `routes/receipts.js` — CRUD + upload + AI analysis
- `routes/reports.js` — Aggregated spending reports
- `services/ai.js` — AI extraction (Groq/Llama)
- `services/pdf-export.js` — PDF export
- `services/zip-export.js` — ZIP export
- `services/mailer.js` — Email service
- `middleware/` — JWT auth middleware
- `migrations/` — SQL migration files

## Frontend (`client/src/`)
- `App.jsx` — Router + routes
- `main.jsx` — Entry point
- `api/index.js` — Axios instance with JWT interceptor
- `api/services.js` — API service functions
- `pages/` — DashboardPage, HistoryPage, LoginPage, ProfilePage, UploadPage, ShareTargetPage
- `components/` — Reusable UI components
- `components/ui/` — shadcn/ui primitives (button, input, card, select, etc.)
- `hooks/` — Custom hooks (useSessionSync)
- `utils/` — banks, currency-utils, date-utils, DashboardPDFDocument
- `lib/utils.js` — Utility library (cn helper)
- `index.css` — Global styles + Tailwind
