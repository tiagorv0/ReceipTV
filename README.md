# ReceipTV

ReceipTV é um gerenciador financeiro de comprovantes com extração automática por IA. Faça upload de PDFs ou imagens de comprovantes e o sistema extrai automaticamente os dados estruturados (beneficiário, valor, data, banco e tipo de pagamento) para gerar dashboards e relatórios de gastos.

**Status do projeto:** Desenvolvimento ativo  
**Última atualização:** 13 de abril de 2026  
**Linguagem:** JavaScript/TypeScript (migração ativa para TS)  
**Responsividade:** Completamente responsivo (desktop + mobile)

## Funcionalidades

- **Extração por IA**: Analisa PDFs e imagens via Groq (Llama 4 Scout) para extrair nome, valor, data, banco e tipo de pagamento (PIX, TED, Boleto)
- **Entrada Manual**: Formulário para inserir comprovantes manualmente sem IA
- **Autenticação JWT**: Login e cadastro com senha criptografada (bcryptjs)
- **Edição de Comprovantes**: Editar dados extraídos incorretamente pela IA
- **Dashboard**: Gráficos de gastos mensais, totais por banco e tipo de pagamento via Recharts
- **Histórico Avançado**: Listagem com filtros por período, banco, tipo de pagamento e busca por beneficiário com paginação infinita
- **Relatórios Detalhados**: Visão gráfica de despesas com múltiplas dimensões
- **Exportação**: PDF, ZIP e e-mail com histórico de comprovantes
- **PWA**: Instalável como app, com suporte a compartilhamento de arquivos via Web Share Target API
- **Responsivo**: Sidebar fixo no desktop, Bottom Nav no mobile
- **API Documentada**: Swagger UI em `/api-docs`
- **Perfil de Usuário**: Alteração de senha e exclusão de conta

## Tecnologias

**Frontend**
- React 19 + Vite 7 com TypeScript 5
- Tailwind CSS 4 (plugin Vite) + shadcn/ui para componentes
- React Router 7 para roteamento
- Recharts para gráficos
- Framer Motion para animações
- @react-pdf/renderer para PDF no cliente
- Axios com interceptor JWT
- PWA com Workbox + vite-plugin-pwa

**Backend**
- Node.js 24+ com Express 5 (ESM + TypeScript 5)
- PostgreSQL 17 via `pg` (SQL parametrizado, sem ORM)
- Groq SDK com modelo Llama 4 Scout para IA
- PDFKit e Archiver para exportação
- Nodemailer para envio de e-mail
- JWT (jsonwebtoken) + bcryptjs para autenticação
- Multer para upload de arquivos (armazenamento em BYTEA)
- Morgan + Winston para logging (com suporte opcional a Supabase para persistência)
- Swagger com swagger-jsdoc para documentação de API

## Como Rodar

### Pré-requisitos
- Node.js 24+
- Docker e Docker Compose

### 1. Clonar e instalar dependências

```bash
git clone <repositorio>
cd ReceipTV
npm install && npm run install-all
```

### 2. Iniciar o banco de dados

```bash
docker-compose up -d
```

Isso iniciará:
- PostgreSQL 17 em `localhost:5434`

### 3. Configurar variáveis de ambiente

**`server/.env`:**
```env
DATABASE_URL=postgresql://postgres:root@localhost:5434/receiptv
JWT_SECRET=sua_chave_super_secreta_aqui
GROQ_API_KEY=sua_chave_da_api_groq
PORT=5000
NODE_ENV=development

# Opcional - para exportação por e-mail
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Opcional - para persistência de logs no Supabase
SUPABASE_LOG_URL=postgresql://postgres:[senha]@[host]:5432/postgres
```

**`client/.env`:**
```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Rodar em desenvolvimento

```bash
# Ambos frontend e backend juntos
npm run dev

# OU separadamente:
# Terminal 1
npm run server

# Terminal 2 (outro terminal)
npm run client
```

**URLs:**
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Swagger API: `http://localhost:5000/api-docs`

### Com Docker Compose (completo)

Para rodar todos os serviços (DB + Backend + Frontend) com um comando:

```bash
docker-compose up
```

## Estrutura do Projeto

```
ReceipTV/
├── client/                       # Frontend - React 19 + Vite
│   ├── src/
│   │   ├── api/                  # Axios + serviços HTTP
│   │   │   ├── index.ts          # Configuração de interceptores
│   │   │   └── services.ts       # Funções de chamada à API
│   │   ├── components/           # Componentes reutilizáveis
│   │   │   └── ui/               # shadcn/ui (não editar manualmente)
│   │   ├── pages/                # Componentes de página/rota
│   │   ├── hooks/                # Custom hooks (ex: useSessionSync)
│   │   ├── types/                # Interfaces TypeScript
│   │   ├── utils/                # Helpers puros
│   │   ├── lib/                  # Utilitários (cn = clsx + twMerge)
│   │   ├── index.css             # Estilos globais (Tailwind)
│   │   ├── sw.ts                 # Service Worker do PWA
│   │   └── main.tsx              # Entry point
│   ├── index.html
│   ├── vite.config.ts            # Configuração Vite + PWA
│   ├── tsconfig.json
│   └── package.json
│
├── server/                       # Backend - Node.js + Express
│   ├── src/
│   │   ├── index.ts              # Bootstrap do Express
│   │   ├── config/
│   │   │   ├── database.ts       # Pool PostgreSQL
│   │   │   ├── logger.ts         # Winston logger
│   │   │   └── migrations.ts     # Runner automático de migrações
│   │   ├── routes/
│   │   │   ├── auth.ts           # Login, cadastro, refresh, perfil
│   │   │   ├── receipts.ts       # Upload, análise, CRUD, exportação
│   │   │   └── reports.ts        # Relatórios agregados
│   │   ├── middleware/
│   │   │   └── auth.ts           # Verificação JWT
│   │   ├── services/
│   │   │   ├── ai.ts             # Integração Groq
│   │   │   ├── pdf-export.ts     # Geração PDF
│   │   │   ├── zip-export.ts     # Empacotamento ZIP
│   │   │   └── mailer.ts         # Nodemailer SMTP
│   │   ├── types/                # Interfaces TypeScript
│   │   └── utils/
│   │       └── title-case.ts     # Formatação de strings
│   ├── migrations/               # Migrações SQL
│   ├── dist/                     # Output compilado (gitignored)
│   ├── tsconfig.json
│   └── package.json
│
├── database/                     # Documentação de schema
├── docs/                         # Documentação do projeto (TDD, guias)
├── CLAUDE.md                     # Instruções para Claude Code
├── docker-compose.yml
└── package.json
```

## Rotas da Aplicação

| Caminho | Acesso | Descrição |
|---------|--------|-----------|
| `/login` | Público | Página de login/cadastro |
| `/` | Protegido | Dashboard com gráficos |
| `/upload` | Protegido | Upload de comprovante (IA ou manual) |
| `/history` | Protegido | Histórico com filtros avançados e paginação |
| `/reports` | Protegido | Relatórios detalhados |
| `/profile` | Protegido | Perfil, alterar senha, excluir conta |
| `/share-target` | Protegido | Handler PWA Share Target |

## API - Domínios Principais

### Autenticação
- `POST /api/auth/register` — Criar conta
- `POST /api/auth/login` — Login (tokens JWT)
- `POST /api/auth/refresh` — Renovar access token
- `POST /api/auth/logout` — Logout (revogar refresh token)
- `GET /api/auth/me` — Verificar sessão ativa
- `GET /api/auth/profile` — Dados do usuário
- `PUT /api/auth/password` — Alterar senha
- `DELETE /api/auth/account` — Deletar conta

### Comprovantes (Receipts)
- `POST /api/receipts/analyze` — Upload com análise IA
- `POST /api/receipts/manual` — Entrada manual
- `GET /api/receipts` — Listar com filtros
- `GET /api/receipts/:id/file` — Download do arquivo original
- `PUT /api/receipts/:id` — Editar comprovante
- `DELETE /api/receipts/:id` — Remover comprovante
- `POST /api/receipts/export` — Exportar PDF/ZIP/e-mail

### Relatórios
- `GET /api/reports/summary` — Dashboard (totais, gráficos)

Documentação completa em `/api-docs` (Swagger UI).

## Banco de Dados

**Tabelas principais:**
| Tabela | Descrição |
|--------|-----------|
| `users` | ID, username, email, senha (bcrypt), created_at |
| `receipts` | Comprovantes com dados extraídos e arquivo binário (BYTEA) |
| `refresh_tokens` | Tokens com hash, expiração e revogação |
| `schema_migrations` | Controle de migrações aplicadas |

**Conectar:**
```bash
PGPASSWORD=root psql -h localhost -p 5434 -U postgres -d receiptv
```

## Autenticação

- **Access Token:** JWT (15 min) em cookie `httpOnly`
- **Refresh Token:** 30 dias em cookie `httpOnly`, hash armazenado no BD
- **Fluxo:** Login → access + refresh tokens → Expiração → `POST /auth/refresh` → novo access token
- **Interceptor:** Frontend intercepta 401 e renova token automaticamente
- **Logout:** Revoga refresh token no BD + limpa cookies

## Desenvolvimento

### Estrutura TypeScript

O projeto usa **TypeScript 5 em strict mode** com **ESM** (import/export).

**Backend:**
- `"type": "module"` em `package.json`
- Imports relativos **obrigatoriamente com extensão `.js`** (TypeScript resolve para `.ts`)
- Exemplo: `import pool from './config/database.js'`

**Frontend:**
- `tsconfig.json` com `"moduleResolution": "bundler"`
- Imports normais sem extensão (Vite cuida do bundling)
- Path alias `@` → `src/`

### Comandos úteis

**Frontend:**
```bash
npm run dev       # Servidor de desenvolvimento
npm run build     # Build de produção
npm run preview   # Preview do build
npm run lint      # ESLint
```

**Backend:**
```bash
npm run dev       # tsx watch (hot reload)
npm run build     # Compilar TypeScript
npm start         # Rodar build compilado
npm run typecheck # Verificar tipos sem compilar
```

**Database:**
```bash
npm run migrate   # Rodar migrações SQL
```

### Padrões e Convenções

**Frontend:**
- Mobile-first: sem prefixo = mobile, `md:` = desktop
- Componentes reutilizáveis em `src/components/`
- Página-específico em `src/pages/`
- Filtros em `HistoryPage` usam `useSearchParams` para URLs compartilháveis
- Animação collapse: `grid-template-rows: 0fr → 1fr` com `overflow-hidden`
- Scrollbar customizado globalmente em `src/index.css`

**Backend:**
- SQL parametrizado (nunca interpolação)
- Logging com Winston em pontos críticos
- Respostas de erro sem stack traces brutos
- JSDoc com `@swagger` para endpoints (Swagger UI)

### Git Hooks

- **PreToolUse:** Bloqueia edição de `.env`
- **PostToolUse:** ESLint com `--fix` em edições do `client/src/`

## Contribuindo

1. Consulte `CLAUDE.md` na raiz para convenções obrigatórias
2. Consulte `server/CLAUDE.md` para instruções de backend
3. Consulte `client/CLAUDE.md` para instruções de frontend
4. Mantenha a responsividade mobile-first
5. Adicione documentação Swagger para novos endpoints
6. Use Winston para logging de operações críticas

## Roadmap

- [x] Autenticação JWT com refresh tokens
- [x] Extração por IA (Groq)
- [x] Dashboard com gráficos
- [x] Histórico com filtros
- [x] PWA + Web Share Target
- [x] Edição de comprovantes
- [x] Exportação PDF/ZIP
- [x] Envio por e-mail
- [x] TypeScript completo no backend e frontend
- [ ] Testes unitários (jest + vitest)
- [ ] CI/CD com GitHub Actions
- [ ] Deploy na produção

## Licença

Projeto pessoal. Desenvolvido por Tiago Vazzoller.
