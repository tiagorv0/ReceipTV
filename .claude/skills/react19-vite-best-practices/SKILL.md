---
name: react19-vite-best-practices
description: Boas práticas específicas para React 19 + Vite 7 em SPAs (sem Next.js/SSR). Use ao escrever, revisar ou refatorar componentes React, hooks customizados, configuração do Vite, gerenciamento de estado, carregamento de código (lazy/Suspense) ou ao perguntar sobre novas APIs do React 19 como use(), useOptimistic, useActionState, ref-as-prop. Complementa vercel-react-best-practices (performance) e mobile-first-frontend (responsividade).
---

# React 19 + Vite 7 — Boas Práticas

## React 19: Novas APIs

### `ref` como prop (sem `forwardRef`)

```jsx
// ✅ React 19 — ref é prop normal
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}

// ❌ Não precisamos mais disso:
const Input = forwardRef((props, ref) => <input ref={ref} {...props} />);
```

### `use()` — lê Promises e Context no render

```jsx
// ✅ Lê uma Promise dentro de Suspense
function UserName({ userPromise }) {
  const user = use(userPromise); // suspende automaticamente
  return <span>{user.name}</span>;
}

// ✅ Lê Context condicionalmente (diferente de useContext)
function Theme({ children }) {
  if (dark) {
    const theme = use(ThemeContext); // funciona dentro de if
    return <div style={{ background: theme.bg }}>{children}</div>;
  }
  return children;
}
```

### `useOptimistic` — feedback imediato antes da resposta do servidor

```jsx
function ReceiptList({ receipts, deleteReceipt }) {
  const [optimisticReceipts, removeOptimistic] = useOptimistic(
    receipts,
    (state, idToRemove) => state.filter(r => r.id !== idToRemove)
  );

  async function handleDelete(id) {
    removeOptimistic(id);        // atualiza UI instantaneamente
    await deleteReceipt(id);     // dispara request real
  }
  // ...
}
```

### `useActionState` — estado de ações assíncronas (substitui `useFormState`)

```jsx
async function submitAction(prevState, formData) {
  const result = await api.save(formData.get('amount'));
  if (!result.ok) return { error: result.message };
  return { success: true };
}

function ReceiptForm() {
  const [state, formAction, isPending] = useActionState(submitAction, null);

  return (
    <form action={formAction}>
      <input name="amount" />
      <button disabled={isPending}>
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
      {state?.error && <p>{state.error}</p>}
    </form>
  );
}
```

### `useFormStatus` — estado do form pai (uso em sub-componente)

```jsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus(); // lê o form ancestral
  return <button disabled={pending}>Salvar</button>;
}
```

### `useTransition` com async (React 19)

```jsx
// ✅ startTransition agora aceita async
const [isPending, startTransition] = useTransition();

function handleUpload(file) {
  startTransition(async () => {
    await uploadReceipt(file);
    router.push('/history');
  });
}
```

---

## Hooks: Regras e Armadilhas

### Dependências de efeitos

```jsx
// ❌ Objeto criado no render → efeito re-executa infinitamente
useEffect(() => { fetch(config.url) }, [config]); // config = {} novo todo render

// ✅ Use primitivos como dependência
useEffect(() => { fetch(url) }, [url]);

// ✅ Ou estabilize o objeto com useMemo
const config = useMemo(() => ({ url, timeout }), [url, timeout]);
```

### `useMemo` / `useCallback`: use com critério

```jsx
// ❌ Memoizar valores primitivos é desperdício
const doubled = useMemo(() => count * 2, [count]);

// ✅ Reserve para cálculos pesados ou referências estáveis
const sorted = useMemo(() => [...items].sort(compare), [items]);
const handleDelete = useCallback((id) => deleteItem(id), [deleteItem]);
```

### Cleanup de efeitos

```jsx
useEffect(() => {
  const controller = new AbortController();
  fetch('/api/data', { signal: controller.signal })
    .then(r => r.json())
    .then(setData);

  return () => controller.abort(); // ✅ cancela o fetch ao desmontar
}, []);
```

### Custom hooks: extraia lógica reutilizável

```jsx
// ✅ Hook com nome descritivo e cleanup
function useReceipts(filters) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchReceipts(filters, controller.signal)
      .then(setData)
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [filters]);

  return { data, loading };
}
```

---

## Lazy Loading e Suspense

```jsx
// ✅ Importe componentes pesados de forma lazy
const ReceiptChart = lazy(() => import('./ReceiptChart'));
const PDFPreview = lazy(() => import('./PDFPreview'));

function Dashboard() {
  return (
    <Suspense fallback={<Skeleton />}>
      <ReceiptChart />
    </Suspense>
  );
}
```

**Regra:** use `lazy()` para componentes que não aparecem no caminho crítico inicial (modais, abas secundárias, gráficos abaixo do fold).

---

## Gerenciamento de Estado

| Tipo de estado | Solução |
|---|---|
| Local (UI) | `useState` |
| Derivado de props/state | calcule no render — sem `useEffect` |
| Compartilhado na árvore | `useContext` + `useReducer` |
| URL (filtros, paginação) | `useSearchParams` |
| Server state (cache/fetch) | SWR / React Query |
| Formulários complexos | React Hook Form |

```jsx
// ❌ Estado derivado com efeito (causa render extra)
useEffect(() => {
  setFullName(`${first} ${last}`);
}, [first, last]);

// ✅ Calcule durante o render
const fullName = `${first} ${last}`;
```

---

## Vite 7: Configuração e Padrões

### Variáveis de ambiente

```jsx
// Apenas variáveis com prefixo VITE_ são expostas ao browser
const apiUrl = import.meta.env.VITE_API_URL;
const isDev  = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

// ❌ Nunca usar process.env no browser (não existe no Vite)
```

### Import glob dinâmico

```js
// Importa todos os componentes de uma pasta
const components = import.meta.glob('./components/*.jsx');
const eagerModules = import.meta.glob('./icons/*.svg', { eager: true });
```

### vite.config.js — padrões recomendados

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      output: {
        // Separa vendors em chunk dedicado
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          pdf: ['@react-pdf/renderer'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000', // evita CORS no dev
    },
  },
});
```

### Análise de bundle

```bash
# Instale e use para inspecionar o bundle
npx vite-bundle-visualizer
```

---

## Padrões de Componente

### Composição sobre configuração

```jsx
// ❌ Prop drilling excessivo / componente "faz tudo"
<Modal title="..." footer="..." onClose={...} body={...} />

// ✅ Composição flexível
<Modal>
  <Modal.Header>Exportar</Modal.Header>
  <Modal.Body>...</Modal.Body>
  <Modal.Footer><Button>Fechar</Button></Modal.Footer>
</Modal>
```

### Sem componentes definidos dentro de componentes

```jsx
// ❌ Row é recriada a cada render de List
function List({ items }) {
  function Row({ item }) { return <li>{item.name}</li>; } // ← NUNCA
  return <ul>{items.map(i => <Row key={i.id} item={i} />)}</ul>;
}

// ✅ Define fora
function Row({ item }) { return <li>{item.name}</li>; }
function List({ items }) { ... }
```

### JSX estático fora do componente

```jsx
// ✅ Hoist JSX imutável para fora — zero re-criação
const EMPTY_STATE = <p className="text-zinc-500">Nenhum resultado.</p>;

function ReceiptList({ items }) {
  if (!items.length) return EMPTY_STATE;
  // ...
}
```

---

## Checklist de Revisão

- [ ] Novos hooks do React 19 usados onde cabem (`use`, `useOptimistic`, `useActionState`)
- [ ] `forwardRef` removido — usa `ref` como prop diretamente
- [ ] Componentes pesados com `lazy()` + `Suspense`
- [ ] Sem estado derivado via `useEffect` — calcule no render
- [ ] Dependências de efeito são primitivos (não objetos inline)
- [ ] Cleanup de fetch com `AbortController`
- [ ] `useMemo`/`useCallback` apenas onde necessário (não por padrão)
- [ ] Env vars com prefixo `VITE_`, sem `process.env`
- [ ] `manualChunks` no Vite para libs pesadas (PDF, charts)
- [ ] Sem componentes definidos dentro de outros componentes
