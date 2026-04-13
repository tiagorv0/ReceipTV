# Documentação — ReceipTV

Índice completo de documentação do projeto.

**Última atualização:** 13 de abril de 2026

## Começar

1. **[README.md](../README.md)** — Visão geral do projeto, como rodar localmente
2. **[CLAUDE.md](../CLAUDE.md)** — Instruções obrigatórias para Claude Code
3. **[CODEMAPS.md](./CODEMAPS.md)** — Arquitetura geral, fluxos, dependências

## Por Camada

### Frontend (`client/`)
- **[client/README.md](../client/README.md)** — Estrutura React, rotas, responsividade
- **[client/CLAUDE.md](../client/CLAUDE.md)** — Convenções e padrões frontend
- **[client/DESIGN_SYSTEM.md](../client/DESIGN_SYSTEM.md)** — Cores, componentes, estilos

### Backend (`server/`)
- **[server/README.md](../server/README.md)** — API, endpoints, autenticação
- **[server/CLAUDE.md](../server/CLAUDE.md)** — Convenções backend, banco de dados

### Database
- **[docs/CODEMAPS.md](./CODEMAPS.md#database)** — Schema, tabelas, migrações

## Guias Específicos

### TypeScript
- **[docs/TYPES-GUIDE.md](./TYPES-GUIDE.md)** — Tipos compartilhados frontend/backend, padrões de tipagem

### Autenticação
- **[docs/CODEMAPS.md](./CODEMAPS.md#fluxo-1-login-e-autenticação)** — Fluxo JWT, cookies, refresh tokens

### Recursos

#### Extração por IA
- **[docs/CODEMAPS.md](./CODEMAPS.md#fluxo-2-upload-com-ia)** — Upload, Groq API, análise

#### Relatórios e Exportação
- **[docs/CODEMAPS.md](./CODEMAPS.md#fluxo-4-exportação-pdfzip)** — PDF, ZIP, e-mail

#### Responsividade
- **[client/README.md](../client/README.md#responsividade-obrigatória)** — Mobile-first, breakpoints

## TDD (Test Driven Development) - Tarefas Planejadas

Documentação de tarefas implementadas e em andamento:

- `tdd-autenticacao-sessao-jwt.md` — JWT, refresh tokens, sessão
- `tdd-auth-improvements.md` — Melhorias de autenticação
- `tdd-client-typescript-migration.md` — Migração do client para TS
- `tdd-backend-typescript-migration.md` — Migração do backend para TS
- `tdd-custom-scrollbar.md` — Scrollbar customizado
- `tdd-bottom-nav-mobile.md` — Navegação mobile
- `tdd-lancamento-manual.md` — Entrada manual de comprovantes
- `tdd-editar-comprovante.md` — Edição de comprovantes
- `tdd-email-cadastro.md` — Confirmação por e-mail (planejado)
- `tdd-exportar-historico-pdf.md` — Exportação PDF/ZIP
- `tdd-history-filters.md` — Filtros avançados com paginação infinita
- `tdd-date-display-standard.md` — Formatação padrão de datas
- `tdd-atualizar-node-v24.md` — Atualização Node 24

## Roadmap

- [x] Autenticação JWT + refresh tokens
- [x] Upload com IA (Groq)
- [x] Entrada manual
- [x] Edição de comprovantes
- [x] Dashboard com gráficos
- [x] Histórico com filtros avançados
- [x] Paginação infinita
- [x] Exportação PDF/ZIP
- [x] Envio por e-mail
- [x] PWA + Web Share Target
- [x] TypeScript em backend e frontend
- [ ] Testes unitários (jest + vitest)
- [ ] Testes e2e (Playwright)
- [ ] CI/CD (GitHub Actions)
- [ ] Deploy em produção
- [ ] Otimizações de performance

## Convenções Obrigatórias

### Todas as camadas
- **Linguagem:** Português Brasileiro (PT-BR)
- **TypeScript:** strict mode
- **Git:** Commits descritivos

### Frontend
- **Mobile-first:** Sem prefixo = mobile, `md:` = desktop
- **Componentes:** Reutilizáveis em `src/components/`
- **Responsividade:** Testar em 390px, 768px, 1280px
- **Filtros:** Persistir em URL via `useSearchParams`

### Backend
- **SQL:** Parametrizado sempre ($1, $2, ...)
- **ESM:** Imports com extensão `.js`
- **Logging:** Winston em operações críticas
- **API:** Documentada com `@swagger` no JSDoc

## Checklist de Desenvolvimento

Antes de commitar:

```
Frontend:
- [ ] Mobile-first testado (390px)
- [ ] Desktop testado (1280px)
- [ ] TypeScript compila sem erros
- [ ] ESLint passa (`npm run lint`)
- [ ] Responsividade OK (Sidebar/BottomNav)

Backend:
- [ ] TypeScript compila (`npm run typecheck`)
- [ ] SQL parametrizado
- [ ] Winston logs em pontos críticos
- [ ] Swagger docs atualizadas
- [ ] Migrações criadas (se schema mudou)

Geral:
- [ ] Commit com mensagem clara
- [ ] README atualizado (se necessário)
- [ ] Sem secrets no código (.env não é comitado)
```

## Estrutura de Diretórios

```
ReceipTV/
├── README.md                          ← Visão geral
├── CLAUDE.md                          ← Instruções globais
├── package.json                       ← Scripts raiz
│
├── client/                            # Frontend
│   ├── README.md                      ← Guia frontend
│   ├── CLAUDE.md                      ← Instruções frontend
│   ├── DESIGN_SYSTEM.md               ← Paleta e componentes
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── api/
│       ├── types/
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       ├── utils/
│       └── lib/
│
├── server/                            # Backend
│   ├── README.md                      ← Guia backend
│   ├── CLAUDE.md                      ← Instruções backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                   ← Entry point
│   │   ├── config/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   ├── migrations/
│   └── dist/                          ← Compilado (gitignored)
│
├── database/                          # Schema documentação
│
├── docs/                              # Documentação
│   ├── INDEX.md                       ← Este arquivo
│   ├── CODEMAPS.md                    ← Arquitetura
│   ├── TYPES-GUIDE.md                 ← Tipos TypeScript
│   └── tdd-*.md                       ← Tarefas implementadas
│
└── docker-compose.yml
```

## Links Úteis

### Documentação Oficial
- [React 19](https://react.dev)
- [Vite](https://vitejs.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Express](https://expressjs.com)
- [PostgreSQL](https://www.postgresql.org/docs)
- [Tailwind CSS](https://tailwindcss.com)

### Bibliotecas
- [React Router](https://reactrouter.com)
- [Recharts](https://recharts.org)
- [shadcn/ui](https://ui.shadcn.com)
- [Groq SDK](https://console.groq.com)
- [Axios](https://axios-http.com)
- [Winston](https://github.com/winstonjs/winston)

### Ferramentas
- [pg (node-postgres)](https://node-postgres.com)
- [PDFKit](http://pdfkit.org)
- [Nodemailer](https://nodemailer.com)
- [JWT](https://jwt.io)

## Perguntas Frequentes

**P: Como rodar em desenvolvimento?**
A: `npm run dev` na raiz (frontend + backend simultaneamente) ou `npm run server` / `npm run client` em terminais separados.

**P: Como é a autenticação?**
A: JWT em cookies httpOnly (15 min) + refresh token (30 dias). Interceptor Axios renova automaticamente em 401.

**P: Onde fica o arquivo do comprovante?**
A: Em `receipts.arquivo_data` (BYTEA no PostgreSQL), não no disco.

**P: Como adicionar um novo endpoint?**
A: Criar em `server/src/routes/`, adicionar JSDoc com `@swagger`, documentar em `server/README.md`.

**P: Como adicionar um novo componente?**
A: Criar em `client/src/components/`, exportar interface `Props`, documentar se público.

**P: O que fazer se TypeScript não compila?**
A: `npm run typecheck` no diretório (backend) ou executar `npm run lint` (frontend).

**P: Como rodar migrações?**
A: `npm run migrate` na raiz (automático na inicialização também).

---

**Versão:** 1.0.0  
**Última revisão:** 13 de abril de 2026  
**Responsável:** Tiago Vazzoller
