# Leia-me Primeiro — Documentação ReceipTV

**Última atualização:** 13 de abril de 2026

Bem-vindo à documentação do ReceipTV! Este guia rápido vai te direcionar para o que você precisa.

---

## Começar em 3 passos

### 1️⃣ Entender o projeto

Leia em 5 minutos:
- **[README.md](../README.md)** — O que é ReceipTV, stack, como rodar

### 2️⃣ Encontrar um tópico específico

Use este índice:
- **[docs/INDEX.md](./INDEX.md)** — Catálogo completo de tópicos

### 3️⃣ Seguir as regras

Obrigatório antes de qualquer contribuição:
- **[CLAUDE.md](../CLAUDE.md)** — Convenções do projeto

---

## Roteiros por Perfil

### 👨‍💻 Desenvolvedor Frontend

**Objetivo:** Trabalhar em React/Vite

**Sequência recomendada:**
1. [README.md](../README.md) — Visão geral
2. [client/README.md](../client/README.md) — Estrutura frontend
3. [client/CLAUDE.md](../client/CLAUDE.md) — Convenções frontend
4. [docs/TYPES-GUIDE.md](./TYPES-GUIDE.md) — Tipos TypeScript
5. [client/DESIGN_SYSTEM.md](../client/DESIGN_SYSTEM.md) — UI/estilos

**Dicas rápidas:**
- `npm run dev` para rodar em desenvolvimento
- `npm run lint` para ESLint
- Mobile-first: sem prefixo = mobile, `md:` = desktop
- Componentes reutilizáveis em `src/components/`

**Checklist antes de commitar:**
- [ ] Testei em 390px (mobile) e 1280px (desktop)
- [ ] TypeScript compila sem erros
- [ ] ESLint passa (`npm run lint`)
- [ ] Não quebrei componentes existentes

---

### 🔧 Desenvolvedor Backend

**Objetivo:** Trabalhar em Node.js/Express

**Sequência recomendada:**
1. [README.md](../README.md) — Visão geral
2. [server/README.md](../server/README.md) — API e endpoints
3. [server/CLAUDE.md](../server/CLAUDE.md) — Convenções backend
4. [docs/TYPES-GUIDE.md](./TYPES-GUIDE.md) — Tipos TypeScript
5. [docs/CODEMAPS.md](./CODEMAPS.md) — Arquitetura (fluxos)

**Dicas rápidas:**
- `npm run dev` para tsx watch (hot reload)
- `npm run typecheck` para verificar tipos
- SQL parametrizado sempre: `$1, $2, ...` (nunca interpolação)
- Logging com Winston em operações críticas
- Documentar endpoints com `@swagger` no JSDoc

**Checklist antes de commitar:**
- [ ] TypeScript compila sem erros (`npm run typecheck`)
- [ ] SQL é parametrizado
- [ ] Adicionei logs Winston onde necessário
- [ ] Atualizei Swagger docs
- [ ] Criei migrações se mudei schema

---

### 🏗️ Arquiteto / Tech Lead

**Objetivo:** Entender a arquitetura geral

**Sequência recomendada:**
1. [README.md](../README.md) — Visão geral
2. [docs/CODEMAPS.md](./CODEMAPS.md) — Mapa de arquitetura
3. [docs/INDEX.md](./INDEX.md) — Documentação por área
4. [docs/TYPES-GUIDE.md](./TYPES-GUIDE.md) — Tipagem
5. [CLAUDE.md](../CLAUDE.md) — Convenções obrigatórias

**Documentos-chave:**
- Fluxos principais em [docs/CODEMAPS.md](./CODEMAPS.md)
- Stack em [README.md](../README.md)
- Padrões em [CLAUDE.md](../CLAUDE.md), [client/CLAUDE.md](../client/CLAUDE.md), [server/CLAUDE.md](../server/CLAUDE.md)

---

### 🔄 Code Reviewer

**Objetivo:** Revisar PRs com qualidade

**Pontos-chave a verificar:**

**Frontend:**
- [ ] Responsivo? Testei em mobile (390px) e desktop (1280px)
- [ ] TypeScript strict? `npm run typecheck` passa?
- [ ] ESLint? `npm run lint` passa?
- [ ] shadcn/ui? Não recriou componentes primitivos?
- [ ] useSearchParams? Filtros persistem na URL?
- [ ] PasswordInput? Não reimplementou show/hide?

**Backend:**
- [ ] TypeScript? `npm run typecheck` passa?
- [ ] SQL parametrizado? Nunca interpolação?
- [ ] Logging? Winston em operações críticas?
- [ ] Swagger docs? Endpoints documentados?
- [ ] Migrações? Se schema mudou, criou migration SQL?
- [ ] ESM imports? Com extensão `.js`?

**Geral:**
- [ ] Commit message clara em PT-BR?
- [ ] Não comitou .env ou secrets?
- [ ] README ou docs atualizados se necessário?

---

## Perguntas Frequentes

**P: Como rodar o projeto?**
```bash
docker-compose up -d           # Iniciar PostgreSQL
npm install && npm run install-all  # Instalar deps
npm run dev                    # Frontend + Backend
```
Veja [README.md](../README.md) para mais detalhes.

---

**P: Como adicionar um novo endpoint?**
1. Criar handler em `server/src/routes/`
2. Adicionar JSDoc com `@swagger`
3. Documentar em `server/README.md`
4. Testar com `curl` ou Postman
5. Criar migration SQL se precisa de schema

Veja [server/README.md](../server/README.md) para exemplos.

---

**P: Como criar um novo componente frontend?**
1. Criar arquivo em `src/components/`
2. Exportar interface `Props`
3. Usar shadcn/ui para primitivos
4. Mobile-first: sem prefixo = mobile, `md:` = desktop
5. Documentar se for público

Veja [client/README.md](../client/README.md) para padrões.

---

**P: Como adicionar uma funcionalidade grande?**
1. Criar branch: `git checkout -b feature/nome`
2. Ler [CLAUDE.md](../CLAUDE.md) (convenções obrigatórias)
3. Implementar frontend + backend em paralelo
4. Atualizar documentação correspondente
5. Commitar: `git commit -m "feat: descrição clara"`
6. Abrir PR com descrição

---

**P: TypeScript não compila. O que fazer?**

**Frontend:**
```bash
npm run lint
# Verifica tipos e ESLint
```

**Backend:**
```bash
npm run typecheck
# Verifica tipos sem compilar
```

Se ainda errar, consulte [docs/TYPES-GUIDE.md](./TYPES-GUIDE.md).

---

**P: Como documentar um novo endpoint?**

Use JSDoc com `@swagger` em `server/src/routes/`:

```ts
/**
 * @swagger
 * /api/seu-endpoint:
 *   get:
 *     summary: Descrição curta
 *     tags: [Sua categoria]
 *     parameters:
 *       - name: param
 *         in: query
 *         type: string
 *     responses:
 *       200:
 *         description: Sucesso
 *         schema: { type: object }
 */
router.get('/', (req, res) => { ... });
```

Consulte [server/README.md](../server/README.md) para exemplos.

---

## Documentos por Tema

### 📋 Visão Geral
- [README.md](../README.md) — O projeto, stack, como rodar
- [CLAUDE.md](../CLAUDE.md) — Convenções globais obrigatórias
- [docs/INDEX.md](./INDEX.md) — Índice completo

### 🎨 Frontend
- [client/README.md](../client/README.md) — Estrutura, rotas, patterns
- [client/CLAUDE.md](../client/CLAUDE.md) — Convenções frontend
- [client/DESIGN_SYSTEM.md](../client/DESIGN_SYSTEM.md) — Cores, componentes, CSS

### 🔧 Backend
- [server/README.md](../server/README.md) — API, endpoints, banco de dados
- [server/CLAUDE.md](../server/CLAUDE.md) — Convenções backend

### 🏗️ Arquitetura
- [docs/CODEMAPS.md](./CODEMAPS.md) — Mapa de arquitetura, fluxos
- [docs/TYPES-GUIDE.md](./TYPES-GUIDE.md) — Tipos TypeScript compartilhados
- [docs/ATUALIZACAO-DOCS-2026-04-13.md](./ATUALIZACAO-DOCS-2026-04-13.md) — Resumo de mudanças

---

## Convenções Obrigatórias (Resumo)

### Todas as camadas
- ✅ **Linguagem:** Português Brasileiro (PT-BR)
- ✅ **TypeScript:** Strict mode
- ✅ **Git:** Commits descritivos

### Frontend
- ✅ Mobile-first (sem prefixo = mobile, `md:` = desktop)
- ✅ Componentes reutilizáveis em `src/components/`
- ✅ Testar em 390px, 768px, 1280px
- ✅ shadcn/ui para primitivos
- ✅ Filtros em `useSearchParams` (URLs compartilháveis)

### Backend
- ✅ SQL parametrizado (`$1, $2, ...`)
- ✅ ESM com extensão `.js` nos imports relativos
- ✅ Winston logs em operações críticas
- ✅ Swagger docs em `@swagger` JSDoc
- ✅ Nunca expor stack traces brutos

---

## Quick Links

| Preciso de... | Link |
|---|---|
| Rodar o projeto | [README.md](../README.md#como-rodar) |
| Entender API | [server/README.md](../server/README.md) |
| Estrutura frontend | [client/README.md](../client/README.md) |
| Tipos TypeScript | [docs/TYPES-GUIDE.md](./TYPES-GUIDE.md) |
| Arquitetura | [docs/CODEMAPS.md](./CODEMAPS.md) |
| Convenções | [CLAUDE.md](../CLAUDE.md) |
| Design System | [client/DESIGN_SYSTEM.md](../client/DESIGN_SYSTEM.md) |
| Encontrar tópico | [docs/INDEX.md](./INDEX.md) |

---

## Verificação de Qualidade

Antes de fazer PR:

```bash
# Frontend
cd client
npm run lint          # ESLint + TypeScript
npm run build         # Build de produção

# Backend
cd ../server
npm run typecheck     # Verificar tipos

# Geral
npm run migrate       # Migrações (se necessário)
git diff            # Revisar mudanças
```

---

## Suporte

**Dúvidas sobre:**
- **Arquitetura:** Consulte [docs/CODEMAPS.md](./CODEMAPS.md)
- **Tipos:** Consulte [docs/TYPES-GUIDE.md](./TYPES-GUIDE.md)
- **API:** Consulte [server/README.md](../server/README.md)
- **Frontend:** Consulte [client/README.md](../client/README.md)
- **Geral:** Consulte [docs/INDEX.md](./INDEX.md)

---

## Versão

- **Documentação:** 13 de abril de 2026
- **React:** 19
- **Vite:** 7
- **Node.js:** 24+
- **Express:** 5
- **PostgreSQL:** 17
- **TypeScript:** 5

---

**Pronto para começar?**

1. Clone o repositório
2. Leia [README.md](../README.md)
3. Rode `npm run dev`
4. Comece a contribuir!

Boa sorte! 🚀
