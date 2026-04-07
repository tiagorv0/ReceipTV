# Suggested Commands

## Development
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

## Docker
```bash
# Start PostgreSQL (required before running the server)
docker-compose up -d

# Start all services (db + backend + frontend)
docker-compose up
```

## Frontend (from `client/`)
```bash
npm run dev       # Dev server
npm run build     # Production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

## Backend (from `server/`)
```bash
npm start         # Start server with node
npm run dev       # Start with nodemon (hot reload)
```

## Database
```bash
node migrate.js   # Run migrations (from root)
```

## System Utils (Windows with bash)
```bash
git status / git log / git diff   # Git operations
ls / ls -la                       # List files
find . -name "pattern"            # Find files
grep -r "pattern" .               # Search in files
```
