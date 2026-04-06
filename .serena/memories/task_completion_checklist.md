# Task Completion Checklist

When a task is completed, ensure the following:

## Frontend changes
1. **Responsive check:** Verify the change works on both mobile and desktop (mobile-first with `md:` breakpoint)
2. **ESLint:** Runs automatically via PostToolUse hook after edits in `client/src/`
3. **Build check:** `cd client && npm run build` to verify no build errors

## Backend changes
1. **Swagger:** Update API docs if routes were added or modified
2. **Logging:** Add Winston logs at critical points (errors, auth flows, AI calls)
3. **Migrations:** If schema changed, create migration file in `server/migrations/` and run `node migrate.js`

## General
1. **Test manually** if possible (start with `npm run dev`)
2. **Git:** Commit with clear message describing the change
