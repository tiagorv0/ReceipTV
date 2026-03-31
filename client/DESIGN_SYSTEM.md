# ReceipTV - Design System

> Documento de referencia do sistema de design utilizado no frontend do ReceipTV.
> Ultima atualizacao: 2026-03-30

---

## 1. Fundamentos

### 1.1 Tema

O projeto utiliza exclusivamente **dark theme** com acentos em verde (#22c55e). Todo o visual segue uma estetica escura com superficies em zinc e destaques luminosos (glow) em verde.

### 1.2 Tipografia

| Token | Fonte | Fallback |
|-------|-------|----------|
| `--font-sans` | Inter Variable | sans-serif |

**Escala tipografica em uso:**

| Uso | Tamanho | Peso | Letter-spacing | Exemplo |
|-----|---------|------|----------------|---------|
| Titulo de pagina | 26px / `text-3xl` | 700 | -0.03em | "Visao Geral", "Historico" |
| Subtitulo de pagina | 14px | 400 | normal | "Acompanhe as metricas..." |
| Titulo de card | 18px / `text-lg` | 600-700 | normal | "Gastos por Banco" |
| Titulo auth | 24px | 700 | normal | "Bem-vindo de volta" |
| Label de formulario | 12px / `text-xs` | 500 | 0.05em (uppercase) | "DATA INICIAL" |
| Corpo | 14px / `text-sm` | 400-500 | normal | Textos gerais |
| Header de tabela | 13px | 500 | 0.06em (uppercase) | "NOME", "VALOR" |
| Celula de tabela | 13px | 400 | normal | Dados da tabela |
| Badge/Tag | 12px | 600 | normal | "PIX", "Itau" |
| Texto pequeno | 12px / `text-xs` | 400 | normal | Info secundaria |
| KPI valor | 30px / `text-3xl` | 700 | normal | "R$ 1.234,56" |

### 1.3 Paleta de Cores

#### Cores do Sistema (CSS Custom Properties)

```
--bg-color:        #3a3a4944        // Overlay/fundo dimmed
--card-bg:         #101018          // Fundo de cards
--card-border:     #1e1e2b          // Borda de cards
--primary:         #009472          // Verde primario (escuro)
--primary-soft:    rgba(74,222,128,0.08) // Hover suave
--primary-strong:  #22c55e          // Verde brilhante (principal)
--accent:          oklch(0.97 0 0)  // Acento claro
--danger:          #ef4444          // Vermelho de erro/perigo
--text-dim:        #9ca3af          // Texto secundario
--text-muted:      #6b7280          // Texto terciario
```

#### Superficie (Tailwind zinc)

| Uso | Classe Tailwind | Hex aprox. |
|-----|-----------------|------------|
| Fundo principal | `bg-zinc-900` | #18181b |
| Card/Container | `bg-zinc-800` | #27272a |
| Input background | `bg-zinc-700/60` | #3f3f46 (60%) |
| Borda sutil | `border-zinc-700` | #3f3f46 |
| Borda mais sutil | `border-zinc-800` | #27272a |
| Separador | `border-zinc-600` | #52525b |

#### Verde (acento primario)

| Uso | Classe | Exemplo |
|-----|--------|---------|
| Texto destaque | `text-green-400` | Valores, links ativos |
| Texto forte | `text-green-500` | - |
| Fundo botao primario | `bg-green-500/30` | Botao submit |
| Hover botao | `hover:bg-green-600` | - |
| Borda destaque | `border-green-500/30` | Cards com destaque |
| Icone bg | `bg-green-500/10` | Icone containers |
| Icone bg hover | `bg-green-500/20` | Hover state |
| Glow | `shadow-[0_0_15px_rgba(34,197,94,0.2)]` | Logo |

#### Vermelho (perigo/erro)

| Uso | Classe |
|-----|--------|
| Texto erro | `text-red-400` |
| Fundo erro | `bg-red-500/10` |
| Borda erro | `border-red-500/20` |
| Botao danger | `bg-red-500`, `bg-red-600` |
| Zona de perigo | `bg-red-950/20 border-red-500/30` |

#### Texto

| Uso | Classe |
|-----|--------|
| Titulo/destaque | `text-white` |
| Corpo | `text-zinc-300` |
| Secundario | `text-zinc-400` |
| Terciario/muted | `text-zinc-500` |
| Labels | `text-zinc-400` (uppercase) |

### 1.4 Espacamento

**Base unit:** 4px (padrao Tailwind)

| Token | Valor | Uso principal |
|-------|-------|---------------|
| `gap-1` | 4px | Icone + texto pequeno |
| `gap-2` | 8px | Itens inline, badges |
| `gap-3` | 12px | Campos de formulario |
| `gap-4` | 16px | Cards em grid, items de lista |
| `gap-6` | 24px | Secoes, grid principal |
| `p-4` | 16px | Padding mobile |
| `p-6` | 24px | Padding de cards |
| `p-8` | 32px | Padding desktop, auth |
| `mb-6` | 24px | Espaco pos-header |
| `mb-8` | 32px | Espaco pos-header grande |

### 1.5 Border Radius

```
--radius:    0.625rem (10px)   // Base
--radius-sm: 6px               // Badges pequenos
--radius-md: 8px               // Inputs internos
--radius-lg: 10px              // Base (var --radius)
--radius-xl: 14px              // Cards, tabelas
--radius-2xl: 18px             // Cards maiores
--radius-3xl: 22px             // Upload area, auth card
--radius-4xl: 26px             // -
```

**Uso real nos componentes:**

| Componente | Radius | Classe |
|------------|--------|--------|
| Input/Select | 12px | `rounded-xl` |
| Botao | 12px | `rounded-xl` |
| Badge/Tag | 20px | `rounded-full` ou inline `borderRadius: 20` |
| Card KPI | 16px | `rounded-2xl` |
| Card Auth | 12px | `rounded-xl` |
| Card Upload/Result | 24px | `rounded-3xl` |
| Modal | 16px | `rounded-2xl` |
| Nav link | 12px | `border-radius: 12px` (CSS) |
| Tabela container | 14px | `var(--radius-xl)` |

### 1.6 Sombras

| Uso | Valor |
|-----|-------|
| Sidebar | `shadow-2xl` |
| Logo glow | `0 0 15px rgba(34,197,94,0.2)` |
| Tabela glow | `0 18px 50px rgba(34,197,94,0.3)` |
| Botao WA | `0 16px 30px rgba(34,197,94,0.45)` |
| Upload dragover | `0 0 30px rgba(34,197,94,0.15)` |
| Modal | `shadow-2xl` |
| PWA banner | `shadow-xl shadow-black/40` |
| Valor texto | `drop-shadow-[0_0_8px_rgba(34,197,94,0.2)]` |

### 1.7 Animacoes

| Tipo | Propriedades | Uso |
|------|--------------|-----|
| Fade in | `animate-in fade-in duration-500` | Dashboard |
| Fade + Zoom | `animate-in fade-in zoom-in-95 duration-300` | Upload |
| Fade + Zoom pequeno | `animate-in fade-in zoom-in-80 duration-300` | Profile |
| Slide up | `animate-in slide-in-from-bottom-4 duration-500` | History |
| Modal zoom | `animate-in zoom-in-95 duration-200` | Modais |
| Hover translate | `transform: translateX(2px)` 0.18s | Nav links |
| Hover lift | `transform: translateY(-1px)` 0.12s | Botao WA |
| Pulse dot | scale 1->1.5, shadow pulse 1.4s | Loading |
| Spin | `animate-spin` | Loader2 icons |

### 1.8 Breakpoints

| Breakpoint | Largura | Uso principal |
|------------|---------|---------------|
| default | 0px | Mobile first |
| `sm` | 640px | Filtros inline |
| `md` | 768px | Sidebar visivel, grid 2-col, layout row |
| `lg` | 1024px | Grid 2-col charts, chart colspan |

---

## 2. Componentes

### 2.1 Botoes

#### Primario (Submit/Acao principal)
```jsx
className="flex items-center justify-center gap-2 rounded-xl bg-green-500/30
  hover:bg-green-600 disabled:opacity-60 text-white font-medium py-3 text-sm
  transition-colors"
```

#### Secundario (Cancelar/Reset)
```jsx
className="px-5 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-zinc-300
  text-sm font-medium transition-colors"
```

#### Danger (Excluir/Confirmar exclusao)
```jsx
className="h-10 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm
  font-medium transition-colors"
// ou
className="h-10 px-5 rounded-lg bg-red-600 hover:bg-red-700 text-white
  text-sm font-medium transition-colors"
```

#### Ghost/Outline (Cancelar em modal)
```jsx
className="h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300
  text-sm font-medium transition-colors border border-zinc-700"
```

#### Icon Button (Acoes em lista)
```jsx
className="p-2 bg-green-500/10 text-green-400 hover:bg-green-500
  hover:text-white rounded-lg transition-colors border border-green-500/30"
```

#### WhatsApp Share
```css
.wa-share-btn {
  background: var(--primary-strong);
  color: #f9fafb;
  border-radius: 12px;
  font-weight: 700;
  box-shadow: 0 16px 30px rgba(34, 197, 94, 0.45);
}
```

### 2.2 Cards

#### KPI Card
- Fundo: `bg-zinc-800`
- Borda: `border-green-500/30` (com glow) ou `border-zinc-700`
- Radius: `rounded-2xl`
- Padding: `p-6`
- Efeito: Glow blob no canto superior direito ao hover

#### Chart Card
- Fundo: `bg-zinc-800`
- Borda: `border-zinc-700`
- Radius: `rounded-2xl`
- Padding: `p-6`
- Header: Icone verde + titulo, separado por `border-b border-zinc-700`

#### Receipt Card (Historia)
- Fundo: `bg-zinc-800`
- Borda: `border-green-500/30`
- Radius: `rounded-xl`
- Padding: `p-4 md:p-3`
- Hover: `hover:border-zinc-700`
- Acoes visiveis no mobile, ocultas no desktop ate hover

#### Auth Card
- Fundo: `bg-zinc-800`
- Borda: `border-green-500/30`
- Radius: `rounded-xl`
- Padding: `p-8 sm:p-16`

#### Section Card (Upload, Profile)
- Fundo: `bg-zinc-800`
- Borda: `border-green-500/30`
- Radius: `rounded-3xl`
- Padding: `p-6 md:p-8`

### 2.3 Inputs

#### Input padrao
```jsx
className="w-full rounded-xl bg-zinc-700/60 border border-zinc-600 text-white
  placeholder-zinc-500 px-4 py-3 text-sm outline-none focus:border-green-600
  focus:ring-1 focus:ring-green-500/30 transition-all"
```

#### Input em Profile/History (variante menor)
```jsx
className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-700/60 px-3
  py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none
  focus:ring-1 focus:ring-green-500 transition-colors"
```

#### Input Auth (inline styles - NAO padronizado)
```jsx
style={{ padding: '12px', background: 'var(--bg-color)',
  border: '1px solid var(--card-border)', borderRadius: 10, color: 'white' }}
```

#### Label padrao
```jsx
className="block text-xs font-medium text-zinc-400 mb-1.5"
// ou uppercase:
className="text-xs font-medium text-zinc-400 uppercase tracking-wider"
```

### 2.4 Tabela

Definida em CSS puro (index.css):
- Container: `var(--card-bg)`, borda verde com glow
- Header: `#151521`, texto uppercase muted
- Celulas: padding `14px 16px`, font 13px
- Linhas alternadas: rgba overlay
- Hover: `rgba(31, 41, 55, 0.7)`

### 2.5 Badges/Tags

Componente `<Badge />` em `components/Badge.jsx`:

| Variante | Uso |
|----------|-----|
| `default` | Tipo de pagamento (PIX, TED, etc.) — verde |
| `status` | Status genérico — zinc |

#### Payment Type Badge
```jsx
<Badge>{receipt.tipo_pagamento}</Badge>
```

#### Bank Tag
Componente `<BankTag bank={...} />` em `components/BankTag.jsx`.
Mantém `background` e `color` dinâmicos via `style` prop; demais estilos em Tailwind.

### 2.6 Inputs

Componente `<Input />` e `<PasswordInput />` em `components/ui/input.jsx`.

**Props:** `label`, `required`, `error`, `leftIcon`, `rightIcon` + todos os atributos HTML de `<input>`.

**Estilo base:**
```
w-full rounded-xl bg-zinc-700/60 border border-zinc-600 text-white
placeholder:text-zinc-500 px-4 py-3 text-sm outline-none
focus:border-green-600 focus:ring-1 focus:ring-green-500/30 transition-all
```

### 2.7 Mensagens de Feedback (Error / Success)

#### Error
```jsx
className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10
  border border-red-500/20 rounded-lg px-3 py-2 mb-6"
```

#### Success
```jsx
className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10
  border border-green-500/20 rounded-lg px-3 py-2 mb-6"
```

### 2.8 Modal

Componente `<ConfirmModal />` em `components/ConfirmModal.jsx`.

**Props:** `open`, `onClose`, `onConfirm`, `title`, `description`, `icon`, `confirmLabel`, `cancelLabel`, `variant` (`'danger'` | `'default'`), `loading`, `children`.

```jsx
<ConfirmModal
  open={modal}
  onClose={() => setModal(false)}
  onConfirm={handleConfirm}
  title="Excluir?"
  description="Esta ação não pode ser desfeita."
  icon={<div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center"><Trash2 className="text-red-400" size={26} /></div>}
  confirmLabel="Sim, excluir"
/>
```

### 2.9 Empty State

Componente `<EmptyState />` em `components/EmptyState.jsx`.

**Props:** `icon`, `title`, `description`, `action`.

```jsx
<EmptyState
  icon={<List className="w-16 h-16" />}
  title="Nenhum comprovante salvo"
  description="Faça o upload do seu primeiro comprovante."
/>
```

### 2.10 Loading States

Componente `<LoadingState />` em `components/LoadingState.jsx`.

| Variante | Visual | Uso |
|----------|--------|-----|
| `spinner` (padrão) | `Loader2` animado | Upload, History |
| `dot` | Pulse dot verde | Dashboard |

```jsx
<LoadingState variant="dot" text="Carregando histórico..." />
```

### 2.11 Page Header

Componente `<PageHeader />` em `components/PageHeader.jsx`.

**Props:** `title`, `subtitle`, `actions`, `centered`.

```jsx
<PageHeader title="Histórico" subtitle="..." actions={<Badge>5 registros</Badge>} />
<PageHeader title="Upload" subtitle="..." centered />
```

### 2.11 Navegacao (Sidebar)

- Desktop: fixa lateral, 256px (w-64)
- Mobile: menu hamburger (comentado atualmente), fallback hidden
- Links: classe `.nav-link` com hover translateX e cor verde
- Logo: Icone com glow + texto gradiente
- Logout: Estilo diferente dos nav-links (hover vermelho)

---

## 3. Icones

### Bibliotecas
- **Lucide React** (principal): Todos os icones de navegacao, acoes, feedback
- **Hugeicons React**: Usado em componentes shadcn (select, calendar)

### Tamanhos padrao
| Contexto | Tamanho |
|----------|---------|
| Navegacao | 20px |
| Header de card | 18px |
| Acoes em lista | 18px |
| Dentro de texto/label | 13-15px |
| Empty state | 64px (w-16 h-16) |
| Upload area | 48px (w-12 h-12) |
| KPI card | Default (24px) |

---

## 4. Layout

### Estrutura principal
```
<div className="min-h-screen bg-zinc-900 text-zinc-300 flex flex-col md:flex-row">
  <Sidebar />                    <!-- w-full md:w-64 -->
  <main className="flex-1 p-4 md:p-8 overflow-y-auto">
    <div className="max-w-6xl mx-auto relative z-10">
      <!-- Glow blur no topo -->
      <div className="absolute top-0 left-1/2 ... bg-green-500/5 blur-[100px]" />
      <Outlet />
    </div>
  </main>
</div>
```

### Grids por pagina

| Pagina | Grid | Breakpoints |
|--------|------|-------------|
| Dashboard KPIs | `grid-cols-1 md:grid-cols-2` | 2 cols a partir de md |
| Dashboard Charts | `grid-cols-1 lg:grid-cols-2` | 2 cols a partir de lg |
| History cards | `grid-cols-1` | Sempre 1 coluna |
| Upload result | `grid-cols-1 md:grid-cols-2` | 2 cols a partir de md |
| Profile form | `grid-cols-[11rem_1fr]` | Label + input |
| Profile info | `grid-cols-1 md:grid-cols-2` | 2 cols a partir de md |
