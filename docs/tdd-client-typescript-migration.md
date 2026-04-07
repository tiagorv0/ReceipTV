# TDD — Migração do Client de JavaScript para TypeScript

| Campo            | Valor                              |
| ---------------- | ---------------------------------- |
| Tech Lead        | @Tiago Vazzoller                   |
| Status           | Draft                              |
| Criado em        | 2026-04-06                         |
| Última atualização | 2026-04-06                       |

---

## 1. Contexto

O ReceipTV é um gerenciador de comprovantes financeiros com extração via IA. O frontend é uma SPA React 19 + Vite 7 que atualmente usa **JavaScript puro** (54 arquivos `.js`/`.jsx`). O backend já foi migrado para TypeScript na branch `feat/change-backend-to-typescript`, com interfaces de domínio bem definidas (`User`, `Receipt`, `ReceiptFilters`, `AnalysisResult`, etc.).

A ausência de tipagem estática no frontend resulta em erros que só são detectados em runtime — props erradas em componentes, respostas de API consumidas com campos incorretos, e refatorações frágeis que exigem busca manual por usos. Com o backend já tipado, existe uma oportunidade natural de compartilhar contratos de tipo entre as camadas.

---

## 2. Definição do Problema

### Problemas que estamos resolvendo

- **Erros em runtime por falta de tipagem**: Props incorretas, retornos de API consumidos com campos errados e estados `undefined` inesperados só são detectados no navegador. Não há feedback no editor durante o desenvolvimento.
- **Refatorações frágeis**: Renomear um campo ou alterar a assinatura de uma função exige busca textual manual. Sem tipagem, o compilador não identifica usos quebrados.
- **Contratos de API desalinhados**: As interfaces de domínio (`Receipt`, `User`, `ReceiptFilters`) já existem no backend, mas o frontend consome esses dados com `any` implícito. Mudanças no backend podem quebrar o frontend silenciosamente.
- **Experiência de desenvolvimento inferior**: Sem IntelliSense tipado, o desenvolvedor precisa consultar o código-fonte ou o Swagger para lembrar a forma dos objetos.

### Por que agora?

- O backend acabou de ser migrado para TypeScript — o momento ideal para alinhar as duas camadas.
- O projeto ainda é relativamente pequeno (54 arquivos) — o custo de migração cresce com o tempo.
- Não há testes automatizados no frontend; a tipagem estática compensa parcialmente essa lacuna de segurança.

### Impacto de NÃO resolver

- Acúmulo de dívida técnica: quanto mais código JS for adicionado, mais custosa será a migração futura.
- Bugs silenciosos continuarão escapando para produção.
- A discrepância de DX entre backend (tipado) e frontend (não tipado) reduz a produtividade.

---

## 3. Escopo

### ✅ No Escopo (V1)

- Renomear todos os 54 arquivos `.js`/`.jsx` do `src/` para `.ts`/`.tsx` (incluindo `sw.js` → `sw.ts`)
- Criar `tsconfig.json` e `tsconfig.node.json` com configuração estrita
- Renomear `vite.config.js` → `vite.config.ts`
- Atualizar `eslint.config.js` para suportar `.ts`/`.tsx`
- Remover `jsconfig.json` (substituído pelo `tsconfig.json`)
- Instalar dependências TypeScript (`typescript`, `@typescript-eslint/*`)
- Criar tipos de domínio compartilhados em `src/types/` (espelhando `server/src/types/`)
- Tipar todas as respostas de API em `src/api/services.ts`
- Tipar a instância Axios e interceptors em `src/api/index.ts`
- Tipar props de todos os componentes React (interfaces ou type aliases)
- Tipar hooks customizados
- Tipar funções utilitárias
- Garantir que `npm run build` e `npm run lint` passem sem erros
- Atualizar `client/CLAUDE.md` para refletir a nova stack

### ❌ Fora do Escopo (V1)

- Adicionar testes automatizados (será feito em fase posterior)
- Refatorar lógica de negócio ou UI durante a migração
- Criar um pacote compartilhado (`shared/`) entre client e server (os tipos serão copiados/espelhados por enquanto)
- Alterar comportamento funcional de qualquer componente
- Migrar `eslint.config.js` para `.ts` (manter como `.js` ou `.mjs`)

### 🔮 Considerações Futuras (V2+)

- Pacote `shared/types` no monorepo para compartilhar interfaces entre client e server
- Strict mode completo (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`)
- Geração automática de tipos a partir do Swagger/OpenAPI do backend

---

## 4. Solução Técnica

### 4.1. Dependências a Instalar

**devDependencies:**

| Pacote | Propósito |
|--------|-----------|
| `typescript` (~5.8) | Compilador TypeScript |
| `@typescript-eslint/parser` | Parser ESLint para TS |
| `@typescript-eslint/eslint-plugin` | Regras ESLint específicas para TS |

> `@types/react` e `@types/react-dom` já estão instalados. As demais dependências (axios, recharts, framer-motion, lucide-react, date-fns, react-router-dom, etc.) já incluem tipos embutidos.

### 4.2. Configuração do TypeScript

**`tsconfig.json`** (projeto principal — código em `src/`):

- `target`: `ES2022`
- `lib`: `["ES2023", "DOM", "DOM.Iterable"]`
- `module`: `ESNext`
- `moduleResolution`: `bundler`
- `jsx`: `react-jsx`
- `strict`: `true`
- `noEmit`: `true` (Vite faz o bundling, TS só faz type-check)
- `skipLibCheck`: `true`
- `paths`: `{ "@/*": ["./src/*"] }` (substituindo `jsconfig.json`)
- `include`: `["src"]`
- `exclude`: nenhum (todos os arquivos em `src/` incluídos)

**`tsconfig.node.json`** (arquivos de config — Vite, ESLint):

- `include`: `["vite.config.ts", "eslint.config.*"]`
- `module`: `ESNext`
- `moduleResolution`: `bundler`

### 4.3. Configuração do ESLint

Atualizar `eslint.config.js`:

- Adicionar `**/*.{ts,tsx}` ao campo `files`
- Incluir `@typescript-eslint/parser` como parser
- Adicionar regras recomendadas do `@typescript-eslint/eslint-plugin`
- Substituir `no-unused-vars` por `@typescript-eslint/no-unused-vars`

### 4.4. Estrutura de Tipos (`src/types/`)

Criar um diretório `src/types/` com interfaces que espelham o backend:

| Arquivo | Conteúdo |
|---------|----------|
| `receipt.ts` | `Receipt` (versão frontend, sem `Buffer`), `ReceiptFilters`, `AnalysisResult` |
| `user.ts` | `UserPublic` (id, username, email) |
| `auth.ts` | `LoginRequest`, `RegisterRequest`, `LoginResponse` |
| `api.ts` | Tipos genéricos de resposta da API (`ApiResponse<T>`, `PaginatedResponse<T>`) |
| `index.ts` | Barrel re-exports |

**Diferenças em relação ao backend:**

- `Receipt` no frontend não terá `arquivo_data: Buffer` (o frontend nunca recebe o binário diretamente; usa URL de download)
- Adicionar tipos de resposta que o backend retorna mas não tem interface (ex: `SummaryResponse` para o dashboard)

### 4.5. Tipagem da Camada de API

**`src/api/index.ts`:**

- Tipar a instância `AxiosInstance`
- Tipar o interceptor de refresh (queue de requests pendentes)
- Exportar tipo `Api` se necessário

**`src/api/services.ts`:**

- Cada função retorna `Promise<T>` com o tipo correto de resposta
- Exemplo: `getReceipts(filters: ReceiptFilters): Promise<Receipt[]>`
- Exemplo: `getSummary(params): Promise<SummaryResponse>`
- Exemplo: `login(data: LoginRequest): Promise<void>` (resposta vai pro cookie)

### 4.6. Tipagem de Componentes React

**Padrão para componentes:**

- Definir interface `XxxProps` antes do componente
- Componentes com `forwardRef` (shadcn/ui) usam `React.ComponentRef<>` e `React.ComponentPropsWithoutRef<>`
- Event handlers tipados com os tipos nativos do React (`React.ChangeEvent<HTMLInputElement>`, etc.)

**Componentes shadcn/ui:**

- Os 13 componentes em `src/components/ui/` já seguem padrão shadcn que tem variantes TypeScript oficiais. Converter usando os templates `.tsx` do shadcn como referência.

### 4.7. Tipagem de Hooks

**`useSessionSync`:**

- Parâmetros: `void`
- Retorno: `void` (efeito colateral — listeners do BroadcastChannel)

### 4.8. Tipagem de Utilitários

| Arquivo | Tipagem principal |
|---------|------------------|
| `banks.ts` | `Record<string, { name: string; color: string }>`, funções `detectBank(text: string): string \| null` |
| `currency-utils.ts` | `formatCurrency(value: number): string` |
| `date-utils.ts` | `formatDate(date: string \| Date): string` |
| `shareIdb.ts` | Interfaces para operações IndexedDB (`ShareFile`, funções async) |
| `lib/utils.ts` | `cn(...inputs: ClassValue[]): string` (já é o padrão shadcn) |

### 4.9. `vite.config.ts`

Renomear de `.js` para `.ts`. Vite suporta nativamente `vite.config.ts`. A tipagem vem de `import { defineConfig } from 'vite'` que já está presente.

---

## 5. Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Erros de tipo em massa ao ativar `strict: true` | Médio | Alta | Migrar em fases: começar com tipos mais simples (utils, types, api) antes dos componentes complexos. Usar `// @ts-expect-error` temporariamente se necessário, mas NÃO `any` generalizado |
| Quebra do hook de ESLint `--fix` após mudança de extensão | Médio | Média | Atualizar o padrão glob do hook para incluir `*.{ts,tsx}` antes de renomear os arquivos |
| Incompatibilidade de tipos com bibliotecas terceiras | Baixo | Baixa | Todas as dependências principais já têm tipos embutidos ou `@types/*`. Verificar `@react-pdf/renderer` e `vite-plugin-pwa` que podem precisar de `declare module` |
| Regressão funcional durante renomeação | Alto | Baixa | Não alterar lógica — apenas renomear extensões e adicionar tipos. Testar manualmente fluxos críticos (login, upload, dashboard, histórico) após cada fase |
| Path alias `@` quebra após remoção do `jsconfig.json` | Alto | Baixa | Garantir que `tsconfig.json` tenha `paths` configurado antes de remover `jsconfig.json`. Vite lê o alias do `vite.config.ts`, não do tsconfig |
| Service Worker quebra durante build | Médio | Média | Após renomear `sw.js` → `sw.ts`, atualizar `filename: 'sw.ts'` no `vite.config.ts`. Testar build e registro do SW. Adicionar `/// <reference lib="webworker" />` no topo para tipos do ServiceWorker global |

---

## 6. Estratégia de Testes

Como o projeto não possui testes automatizados no frontend, a validação será feita por:

| Tipo | Escopo | Abordagem |
|------|--------|-----------|
| **Type-check** | Todos os arquivos `.ts`/`.tsx` | `npx tsc --noEmit` — deve passar sem erros |
| **Lint** | Todos os arquivos `.ts`/`.tsx` | `npm run lint` — deve passar sem erros |
| **Build** | Aplicação completa | `npm run build` — deve gerar `dist/` sem erros |
| **Teste manual** | Fluxos críticos | Login → Dashboard → Upload → Histórico → Perfil. Testar em desktop e mobile |
| **Verificação de PWA** | Service Worker + Share Target | Confirmar que o SW registra corretamente e o share target funciona |

**Critério de aceite:** `tsc --noEmit && npm run lint && npm run build` passam sem erros, e todos os fluxos manuais funcionam sem regressão.

---

## 7. Plano de Implementação

A migração será feita em **6 fases incrementais**, cada uma resultando em um estado compilável.

| Fase | Tarefas | Estimativa |
|------|---------|------------|
| **Fase 0 — Setup** | Instalar `typescript`, `@typescript-eslint/*`. Criar `tsconfig.json` e `tsconfig.node.json`. Renomear `vite.config.js` → `.ts`. Atualizar `eslint.config.js`. Remover `jsconfig.json`. Atualizar glob do hook de ESLint. | ~1h |
| **Fase 1 — Tipos e Utilitários** | Criar `src/types/` (receipt, user, auth, api, index). Converter `src/lib/utils.js` → `.ts`. Converter `src/utils/*.js` → `.ts`. | ~1-2h |
| **Fase 2 — Camada de API** | Converter `src/api/index.js` → `.ts` (Axios instance + interceptors). Converter `src/api/services.js` → `.ts` (tipar todos os retornos). | ~1-2h |
| **Fase 3 — Hooks, Infra e Service Worker** | Converter `src/hooks/useSessionSync.js` → `.ts`. Converter `src/components/ProtectedRoute.jsx` → `.tsx`. Converter `src/components/SessionExpiryWarning.jsx` → `.tsx`. Converter `src/sw.js` → `src/sw.ts` (tipar IndexedDB helpers, Share Target handler, `self.__WB_MANIFEST`). Atualizar `filename` no `vite.config.ts` para `sw.ts`. | ~1h |
| **Fase 4 — Componentes UI** | Converter os 13 componentes shadcn/ui (`.jsx` → `.tsx`). Converter componentes reutilizáveis (Card, Badge, BankTag, NavItem, StatCard, etc.). Converter componentes de estado (Error, Success, LoadingState, EmptyState). Converter componentes de chart (ChartCard, ChartCard2, KpiCard, SimpleBarChart). Converter componentes de form (ReceiptTable, ReceiptFormFields, ManualUploadForm, EditReceiptModal, ConfirmModal, FilePreview). Converter Layout, Sidebar, BottomNav, PageHeader, PWAPrompts. | ~3-4h |
| **Fase 5 — Pages e Entry Points** | Converter todas as 6 pages (Login, Dashboard, Upload, History, Profile, ShareTarget). Converter `App.jsx` → `.tsx` e `main.jsx` → `.tsx`. | ~2-3h |

**Validação entre fases:** Após cada fase, executar `npx tsc --noEmit` para garantir que o projeto compila. Fazer commit ao final de cada fase.

**Estimativa total:** ~8-12 horas de trabalho.

### Ordem de dependência

```
Fase 0 (setup)
  └─→ Fase 1 (types + utils)
        └─→ Fase 2 (api layer)
              └─→ Fase 3 (hooks + infra)
                    └─→ Fase 4 (components)
                          └─→ Fase 5 (pages + entry points)
```

A ordem garante que cada fase já pode importar os tipos definidos nas fases anteriores, eliminando a necessidade de `any` temporários.

---

## 8. Plano de Rollback

**Estratégia:** A migração ocorre em uma branch (`feat/change-client-to-typescript`). Se a migração apresentar problemas:

1. **Antes do merge:** Simplesmente não fazer merge — o `master` continua com JS funcional
2. **Após o merge:** `git revert` do merge commit restaura o estado anterior imediatamente
3. **Parcial:** Como cada fase gera um commit, é possível fazer rollback parcial até uma fase específica

**Trigger de rollback:**

- Build de produção falha
- Regressão funcional detectada em fluxo crítico
- Erros de runtime que não existiam na versão JS

---

## 9. Questões em Aberto

| # | Questão | Status |
|---|---------|--------|
| 1 | Criar pacote `shared/types` no monorepo ou manter tipos copiados entre client e server? | 🔴 Decidido: copiar por agora (fora do escopo V1) |
| 2 | Usar `strict: true` desde o início ou começar com `strict: false` e apertar incrementalmente? | 🟢 Decidido: `strict: true` desde o início — o projeto é pequeno o suficiente |
| 3 | Manter componentes shadcn/ui como `.tsx` editável ou instalar via CLI do shadcn (que já gera TS)? | 🔴 Aberto — avaliar se o CLI do shadcn regenera sem perda de customizações |

---

## 10. Referências

| Recurso | Link |
|---------|------|
| Vite + TypeScript | https://vite.dev/guide/features.html#typescript |
| React TypeScript Cheatsheet | https://react-typescript-cheatsheet.netlify.app/ |
| shadcn/ui (TS por padrão) | https://ui.shadcn.com/docs/installation/vite |
| typescript-eslint | https://typescript-eslint.io/getting-started |
| Tipos do backend (referência) | `server/src/types/` |
