# ReceipTV — Frontend

Frontend do ReceipTV: React 19 + Vite 7 + TypeScript 5 SPA.

**Última atualização:** 13 de abril de 2026

## Stack

- **React 19** com Vite 7 (ESM)
- **TypeScript 5** em strict mode
- **React Router 7** para navegação
- **Tailwind CSS 4** com plugin Vite
- **shadcn/ui** para componentes primitivos
- **Recharts** para gráficos
- **Framer Motion** para animações
- **@react-pdf/renderer** para PDF
- **Axios** com interceptor JWT
- **PWA** via vite-plugin-pwa + Workbox

## Estrutura

```
src/
├── api/
│   ├── index.ts          # Axios com interceptor de refresh (401 → GET /auth/refresh)
│   └── services.ts       # Funções tipadas para auth, receipts, reports
├── types/
│   ├── index.ts          # Barrel exports
│   ├── api.ts            # ApiResponse<T>, ErrorResponse
│   ├── auth.ts           # LoginForm, RegisterForm
│   ├── receipt.ts        # Receipt, ReceiptFilters, AnalysisResult
│   └── user.ts           # User, UserPublic
├── components/
│   ├── ui/               # shadcn/ui (não editar manualmente)
│   ├── Layout.tsx        # Sidebar + BottomNav (responsivo)
│   ├── Sidebar.tsx       # Navegação desktop (sticky)
│   ├── BottomNav.tsx     # Navegação mobile
│   ├── ProtectedRoute.tsx     # Wrapper de rotas autenticadas
│   ├── DashboardCard.tsx      # Componentes de dashboard
│   ├── ChartCard2.tsx         # Cards com gráficos
│   ├── SimpleBarChart.tsx     # Gráfico de barras reutilizável
│   ├── KpiCard.tsx            # Indicador de desempenho
│   ├── EditReceiptModal.tsx   # Modal de edição
│   ├── ConfirmModal.tsx       # Modal de confirmação
│   ├── ReceiptFormFields.tsx  # Campos de formulário
│   ├── ManualUploadForm.tsx   # Formulário de entrada manual
│   ├── FilePreview.tsx        # Preview de arquivo
│   ├── BankTag.tsx            # Badge de banco
│   ├── PWAPrompts.tsx         # Prompts de instalação
│   ├── SessionExpiryWarning.tsx   # Alerta de sessão
│   └── ... outros componentes
├── pages/
│   ├── DashboardPage.tsx  # Dashboard com KPIs e gráficos
│   ├── UploadPage.tsx     # Upload com IA ou manual
│   ├── HistoryPage.tsx    # Histórico com filtros avançados
│   ├── ReportsPage.tsx    # Relatórios detalhados
│   ├── ProfilePage.tsx    # Perfil, senha, delete account
│   ├── LoginPage.tsx      # Login/Cadastro
│   └── ShareTargetPage.tsx     # Handler PWA Share Target
├── hooks/
│   ├── useSessionSync.ts  # Sincronização de logout entre abas
│   └── ... outros hooks
├── utils/
│   ├── currency.ts        # Formatação de moeda (BRL)
│   ├── dateFormat.ts      # Formatação de datas
│   ├── banks.ts           # Lista de bancos
│   ├── shareIdb.ts        # IndexedDB para PWA Share Target
│   └── ... outros helpers
├── lib/
│   └── utils.ts           # cn() = clsx + tailwind-merge
├── assets/                # Imagens, ícones
├── App.tsx                # Roteamento principal
├── main.tsx               # Entry point
├── index.css              # Estilos globais (scrollbar customizado)
├── sw.ts                  # Service Worker do PWA
└── vite-env.d.ts          # Tipos Vite
```

## Rotas

| Rota | Componente | Acesso | Descrição |
|------|-----------|--------|-----------|
| `/login` | `LoginPage` | Público | Login e cadastro |
| `/` | `DashboardPage` | Protegido | Dashboard com KPIs |
| `/upload` | `UploadPage` | Protegido | Upload IA ou manual |
| `/history` | `HistoryPage` | Protegido | Histórico com filtros |
| `/reports` | `ReportsPage` | Protegido | Relatórios |
| `/profile` | `ProfilePage` | Protegido | Perfil do usuário |
| `/share-target` | `ShareTargetPage` | Protegido | PWA Share Target |

## Autenticação

### Fluxo
1. **Login:** `POST /api/auth/login` retorna access + refresh tokens
2. **Armazenamento:** Tokens em cookies `httpOnly` (set pelo backend)
3. **Requisições:** Axios injeta `Authorization: Bearer <token>` automaticamente
4. **Expiração:** Se 401, interceptor chama `POST /api/auth/refresh`
5. **Logout:** Limpa cookies + revoga refresh token

### Sessão entre abas
Hook `useSessionSync` usa `BroadcastChannel` para propagar logout entre abas abertas simultaneamente.

## Responsividade (Obrigatória)

**Regra:** Mobile-first
- Sem prefixo = mobile (≤ 767px)
- `md:` = desktop (≥ 768px)

**Componentes principais:**
- `Sidebar` — Navegação desktop, sticky, altura da tela
- `BottomNav` — Navegação mobile, fixa no rodapé
- Layout dinâmico conforme tela

**Sempre testar:**
- iPhone 12 (390px)
- iPad (768px+)
- Desktop (1280px+)

## Desenvolvimento

### Instalar e rodar

```bash
# De client/
npm install
npm run dev
```

URL: `http://localhost:5173`

### Build

```bash
npm run build  # dist/
npm run preview  # servir dist/
```

### Type-check

```bash
npm run lint
```

### Variáveis de ambiente

Criar `.env`:
```
VITE_API_URL=http://localhost:5000/api
```

## Componentes shadcn/ui

Componentes primitivos da UI estão em `src/components/ui/`. **Não editar manualmente.**

Usar em:
- `<Button>` para botões
- `<Input>` para campos de texto
- `<PasswordInput>` para campos de senha (show/hide integrado)
- `<Select>` para selects
- `<Card>` para cards
- `<Dialog>` para modais
- `<Popover>` para popovers
- Etc.

## Estilos

**Tailwind CSS 4** com plugin Vite. Breakpoint:
```css
/* Mobile-first */
.elemento { /* estilos mobile */ }

/* Desktop */
@media (min-width: 768px) {
  .elemento { /* estilos md */ }
}
```

Ou com classes Tailwind:
```tsx
<div className="flex flex-col md:flex-row">
  Mobile: coluna | Desktop: linha
</div>
```

### Cores

- **Background:** `bg-zinc-900` (escuro) / `bg-zinc-800` (cards)
- **Acento:** `text-green-500` / `bg-green-500/30`
- **Texto:** white > `text-zinc-300` > `text-zinc-400` > `text-zinc-500` (degradação)
- **Perigo:** `text-red-400` / `bg-red-500/10`
- **Raios:** `rounded-xl` (botões) / `rounded-2xl` (cards) / `rounded-3xl` (upload)

### Scrollbar Global

Definido em `src/index.css`. Não sobrescrever por componente.
- Track: `zinc-900`
- Thumb: `zinc-700`
- Hover: `zinc-600`

## Gráficos (Recharts)

Exemplos em `src/components/SimpleBarChart.tsx` e `DashboardPage.tsx`.

```tsx
<BarChart data={data} width={300} height={300}>
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Bar dataKey="value" fill="#22c55e" />
</BarChart>
```

## Animações (Framer Motion)

Exemplo de collapse smooth:
```tsx
<motion.div
  initial={{ height: 0, opacity: 0 }}
  animate={{ height: 'auto', opacity: 1 }}
  exit={{ height: 0, opacity: 0 }}
>
  Conteúdo
</motion.div>
```

Ou usar CSS `grid-template-rows: 0fr → 1fr` com `overflow-hidden`.

## Paginação Infinita (HistoryPage)

Usar `Intersection Observer` para carregar mais registros conforme o usuário scrolla até o fim.

```tsx
const observerTarget = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!observerTarget.current) return;
  
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        // Carregar mais
      }
    },
    { threshold: 0.1 }
  );
  
  observer.observe(observerTarget.current);
  return () => observer.disconnect();
}, []);

return <div ref={observerTarget} />;
```

## Filtros (HistoryPage)

Estado de filtros persiste na URL via `useSearchParams`:

```tsx
const [searchParams, setSearchParams] = useSearchParams();

// Ler
const dataDe = searchParams.get('dataDe');

// Escrever
setSearchParams({
  dataDe: '2026-04-01',
  dataAte: '2026-04-30',
  banco: 'Nubank',
  tipo: 'PIX'
});
```

Benefícios:
- URLs compartilháveis: `history?dataDe=...&dataAte=...`
- Navegação back/forward funciona
- Filtros persistem em refresh

## PWA

### Service Worker

`src/sw.ts` é o entry point customizado. Gerado pelo `vite-plugin-pwa`.

### Instalação

Prompt automático em `PWAPrompts.tsx`.

### Web Share Target

Registrado no manifesto PWA. Arquivos chegam via IndexedDB em `src/utils/shareIdb.ts`:

```ts
// Ler arquivos do Share Target
const files = await getSharedFiles();
files.forEach(file => {
  // processar
});

// Limpar
await clearSharedFiles();
```

## Conventions

**Imports:**
- Relativos com prefixo: `import Component from '../Component'`
- Alias: `import { Receipt } from '@/types'`

**Tipagem:**
- Sempre `export interface XxxProps` antes do componente
- Props sempre estruturadas (não rest `...props`)

**Nomes de arquivo:**
- Componentes: `PascalCase.tsx`
- Utilitários: `camelCase.ts`
- Hooks: `useHookName.ts`

**Comentários:**
- JSDoc para funções públicas
- Comments explicativos para lógica complexa
- Sem comentários óbvios

## Performance

- Lazy loading de rotas com `React.lazy`
- Memoização de componentes pesados com `React.memo`
- Debounce em inputs (search, filtros)
- Paginação infinita em listagens longas

## Troubleshooting

**401 em requisições:**
- Verificar se `/api/auth/me` funciona
- Verificar cookies (`httpOnly` deve estar setado)
- Verificar `VITE_API_URL`

**CORS:**
- Backend deve ter `cors` permitido

**PWA não instala:**
- HTTPS obrigatório em produção (localhost OK)
- Manifesto válido
- Service Worker registrado

**Scrollbar não aparece:**
- Conteúdo menor que a viewport — OK
- Overflow automático em `src/index.css`

## Contribuindo

1. Consulte `CLAUDE.md` na raiz e em `client/`
2. Mobile-first obrigatório
3. TypeScript strict mode
4. Componentes reutilizáveis em `src/components/`
5. Teste em múltiplos tamanhos de tela

## Links úteis

- React: https://react.dev
- Vite: https://vitejs.dev
- Tailwind: https://tailwindcss.com
- Recharts: https://recharts.org
- shadcn/ui: https://ui.shadcn.com
- React Router: https://reactrouter.com
