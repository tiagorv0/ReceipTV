# client/ — ReceipTV Frontend

## Visão Geral

SPA React que compõe a interface do ReceipTV — sistema de gerenciamento de comprovantes com extração automática por IA. O frontend consome a API REST do backend em Express e exibe dashboards, formulários de upload, histórico com filtros avançados e perfil do usuário.

**Stack:** React 19 + Vite 7 + Tailwind CSS 4 + shadcn/ui + Recharts + Framer Motion + PWA (Workbox)

---

## Estrutura de Diretórios

```
src/
├── api/
│   ├── index.js              # Instância Axios com interceptor JWT (401 → POST /auth/refresh)
│   └── services.js           # Funções de chamada à API (auth, receipts, reports, export)
├── components/
│   ├── ui/                   # Componentes shadcn/ui (button, input, card, select, popover, calendar, etc.)
│   ├── Badge.jsx             # Badge de tipo de pagamento (verde) e status (zinc)
│   ├── BankTag.jsx           # Tag de banco com cor dinâmica
│   ├── BottomNav.jsx         # Navegação mobile (barra inferior)
│   ├── Card.jsx              # Container genérico
│   ├── ChartCard.jsx         # Card com header para gráficos
│   ├── ChartCard2.jsx        # Variante de ChartCard
│   ├── ConfirmModal.jsx      # Modal de confirmação (suporta variant='danger')
│   ├── EditReceiptModal.jsx  # Modal de edição de comprovante
│   ├── EmptyState.jsx        # Estado vazio com ícone, título e ação
│   ├── Error.jsx             # Mensagem de erro (vermelho)
│   ├── FilePreview.jsx       # Preview de arquivo (PDF/imagem)
│   ├── KpiCard.jsx           # Card de KPI para dashboard
│   ├── Layout.jsx            # Layout raiz (Sidebar + BottomNav + Outlet + glow)
│   ├── LoadingState.jsx      # Spinner ou pulse dot verde
│   ├── ManualUploadForm.jsx  # Formulário de entrada manual
│   ├── NavItem.jsx           # Item de navegação com animação
│   ├── PageHeader.jsx        # Header de página (título, subtítulo, ações)
│   ├── ProtectedRoute.jsx    # Wrapper de rota protegida (chama GET /auth/me)
│   ├── PWAPrompts.jsx        # Prompt de instalação PWA
│   ├── ReceiptFormFields.jsx # Campos de formulário de comprovante
│   ├── ReceiptTable.jsx      # Tabela de comprovantes
│   ├── SessionExpiryWarning.jsx # Aviso de expiração de sessão
│   ├── Sidebar.jsx           # Navegação desktop (256px, sticky)
│   ├── SimpleBarChart.jsx    # Gráfico de barras simples
│   ├── StatCard.jsx          # Card de estatística
│   └── Success.jsx           # Mensagem de sucesso (verde)
├── hooks/
│   └── useSessionSync.js     # Hook para sync de logout entre abas (BroadcastChannel + storage event)
├── pages/
│   ├── DashboardPage.jsx     # KPIs + gráficos (gastos por banco, tipo, mensal)
│   ├── HistoryPage.jsx       # Lista de comprovantes com filtros, sorting, paginação
│   ├── LoginPage.jsx         # Login e cadastro
│   ├── ProfilePage.jsx       # Perfil, troca de senha, exclusão de conta
│   ├── ShareTargetPage.jsx   # PWA Share Target — processa arquivos compartilhados
│   └── UploadPage.jsx        # Upload de arquivo com análise IA + entrada manual
├── utils/
│   ├── banks.js              # Mapeamento de bancos e cores
│   ├── currency-utils.js     # Formatação de moeda (BRL)
│   ├── date-utils.js         # Helpers de data
│   ├── DashboardPDFDocument.jsx  # Documento PDF com @react-pdf/renderer
│   └── shareIdb.js           # IndexedDB para Web Share Target
├── lib/
│   └── utils.js              # fn `cn()` = clsx + twMerge
├── sw.js                     # Service Worker (gerado pelo vite-plugin-pwa — NÃO editar manualmente)
├── App.jsx                   # Rotas (React Router 7)
├── main.jsx                  # Entry point
└── index.css                 # Tailwind + scrollbar global + animações CSS
```

---

## Rotas

| Caminho | Componente | Acesso |
|---------|-----------|--------|
| `/login` | `LoginPage` | Público |
| `/` | `DashboardPage` | Protegido |
| `/upload` | `UploadPage` | Protegido |
| `/history` | `HistoryPage` | Protegido |
| `/profile` | `ProfilePage` | Protegido |
| `/share-target` | `ShareTargetPage` | Protegido (PWA Share Target) |

Rotas protegidas usam `<ProtectedRoute>` que chama `GET /api/auth/me`.

---

## Autenticação

- Tokens em **cookies httpOnly** (`accessToken` 15 min, `refreshToken` 30 dias ou 1h)
- Interceptor em `src/api/index.js` captura 401 e chama `POST /api/auth/refresh` automaticamente
- Fila de subscribers para requisições concorrentes durante refresh
- `useSessionSync` usa `BroadcastChannel` + evento `storage` para propagar logout entre abas
- `ProtectedRoute` salva pathname em `sessionStorage` para redirect pós-login

---

## Comandos

```bash
npm run dev       # Servidor Vite (http://localhost:5173)
npm run build     # Build de produção → dist/
npm run preview   # Preview do build de produção
npm run lint      # ESLint
```

---

## Configurações

### Alias de caminho

`@` → `src/` (configurado em `jsconfig.json` e `vite.config.js`)

### ESLint

```js
// eslint.config.js
- no-unused-vars (permitido para vars começando com A-Z ou _)
- react-hooks/exhaustive-deps: warn
- react-refresh/only-export-components
```

### PWA

- Plugin: `vite-plugin-pwa` com estratégia `injectManifest`
- Manifesto configurado em `vite.config.js`
- Web Share Target: arquivos compartilhados via POST `/share-target` → salvos em IndexedDB (`shareIdb.js`)
- **Não editar `sw.js` manualmente** — é gerado automaticamente pelo plugin

---

## Design System

### Paleta de Cores

| Uso | Classe Tailwind | Hex |
|-----|-----------------|-----|
| Fundo principal | `bg-zinc-900` | #18181b |
| Card/Container | `bg-zinc-800` | #27272a |
| Input background | `bg-zinc-700/60` | #3f3f46 |
| Borda sutil | `border-zinc-700` | #3f3f46 |
| Separador | `border-zinc-600` | #52525b |
| Verde destaque | `text-green-500` / `bg-green-500/30` | #22c55e |
| Perigo | `text-red-400` / `bg-red-500/10` | #ef4444 |
| Texto primário | `text-white` | #fff |
| Texto secundário | `text-zinc-300` | #d4d4d8 |
| Texto terciário | `text-zinc-500` | #71717a |

### Border Radius

| Componente | Classe |
|------------|--------|
| Input/Select | `rounded-xl` (12px) |
| Botão | `rounded-xl` (12px) |
| Badge/Tag | `rounded-full` |
| Card KPI | `rounded-2xl` (16px) |
| Card Auth/Modal | `rounded-2xl` |
| Upload area | `rounded-3xl` (24px) |
| Tabela | `var(--radius-xl)` (14px) |

### Responsividade (obrigatório)

- **Mobile-first:** sem prefixo = mobile, `md:` (768px) = desktop
- Layout: `Sidebar` fixo no desktop (`md:sticky md:top-0 md:h-screen`), `BottomNav` no mobile
- Todo componente novo deve funcionar em telas ≤ 375px e ≥ 1280px

### Scrollbar

Definida globalmente em `src/index.css`. **Não sobrescrever por componente.**
Track = `zinc-900`, thumb = `zinc-700`, hover = `zinc-600`.

### Animação Collapse

Usar `grid-template-rows: 0fr → 1fr` com `overflow-hidden` no filho interno.
Não usar hack de `max-height` nem bibliotecas externas para esse padrão.

### shadcn/ui

Preferir componentes de `src/components/ui/` para botões, inputs, cards, modais, selects.
Não recriar primitivos que já existam.

### PasswordInput

Usar `PasswordInput` de `src/components/ui/input.jsx` para todos os campos de senha.
Não reimplementar lógica show/hide manualmente.

### Formulários com senha

Usar layout empilhado (`space-y-4`, label acima do input) — não grids de colunas fixas.

---

## Persistência de Filtros (HistoryPage)

O estado de filtros em `HistoryPage` usa `useSearchParams` como fonte de verdade.
Sempre sincronizar `setSearchParams` junto com atualizações de estado local para manter URLs compartilháveis e navegação back/forward.

---

## API Services

Funções disponíveis em `src/api/services.js`:

| Função | Método | Endpoint |
|--------|--------|----------|
| `login(credentials)` | POST | `/auth/login` |
| `register(userData)` | POST | `/auth/register` |
| `getReceipts(startDate, endDate)` | GET | `/receipts` |
| `analyzeReceipt(formData)` | POST | `/receipts/analyze` |
| `deleteReceipt(id)` | DELETE | `/receipts/:id` |
| `getReceiptFile(id)` | GET | `/receipts/:id/file` |
| `getSummary()` | GET | `/reports/summary` |
| `getProfile()` | GET | `/auth/profile` |
| `updatePassword(data)` | PUT | `/auth/password` |
| `deleteAccount(data)` | DELETE | `/auth/account` |
| `createManualReceipt(formData)` | POST | `/receipts/manual` |
| `updateReceipt(id, formData)` | PUT | `/receipts/:id` |
| `exportReceipts(params)` | POST | `/receipts/export` |

---

## Dependências Principais

### Produção
- `react` / `react-dom` ^19
- `react-router-dom` ^7
- `axios` ^1
- `tailwindcss` ^4 + `@tailwindcss/vite`
- `shadcn` + `@base-ui/react`
- `recharts` ^2 (gráficos)
- `framer-motion` ^12 (animações)
- `@react-pdf/renderer` ^4 (geração de PDF no cliente)
- `date-fns` ^4 (formatação de datas)
- `lucide-react` (ícones)
- `@hugeicons/react` (ícones shadcn)

### Desenvolvimento
- `vite` ^7
- `eslint` ^9 + plugins React
- `vite-plugin-pwa` ^1 (Workbox)
