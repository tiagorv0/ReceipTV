# Code Style & Conventions

## Language
- All responses must be in **PT-BR (Brazilian Portuguese)**

## Backend
- ESM modules (`import`/`export`) — never use `require()`
- Raw SQL with `pg.Pool` — no ORM
- JWT auth with middleware protection
- Winston for application logging, Morgan for HTTP request logging
- Swagger docs must stay in sync with API changes
- Error messages: clear but never expose raw SQL or stack traces to client

## Frontend
- React 19 with `.jsx` files (no TypeScript)
- **Mobile-first** responsive design: no prefix = mobile, `md:` = desktop
- Tailwind CSS 4 + shadcn/ui for interactive elements
- Path alias: `@` → `src/`
- JWT tokens in localStorage, injected via Axios interceptor
- Protected routes use `<ProtectedRoute>` wrapper

## UI Patterns
- **Responsive layout:** Sidebar (desktop) / Bottom Nav (mobile) in Layout component
- **Scrollbar:** Global custom scrollbar in `index.css` — do not override per-component
- **Collapse animation:** CSS `grid-template-rows: 0fr → 1fr` with `overflow-hidden` — avoid `max-height` hacks
- **Filter persistence:** `useSearchParams` as source of truth in HistoryPage
- **PasswordInput:** Use component from `src/components/ui/input.jsx` — do not reimplement
- **Form layout:** Stacked layout (`space-y-4`) for password forms, not fixed-column grids

## Hooks (Automated)
- `.env` file edits are blocked automatically (PreToolUse hook)
- ESLint runs with `--fix` after edits in `client/src/` (PostToolUse hook)
