# CLAUDE.md — client/

Instruções específicas para trabalhar na camada **frontend** do ReceipTV.
Consulte também o `CLAUDE.md` na raiz do monorepo para convenções globais.

## Stack

- **React 19** + **Vite 7**
- **React Router 7** para roteamento
- **Tailwind CSS 4** (plugin Vite) + **shadcn/ui** para componentes
- **Recharts** para gráficos
- **Framer Motion** para animações
- **@react-pdf/renderer** para geração de PDF no cliente
- **Axios** com interceptor JWT para requisições HTTP
- **Workbox** (VitePWA) para Service Worker

## Estrutura de diretórios

```
src/
├── api/
│   ├── index.js       # instância Axios com interceptor de refresh (401 → POST /auth/refresh)
│   └── services.js    # funções de chamada à API (auth, receipts, reports)
├── components/
│   ├── ui/            # componentes shadcn/ui — NÃO editar manualmente
│   └── *.jsx          # componentes reutilizáveis da aplicação
├── pages/             # componentes de rota (um por página)
├── hooks/             # hooks customizados
├── utils/             # helpers puros (formatação de moeda, datas, bancos)
└── lib/
    └── utils.js       # cn() = clsx + twMerge
```

## Rotas

| Caminho | Componente | Acesso |
|---------|-----------|--------|
| `/login` | `LoginPage` | público |
| `/` | `DashboardPage` | protegido |
| `/upload` | `UploadPage` | protegido |
| `/history` | `HistoryPage` | protegido |
| `/profile` | `ProfilePage` | protegido |
| `/share-target` | `ShareTargetPage` | protegido (PWA Share Target) |

Rotas protegidas usam `<ProtectedRoute>` que chama `GET /api/auth/me`.

## Autenticação

- Tokens em cookies **httpOnly** (`accessToken` 15 min, `refreshToken` 30 dias)
- O interceptor em `src/api/index.js` captura respostas 401 e chama `POST /api/auth/refresh` automaticamente
- `useSessionSync` (hook) usa `BroadcastChannel` + `storage` event para propagar logout entre abas

## Convenções de UI

### Responsividade (obrigatório)
- Mobile-first: sem prefixo = mobile, `md:` = desktop
- Layout: `Sidebar` fixo no desktop (`md:sticky md:top-0 md:h-screen`), `BottomNav` no mobile
- Qualquer componente novo deve ser testado mentalmente em telas ≤ 375px e ≥ 1280px

### Paleta de cores
- Background: `bg-zinc-900` (#18181b) / cards: `bg-zinc-800` (#27272a)
- Acento primário: `text-green-500` / `bg-green-500/30` / `border-green-500/30`
- Texto: white → `text-zinc-300` → `text-zinc-400` → `text-zinc-500`
- Perigo: `text-red-400` / `bg-red-500/10`

### Bordas e raios
- Inputs/botões: `rounded-xl` | Cards: `rounded-2xl` | Upload area: `rounded-3xl` | Badges: `rounded-full`

### Scrollbar
Definida globalmente em `src/index.css`. **Não sobrescrever** por componente.
Track = `zinc-900`, thumb = `zinc-700`, hover = `zinc-600`.

### Animação collapse
Use `grid-template-rows: 0fr → 1fr` com `overflow-hidden` no filho.
Não usar `max-height` hack nem bibliotecas externas para esse padrão.

### Componentes shadcn/ui
Preferir shadcn para botões, inputs, cards, modais, selects. Não recriar primitivos que já existam em `src/components/ui/`.

### PasswordInput
Sempre usar `PasswordInput` de `src/components/ui/input.jsx` em campos de senha.
Não reimplementar lógica de show/hide com estado manual.

### Formulários com senha
Usar layout empilhado (`space-y-4`, label acima do input) — não grids de colunas fixas.

## Persistência de filtros (HistoryPage)

O estado de filtros em `HistoryPage` usa `useSearchParams` como fonte de verdade.
Sempre sincronizar `setSearchParams` junto com atualizações de estado local para manter URLs compartilháveis e navegação back/forward.

## Alias de caminho

`@` → `src/` (configurado em `jsconfig.json` e `vite.config.js`)

## PWA

- Service Worker gerado pelo `vite-plugin-pwa` (Workbox) — **não editar `sw.js` manualmente**
- Web Share Target registrado em `/share-target`: arquivos chegam via IndexedDB (`src/utils/shareIdb.js`)
- Manifesto PWA configurado em `vite.config.js`

## Comandos

```bash
npm run dev      # servidor Vite (http://localhost:5173)
npm run build    # build de produção → dist/
npm run preview  # preview do build
npm run lint     # ESLint
```
