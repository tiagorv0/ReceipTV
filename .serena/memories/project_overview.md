# ReceipTV - Project Overview

## Purpose
Full-stack financial receipt manager with AI-powered data extraction. Users upload receipt files (PDFs/images), and an LLM extracts structured data (beneficiary, amount, date, bank, payment type). Provides dashboards and reports for spending analysis.

## Tech Stack

### Frontend (`client/`)
- **React 19** + **Vite 7** (SPA, no SSR)
- **Tailwind CSS 4** (Vite plugin) + **shadcn/ui** components
- **Recharts** for charts, **Framer Motion** for animations
- **Axios** with JWT interceptor for API calls
- Path alias: `@` → `src/`
- All files are `.jsx` (no TypeScript on frontend)

### Backend (`server/`)
- **Node.js** with **Express 5** (ESM modules, `"type": "module"`)
- **PostgreSQL 17** via `pg.Pool` (raw SQL, no ORM)
- **JWT** authentication (tokens in localStorage)
- **Groq SDK** (`groq-sdk`) with Llama-4-Scout for AI extraction
- **Multer** for file uploads (stored as BYTEA in DB)
- **Winston** + **Morgan** for logging
- **Swagger UI** at `/api-docs`
- All files are `.js` with ESM imports

### Database
- PostgreSQL 17 (Docker on port 5434)
- Schema in `database/schema.sql`
- Migrations in `server/migrations/`
- Migration runner: `node migrate.js` (from root)

## System
- Developed on **Windows 11**
- Uses bash shell in terminal
