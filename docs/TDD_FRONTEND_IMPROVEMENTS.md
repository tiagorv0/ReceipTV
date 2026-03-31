# TDD - Melhorias e Criacao de Componentes Frontend

> Technical Design Document para evolucao do frontend do ReceipTV.
> Data: 2026-03-30

---

## 1. Resumo

Este documento mapeia inconsistencias, dividas tecnicas e oportunidades de melhoria no frontend do ReceipTV, propondo a criacao de componentes reutilizaveis e padronizacao do design system.

---

## 2. Problemas Identificados

### 2.1 Codigo Morto no Sidebar

**Arquivo:** `client/src/components/Sidebar.jsx` (linhas 105-123)

**Problema:** Existem botoes com `class` (HTML puro, nao JSX `className`) usando Material Symbols que nao estao sendo utilizados. Esse codigo esta visivel no DOM mas provavelmente quebrado/sem estilo.

**Impacto:** Alto. Elementos renderizados sem funcao, potencial quebra visual. Usa `class` ao inves de `className` (invalido em JSX, gera warnings).

**Solucao:** Remover completamente o bloco de botoes Material Symbols (linhas 105-123).

---

### 2.2 Inconsistencia de Estilo: LoginPage com Inline Styles

**Arquivo:** `client/src/pages/LoginPage.jsx`

**Problema:** A pagina de login usa extensivamente `style={{}}` inline (ex: linhas 58, 66-68, 76-77, 92-101, 113-119) enquanto todo o resto do projeto usa Tailwind CSS. Os inputs usam CSS variables (`var(--bg-color)`, `var(--card-border)`) diretamente no style ao inves de classes Tailwind.

**Impacto:** Medio. Dificulta manutencao, inconsistencia visual com outros formularios (ManualUploadForm usa Tailwind), e impossibilita hover/focus states via CSS.

**Solucao:** Migrar todos os inline styles para classes Tailwind, reutilizando os mesmos patterns de input do ManualUploadForm.

---

### 2.3 Inconsistencia de Estilo: ProfilePage com `class` ao inves de `className`

**Arquivo:** `client/src/pages/ProfilePage.jsx` (linhas 75-81, 85-86, 89, 94, 100-103)

**Problema:** Usa `class` (atributo HTML) ao inves de `className` (JSX) em varias divs. Alem disso, referencia classes CSS inexistentes no projeto como `bg-surface-container-lowest`, `border-outline-variant/10`, `text-on-surface/40`, `text-on-surface-variant/60`.

**Impacto:** Alto. Essas classes nao existem no Tailwind configurado, entao os estilos nao sao aplicados. Os elementos ficam sem estilo correto.

**Solucao:** Trocar `class` por `className` e substituir as classes Material Design 3 por equivalentes Tailwind/zinc do projeto.

---

### 2.4 Inputs Nao Padronizados

**Problema:** Existem pelo menos 3 variantes de input no projeto:

1. **ManualUploadForm:** `rounded-xl bg-zinc-700/60 border-zinc-600 px-4 py-3`
2. **ProfilePage/HistoryPage:** `h-10 rounded-md border-zinc-700 bg-zinc-700/60 px-3 py-2`
3. **LoginPage:** inline style com `var(--bg-color)`, `var(--card-border)`, `borderRadius: 10`

**Impacto:** Medio. Experiencia visual fragmentada entre paginas.

**Solucao:** Criar componente `<Input />` unificado (ver secao 3.2).

---

### 2.5 Botoes Nao Padronizados

**Problema:** Botoes primarios tem classes duplicadas entre ManualUploadForm, LoginPage, ProfilePage e UploadPage. A string de classes e copiada manualmente em cada local.

**Impacto:** Baixo-Medio. Funciona, mas qualquer mudanca de estilo exige editar multiplos arquivos.

**Solucao:** Utilizar o componente `<Button />` do shadcn/ui ja existente em `components/ui/button.jsx` com variantes customizadas.

---

### 2.6 Modal Duplicado

**Problema:** O codigo do modal de confirmacao de exclusao esta duplicado entre:
- `HistoryPage.jsx` (linhas 213-243)
- `ProfilePage.jsx` (linhas 194-245)

Ambos tem a mesma estrutura: overlay + card com icone, titulo, descricao, e botoes cancelar/confirmar.

**Impacto:** Medio. Codigo duplicado. Qualquer ajuste visual precisa ser feito em dois lugares.

**Solucao:** Criar componente `<ConfirmModal />` (ver secao 3.4).

---

### 2.7 Page Header Inconsistente

**Problema:** Existem duas abordagens para headers de pagina:
1. Componente `<PageHeader />` com classes CSS (`page-header`, `page-title`) - existe mas NAO e usado
2. Markup inline repetido em cada page (`<header className="mb-8">...`)

O componente PageHeader.jsx existe mas nenhuma pagina o utiliza.

**Impacto:** Baixo. Componente criado e nao adotado; headers sao duplicados.

**Solucao:** Adotar `<PageHeader />` em todas as paginas ou remover o componente e o CSS associado.

---

### 2.8 BankTag com Inline Styles

**Arquivo:** `client/src/components/BankTag.jsx`

**Problema:** O componente usa `style={{}}` inline para todo o styling (padding, borderRadius, fontSize, fontWeight) ao inves de Tailwind.

**Impacto:** Baixo. Funciona corretamente, mas sai do padrao do projeto.

**Solucao:** Migrar para classes Tailwind, mantendo apenas `background` e `color` dinamicos via style prop.

---

### 2.9 Componente Card Nao Utilizado

**Arquivo:** `client/src/components/Card.jsx`

**Problema:** Existe um componente `Card.jsx` mas nao e utilizado em nenhuma pagina. Os cards sao construidos inline em cada componente.

**Impacto:** Baixo. Componente orfao.

**Solucao:** Avaliar se vale adotar como base ou remover.

---

### 2.10 Typo no Estado: `sucess` ao inves de `success`

**Arquivo:** `client/src/pages/LoginPage.jsx` (linha 20)

**Problema:** `const [sucess, setSucess] = useState('');` - typo no nome da variavel.

**Impacto:** Baixo. Funcional, mas gera confusao para outros devs.

**Solucao:** Renomear para `success` / `setSuccess`.

---

### 2.11 `dangerouslySetInnerHTML` Desnecessario

**Arquivo:** `client/src/pages/LoginPage.jsx` (linha 142)

**Problema:** Usa `dangerouslySetInnerHTML` para renderizar um simples texto com `<u>`. Isso e desnecessario e pode representar risco de XSS se o conteudo vier de fonte dinamica no futuro.

**Solucao:** Usar JSX direto:
```jsx
<button onClick={() => setIsLogin(!isLogin)}>
  {isLogin ? <>Nao tem conta? <u>Cadastre-se</u></> : <>Ja tem conta? <u>Entre aqui</u></>}
</button>
```

---

### 2.12 ReceiptTable Subutilizado

**Arquivo:** `client/src/components/ReceiptTable.jsx`

**Problema:** Componente de tabela existe mas a HistoryPage usa cards ao inves de tabela para listar receipts. Verificar se e usado em outro contexto ou se e codigo legado.

**Impacto:** Baixo.

---

### 2.13 ChartCard vs ChartCard2

**Arquivos:** `client/src/components/ChartCard.jsx`, `ChartCard2.jsx`

**Problema:** Existem dois componentes de card para graficos. Apenas `ChartCard2` e utilizado no DashboardPage.

**Impacto:** Baixo. Componente orfao.

**Solucao:** Remover ChartCard.jsx se confirmado que nao e usado.

---

## 3. Propostas de Criacao/Refatoracao de Componentes

### 3.1 `<Button />` - Variantes do Design System

**Objetivo:** Usar o componente shadcn/ui Button ja existente, adicionando variantes que reflitam o design system do projeto.

**Variantes necessarias:**

| Variante | Visual | Uso |
|----------|--------|-----|
| `primary` | `bg-green-500/30 hover:bg-green-600 text-white` | Acoes principais (Salvar, Entrar) |
| `secondary` | `bg-zinc-700 hover:bg-zinc-600 text-zinc-300` | Cancelar, reset |
| `destructive` | `bg-red-500 hover:bg-red-600 text-white` | Excluir |
| `ghost` | `bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700` | Cancelar em modal |
| `icon` | `p-2 rounded-lg border` | Botoes de acao (share, delete) |
| `whatsapp` | `bg-[#25D366] hover:bg-[#25D366]/80 text-white` | Compartilhar WA |

**Tamanhos:**
- `sm`: `h-8 px-3 text-xs`
- `default`: `h-10 px-5 text-sm`
- `lg`: `h-12 px-6 text-sm py-3`

**Arquivo:** Extender `client/src/components/ui/button.jsx`

---

### 3.2 `<Input />` - Input Padronizado

**Objetivo:** Unificar os 3 estilos de input em um unico componente.

**Props:**
```typescript
interface InputProps {
  label?: string;
  required?: boolean;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  // ...HTMLInputAttributes
}
```

**Estilo base:**
```
w-full rounded-xl bg-zinc-700/60 border border-zinc-600 text-white
placeholder-zinc-500 px-4 py-3 text-sm outline-none
focus:border-green-600 focus:ring-1 focus:ring-green-500/30 transition-all
```

**Subcomponentes:**
- `<PasswordInput />` — input com toggle de visibilidade (Eye/EyeOff)
- `<CurrencyInput />` — input com prefixo "R$" e formatacao

**Arquivo:** `client/src/components/ui/input.jsx`

---

### 3.3 `<Select />` - Select Padronizado

**Objetivo:** Unificar selects nativos com mesmo estilo dos inputs.

**Arquivo:** Ja existe `client/src/components/ui/select.jsx` (shadcn). Avaliar se deve usar esse ou criar wrapper para `<select>` nativo com estilo consistente.

---

### 3.4 `<ConfirmModal />`

**Objetivo:** Componente reutilizavel para modais de confirmacao.

**Props:**
```typescript
interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  icon?: ReactNode;
  confirmLabel?: string;          // default: "Confirmar"
  cancelLabel?: string;           // default: "Cancelar"
  variant?: 'danger' | 'default'; // Controla cor da borda e botao
  loading?: boolean;
  children?: ReactNode;           // Conteudo extra (ex: input de senha)
}
```

**Locais que se beneficiam:**
- HistoryPage (delete receipt)
- ProfilePage (delete account)
- Futuras confirmacoes

---

### 3.5 `<PageHeader />` - Refatoracao

**Objetivo:** Refatorar o componente existente para usar Tailwind ao inves de CSS classes, e adota-lo em todas as paginas.

**Props:**
```typescript
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  centered?: boolean; // Para UploadPage
}
```

**Implementacao:**
```jsx
const PageHeader = ({ title, subtitle, actions, centered }) => (
  <header className={`mb-8 ${centered ? 'text-center' : ''} ${actions ? 'flex flex-col md:flex-row md:items-center justify-between gap-4' : ''}`}>
    <div>
      <h2 className="text-3xl font-bold text-white">{title}</h2>
      {subtitle && <p className="text-zinc-400">{subtitle}</p>}
    </div>
    {actions}
  </header>
);
```

**Paginas para adotar:** DashboardPage, HistoryPage, UploadPage, ProfilePage.

---

### 3.6 `<EmptyState />`

**Objetivo:** Componente para estados vazios (sem dados).

**Props:**
```typescript
interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode; // Botao opcional
}
```

**Usado em:** HistoryPage (sem comprovantes), potencialmente DashboardPage.

---

### 3.7 `<Badge />`

**Objetivo:** Unificar badges de tipo de pagamento e outros status.

**Variantes:**
- `default`: fundo zinc, texto verde, borda verde
- `bank`: cores dinamicas por banco
- `status`: cores por status

---

### 3.8 `<LoadingState />`

**Objetivo:** Unificar os estados de carregamento.

**Variantes:**
- `dot`: Pulse dot + texto (Dashboard style)
- `spinner`: Loader2 spinner + texto (Upload, History style)
- `inline`: Pequeno spinner para uso dentro de botoes

---

## 4. Melhorias de Arquitetura

### 4.1 Extrair CSS Custom para Tailwind Theme

**Problema:** O `index.css` define classes CSS manuais (`.nav-link`, `.page-title`, `.table`, `.wa-share-btn`) que poderiam ser Tailwind utilities ou componentes React.

**Proposta:** Migrar gradualmente:
- `.nav-link` → componente `<NavLink />` (ja existe NavItem.jsx, avaliar uso)
- `.page-title`, `.page-subtitle` → componente `<PageHeader />` com Tailwind
- `.table-*` → componente `<DataTable />` com Tailwind
- `.wa-share-btn` → variante do `<Button />`
- `.auth-*` → Tailwind classes direto no LoginPage

### 4.2 Consolidar Utilitarios de Estilo

**Problema:** `ManualUploadForm` define constantes locais `inputClass` e `labelClass`. Essas mesmas classes deveriam ser compartilhadas.

**Proposta:** Com a criacao dos componentes `<Input />` e `<Label />` padronizados, essas constantes se tornam desnecessarias.

### 4.3 Remover Dependencias Nao Utilizadas

Verificar se `Material Symbols` esta no HTML/package.json e remover se nao for usado alem do codigo morto no Sidebar.

---

## 5. Prioridade de Implementacao

| # | Tarefa | Impacto | Esforco | Prioridade |
|---|--------|---------|---------|------------|
| 1 | Remover codigo morto Sidebar (Material Symbols) | Alto | Baixo | **P0** |
| 2 | Corrigir `class` → `className` no ProfilePage | Alto | Baixo | **P0** |
| 3 | Corrigir typo `sucess` → `success` | Baixo | Baixo | **P0** |
| 4 | Remover `dangerouslySetInnerHTML` LoginPage | Medio | Baixo | **P0** |
| 5 | Criar `<ConfirmModal />` | Medio | Medio | **P1** |
| 6 | Criar `<Input />` padronizado | Medio | Medio | **P1** |
| 7 | Migrar LoginPage para Tailwind | Medio | Medio | **P1** |
| 8 | Refatorar `<PageHeader />` e adotar | Baixo | Baixo | **P1** |
| 9 | Extender `<Button />` com variantes | Baixo-Medio | Medio | **P2** |
| 10 | Criar `<EmptyState />` | Baixo | Baixo | **P2** |
| 11 | Criar `<Badge />` | Baixo | Baixo | **P2** |
| 12 | Criar `<LoadingState />` | Baixo | Baixo | **P2** |
| 13 | Migrar BankTag para Tailwind | Baixo | Baixo | **P2** |
| 14 | Remover componentes orfaos (Card, ChartCard, ReceiptTable?) | Baixo | Baixo | **P3** |
| 15 | Migrar CSS custom (index.css) para componentes | Baixo | Alto | **P3** |

---

## 6. Consideracoes

- **Nao quebrar funcionalidade existente.** Todas as migracoes devem ser incrementais.
- **Testar responsividade.** Cada componente novo deve funcionar em mobile e desktop.
- **Manter consistencia com shadcn/ui.** Novos componentes devem seguir o pattern de shadcn (variants via cva/class-variance-authority).
- **Preferir composicao.** Componentes pequenos e composiveis > componentes grandes com muitas props.
