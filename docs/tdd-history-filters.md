# TDD — Filtros Avançados, Ordenação e Paginação Infinita no Histórico

| Campo           | Valor                                          |
|-----------------|------------------------------------------------|
| Tech Lead       | Tiago Reolon Vazzoller                         |
| Componente      | `client/src/pages/HistoryPage.jsx`             |
| Branch          | `chore/improvements-layout`                   |
| Status          | **Implementado**                               |
| Criado em       | 2026-03-31                                     |
| Última Atualização | 2026-03-31 (rev. pós-implementação)         |

---

## Contexto

O ReceipTV é um gerenciador de comprovantes financeiros com extração via IA. A página **Histórico** (`/history`) lista todos os comprovantes do usuário e atualmente oferece apenas filtragem por intervalo de data (com padrão no mês atual).

Com o crescimento do volume de comprovantes, os usuários precisam de mais formas de encontrar registros específicos e de visualizar subconjuntos relevantes dos dados — por banco, tipo de pagamento, beneficiário ou faixa de valor.

---

## Definição do Problema

### Problemas a Resolver

- **Filtro por data insuficiente**: O único filtro disponível é por intervalo de data. Não é possível filtrar por banco, tipo de pagamento, nome ou valor.
- **Sem ordenação configurável**: Os registros aparecem na ordem retornada pela API, sem controle do usuário sobre o critério de ordenação.
- **Sem paginação**: Todos os registros são renderizados de uma vez, podendo degradar a performance e a UX em listas longas.
- **Painel de filtros sem estado visível**: Quando existir um filtro ativo, o usuário não tem confirmação visual de quais filtros estão aplicados sem expandir o painel.

### Por Que Agora

A funcionalidade de upload e extração via IA já está estável. O próximo passo natural é tornar a consulta ao histórico mais poderosa e ergonômica, especialmente para usuários com muitos comprovantes cadastrados.

---

## Escopo

### ✅ Incluso (V1) — Implementado

- Painel de filtros colapsável com **animação suave** (CSS `grid-template-rows` de `0fr` → `1fr`) e estado visual de filtros ativos (badges)
- Novos filtros: nome (busca textual), banco (select), tipo de pagamento (select), range de valor (mín/máx)
- Filtro de data mantido, com padrão = primeiro e último dia do mês atual
- Layout do painel: 2 linhas × 2 colunas (ver seção de layout abaixo)
- Ordenação client-side com dropdown (6 opções), padrão = data mais recente
- Paginação infinita client-side via `IntersectionObserver`, padrão 10 itens, com contador "Exibindo X de Y"
- Scroll automático: ao atingir o fim da lista, carrega mais 10 automaticamente
- Remoção individual de filtro via badge "×"
- Botão "Limpar Filtros" para reset total
- **Persistência híbrida dos filtros aplicados via URL search params** (shareable + browser back/forward)
- Input de valor aceita vírgula como separador decimal (formato BR: `50,00`)
- Totalmente responsivo (mobile-first, `md:` para desktop)
- **Sidebar corrigida**: `md:sticky md:top-0 md:h-screen` para que Perfil e Sair sempre permaneçam visíveis independentemente do tamanho do conteúdo principal

### ❌ Fora do Escopo (V1)

- Filtros server-side (os filtros adicionais continuam client-side)
- Filtro por descrição do comprovante
- Exportação de resultados filtrados
- Filtro por tipo de arquivo (PDF vs. imagem)
- Persistência do estado aberto/fechado do painel de filtros

### 🔮 Futuro (V2+)

- Filtros server-side para grandes volumes (>1.000 registros)
- Salvar filtros favoritos

---

## Solução Técnica

### Visão Geral da Arquitetura

Toda a lógica de filtragem, ordenação e paginação é implementada **client-side**, sem alterações na API. Os dados são carregados uma única vez (conforme hoje) e manipulados via `useMemo`.

```
URL Search Params (fonte de verdade persistida)
        ↓  (leitura na montagem)
Estado local: appliedFilters, pendingFilters, sortBy, visibleCount
        ↓
Usuário interage com FilterPanel
        ↓
"Aplicar Filtros" → setAppliedFilters + sync URL params
        ↓
useMemo: filtra → ordena → fatia (slice)
        ↓
Renderiza lista de ReceiptCards
        ↓
IntersectionObserver (sentinel element) → visibleCount += 10
```

### Layout do Painel de Filtros

**Cabeçalho (sempre visível):**
```
[ Filtros ]  [ Banco: Nubank × ]  [ Tipo: PIX × ]  [ ˅ ]
```

**Corpo expandido (grid 2×2) — abre/fecha com animação CSS:**
```
┌─────────────────────────────┬────────────────────────────────┐
│ 🔍 Buscar por nome...        │ 📅 Data Inicial  /  Data Final  │
├────────────────┬────────────┼──────────────┬─────────────────┤
│ Tipo Pagamento │   Banco    │  Valor Mín   │    Valor Máx    │
└────────────────┴────────────┴──────────────┴─────────────────┘
                          [ Aplicar Filtros ]  [ Limpar Filtros ]
```

No mobile (< `md:`), os 4 quadrantes empilham em coluna única.

### Animação de Colapso

Técnica CSS `grid-template-rows` — sem JavaScript, sem bibliotecas externas:

```jsx
// Wrapper externo: anima de 0fr → 1fr
<div className={`grid transition-[grid-template-rows] duration-300 ease-in-out
    ${filtersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
    {/* Filho interno: overflow-hidden garante o clipping durante a animação */}
    <div className="overflow-hidden">
        {/* conteúdo do painel */}
    </div>
</div>
```

> **Por quê esta técnica**: `max-height` requer um valor arbitrário e produz easing não-linear. `grid-template-rows: 0fr → 1fr` anima a altura real do conteúdo de forma suave e sem valor fixo.

### Correção do Sidebar (bug relacionado)

**Problema**: O sidebar usava `md:h-full`, mas o contêiner pai no Layout não tinha altura explícita. Quando `main` tinha conteúdo longo, o sidebar crescia além da viewport, empurrando os botões Perfil e Sair para fora do scroll visível.

**Solução**: Substituir `md:h-full` por `md:sticky md:top-0 md:h-screen` no `aside` do Sidebar.

```jsx
// Antes
<aside className="... md:h-full ...">

// Depois
<aside className="... md:sticky md:top-0 md:h-screen ...">
```

O sidebar agora é uma coluna de posição `sticky` com altura fixa igual à viewport, enquanto o `main` rola independentemente.

### Forma dos Estados

```js
// react-router-dom — fonte de verdade persistida na URL
const [searchParams, setSearchParams] = useSearchParams();

// Helpers para ler da URL com fallbacks padrão
function readFiltersFromURL(searchParams) {
  return {
    nome:           searchParams.get('nome')           ?? '',
    banco:          searchParams.get('banco')          ?? '',
    tipoPagamento:  searchParams.get('tipo')           ?? '',
    valorMin:       searchParams.get('valorMin')       ?? '',
    valorMax:       searchParams.get('valorMax')       ?? '',
    startDate:      searchParams.get('startDate')      ?? firstDayOfCurrentMonth,
    endDate:        searchParams.get('endDate')        ?? lastDayOfCurrentMonth,
  };
}

// Filtros staged (pendentes, antes de "Aplicar")
const [pendingFilters, setPendingFilters] = useState(() => readFiltersFromURL(searchParams));

// Filtros aplicados (usados no useMemo) — inicializados da URL
const [appliedFilters, setAppliedFilters] = useState(() => readFiltersFromURL(searchParams));

// UI — não persistido
const [filtersOpen, setFiltersOpen] = useState(false); // colapsado por padrão
const [sortBy, setSortBy] = useState(searchParams.get('sort') ?? 'date_desc');
const [visibleCount, setVisibleCount] = useState(10);  // sempre reinicia em 10
```

> **Decisão de design (persistência híbrida)**: `appliedFilters` e `sortBy` são espelhados nos URL search params ao serem aplicados. Na montagem do componente, os params da URL são lidos para restaurar o estado — permitindo que o usuário compartilhe ou marque como favorito uma URL com filtros específicos e navegue com back/forward do browser. O estado aberto/fechado do painel (`filtersOpen`) **não** é persistido. O campo `nome` aplica automaticamente com debounce de 300ms e também sincroniza a URL.

### Sincronização URL ↔ Estado

**Ao aplicar filtros** (`handleApply`):
```
setAppliedFilters(pendingFilters)
setSearchParams({ ...filtersToParams(pendingFilters), sort: sortBy })
setVisibleCount(10)
```

**Ao remover um filtro por badge** (`removeFilter(key)`):
```
novo = { ...appliedFilters, [key]: defaultValue }
setAppliedFilters(novo)
setPendingFilters(novo)
setSearchParams({ ...filtersToParams(novo), sort: sortBy })
```

**Ao limpar tudo** (`handleClear`):
```
setAppliedFilters(defaultFilters)
setPendingFilters(defaultFilters)
setSearchParams({})   // limpa todos os params
```

**Ao mudar `sortBy`**:
```
setSortBy(valor)
setSearchParams(prev => ({ ...Object.fromEntries(prev), sort: valor }))
```

**Parâmetros de URL** (chaves usadas):

| Parâmetro   | Filtro correspondente      |
|-------------|---------------------------|
| `nome`      | Busca por nome             |
| `banco`     | Banco                      |
| `tipo`      | Tipo de pagamento          |
| `valorMin`  | Valor mínimo               |
| `valorMax`  | Valor máximo               |
| `startDate` | Data inicial               |
| `endDate`   | Data final                 |
| `sort`      | Critério de ordenação      |

Parâmetros com valor igual ao padrão são omitidos da URL para mantê-la limpa.

### Lógica de Filtragem e Ordenação

Pipeline `useMemo` executado sobre `receipts` (dados brutos da API):

1. **Filtrar** por todos os campos em `appliedFilters`:
   - `nome`: `receipt.nome.toLowerCase().includes(nome.toLowerCase())`
   - `banco`: igualdade exata case-insensitive (valor do select em lowercase)
   - `tipoPagamento`: igualdade exata case-insensitive
   - `valorMin` / `valorMax`: comparação numérica. Valor do input normalizado antes da comparação: substituir vírgula por ponto (`'50,00' → 50.00`) via `parseFloat(v.replace(',', '.'))`
   - `startDate` / `endDate`: comparação de strings ISO (UTC)

2. **Ordenar** por `sortBy`:

| Valor        | Critério                              |
|--------------|---------------------------------------|
| `date_desc`  | `data_pagamento` decrescente (padrão) |
| `date_asc`   | `data_pagamento` crescente            |
| `value_desc` | `valor` decrescente                   |
| `value_asc`  | `valor` crescente                     |
| `name_asc`   | `nome` A→Z                            |
| `name_desc`  | `nome` Z→A                            |

3. **Fatiar** `filteredSorted.slice(0, visibleCount)` para paginação.

### Badges de Filtros Ativos

Geradas dinamicamente a partir de `appliedFilters`. Cada badge exibe o label do filtro e seu valor, com botão "×" que chama `removeFilter(key)` — reseta aquele campo para o valor padrão e reaplicar os filtros.

`removeFilter` trata chaves especiais:
- `'valor'` → reseta `valorMin` e `valorMax` juntos
- `'date'` → reseta `startDate` e `endDate` juntos

Exemplos de badges:
```
[ Banco: Nubank × ]  [ Tipo: PIX × ]  [ Valor: R$ 50 – R$ 500 × ]
```

### Paginação Infinita (IntersectionObserver)

- `visibleCount` começa em `10` e incrementa `+10` automaticamente ao rolar até um **elemento sentinela** renderizado após o último card visível.
- Um `IntersectionObserver` observa o elemento sentinela. Quando ele entra na viewport, dispara `setVisibleCount(c => c + 10)`.
- O observer é desconectado enquanto `visibleCount >= total` (não há mais itens a carregar).
- Quando `appliedFilters` ou `sortBy` mudam, `visibleCount` é resetado para `10` via `useEffect`.
- Exibir acima da lista: `"Exibindo {Math.min(visibleCount, total)} de {total} registros"`.
- Enquanto carrega mais: exibir spinner sutil (`animate-pulse`) no sentinela.

### Opções dos Selects

**Banco**: gerado a partir de `BANKS` (já existente em `src/utils/banks.js`). Valores do select são as chaves lowercase (ex: `'nubank'`); comparação com `r.banco?.toLowerCase()`.

**Tipo de Pagamento**: lista dinâmica dos valores únicos nos comprovantes carregados, mesclada com lista estática de fallback (PIX, TED, DOC, Boleto, Cartão de Crédito, Cartão de Débito, Outro).

### Alterações no Contrato de API

**Nenhuma.** O endpoint `GET /api/receipts?startDate=&endDate=` permanece inalterado. Os novos filtros (banco, tipo, nome, valor) são aplicados client-side sobre o array retornado.

---

## Plano de Implementação

| Fase | Tarefa | Status |
|------|--------|--------|
| **1 — Estado** | Refatorar estado de filtros (`pendingFilters`/`appliedFilters` com `useSearchParams`) | ✅ |
| **1 — Estado** | Adicionar estado de UI (`filtersOpen`, `sortBy`, `visibleCount`) | ✅ |
| **2 — URL Sync** | `handleApply`, `removeFilter`, `handleClear`, `handleSortChange` | ✅ |
| **3 — FilterPanel** | Painel colapsável com animação CSS `grid-template-rows` | ✅ |
| **3 — FilterPanel** | Badges com remoção individual | ✅ |
| **3 — FilterPanel** | Input de valor com vírgula | ✅ |
| **4 — Lógica** | `filteredSorted` useMemo: todos os filtros + ordenação + slice | ✅ |
| **4 — Lógica** | Debounce 300ms no campo nome | ✅ |
| **5 — SortBar** | Dropdown "Ordenar por" com 6 opções + sync URL | ✅ |
| **6 — Paginação** | IntersectionObserver + sentinela + spinner + reset | ✅ |
| **7 — Responsivo** | Grid 2×2 no desktop, coluna única no mobile | ✅ |
| **8 — Bug Sidebar** | Corrigir `md:h-full` → `md:sticky md:top-0 md:h-screen` | ✅ |

**Único arquivo de feature modificado**: `client/src/pages/HistoryPage.jsx`
**Bug fix adicional**: `client/src/components/Sidebar.jsx`

---

## Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Performance com grande volume de dados (>500 registros) | Médio — useMemo recalcula a cada mudança de filtro | Baixa — app pessoal com volume limitado | Memoização correta; debounce de 300ms no nome evita recalculos excessivos |
| Dessincronização entre estado local e URL params | Médio — filtros aplicados não refletidos na URL ou vice-versa | Média | Centralizar todas as mutações de `appliedFilters` em funções (`handleApply`, `removeFilter`, `handleClear`) que sempre chamam `setSearchParams` junto |
| Reset de `visibleCount` esquecido ao mudar filtros | Médio — usuário vê contagem incorreta | Baixa | `useEffect` com dependência em `appliedFilters` e `sortBy` garante reset |
| IntersectionObserver disparado após desmontagem | Baixo — memory leak / warning no console | Baixa | Cleanup no `useEffect` de retorno (`observer.disconnect()`) |
| Tipos de pagamento dinâmicos ausentes em nova conta | Baixo — select vazio na primeira carga | Baixa | Combinar lista dinâmica com lista estática de fallback |
| Sidebar empurrando Perfil/Sair para fora do viewport | Alto — UX quebrada | **Resolvido** | `md:sticky md:top-0 md:h-screen` no `aside` |

---

## Estratégia de Testes

| Tipo | O que testar |
|------|-------------|
| **Manual — Filtros** | Cada filtro isolado filtra corretamente; combinações de filtros; remoção por badge; limpar tudo |
| **Manual — Ordenação** | Cada uma das 6 opções ordena corretamente |
| **Manual — Paginação** | Carga inicial de 10 itens; scroll até o fim adiciona 10 automaticamente; contador correto; reset ao mudar filtro |
| **Manual — Responsivo** | Painel colapsado no mobile; grid 2×2 no desktop; stack no mobile; botões acessíveis em toque |
| **Manual — Edge Cases** | Lista vazia com filtros ativos (mensagem de "nenhum resultado"); filtros sem correspondência; valor mín > valor máx |
| **Manual — URL** | Copiar URL com filtros ativos → abrir em nova aba → filtros restaurados corretamente; limpar filtros → URL limpa |
| **Manual — Animação** | Painel abre e fecha com transição suave (~300ms); sem salto de layout |
| **Manual — Sidebar** | Com painel de filtros aberto e lista longa, Perfil e Sair permanecem visíveis na sidebar desktop |

---

## Considerações de UX

- **Painel colapsado por padrão** em qualquer tamanho de tela, para não ocupar espaço desnecessário.
- **Animação suave** de 300ms ao abrir/fechar o painel via CSS `grid-template-rows`, sem dependências adicionais.
- **Badges sempre visíveis** no header colapsado, para que o usuário saiba quais filtros estão ativos sem expandir.
- **Data padrão = mês atual**: mantém o comportamento existente e evita carga desnecessária de todos os dados históricos.
- **Scroll automático** via `IntersectionObserver` para carregamento fluido sem necessidade de botão.
- **Input de valor em formato BR** (`50,00`): vírgula aceita nativamente; normalizada para ponto internamente antes da comparação.
- **Botão "Aplicar"** garante que o usuário controla quando a lista atualiza ao preencher múltiplos campos simultaneamente — evita re-renders intermediários. Exceção: campo `nome` aplica automaticamente com debounce.
- **URL compartilhável**: filtros ativos são refletidos na URL, permitindo bookmark e compartilhamento da consulta.

---

## Questões em Aberto

| # | Questão | Status |
|---|---------|--------|
| 1 | Usar `IntersectionObserver` para scroll infinito automático ou somente botão "Carregar mais"? | ✅ Resolvido — `IntersectionObserver` (scroll automático) |
| 2 | Persistir `filtersOpen` no `localStorage` para lembrar a preferência do usuário? | ✅ Resolvido — não persistir |
| 3 | O campo de valor aceita vírgula como separador decimal (padrão BR)? | ✅ Resolvido — aceita vírgula (`50,00`), normaliza para ponto internamente |
| 4 | Persistência de filtros via URL params? | ✅ Resolvido — persistência híbrida: URL search params como fonte de verdade persistida; estado local como espelho para a UI |
| 5 | Animação ao colapsar/expandir o painel de filtros? | ✅ Resolvido — CSS `grid-template-rows: 0fr → 1fr`, 300ms ease-in-out, sem bibliotecas externas |
