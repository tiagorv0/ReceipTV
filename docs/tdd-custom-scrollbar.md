# TDD - Scrollbar Customizada Global

| Campo          | Valor                        |
|----------------|------------------------------|
| Tech Lead      | Tiago Reolon Vazzoller       |
| Tipo           | Melhoria de UI / UX          |
| Status         | Aprovado                     |
| Criado em      | 2026-03-31                   |
| Última atualização | 2026-03-31               |

---

## Contexto

O ReceipTV é uma SPA React com tema dark (fundo `zinc-900`, acentos `green-500`). A navegação principal ocorre dentro de um elemento `<main>` com `overflow-y-auto` no componente `Layout.jsx`. Esse elemento é o único container de scroll da aplicação em desktop.

Em mobile, o scroll ocorre no `body` (via layout em coluna com `BottomNav` fixo).

---

## Definição do Problema

### Problemas identificados

- **Scrollbar nativa do OS aparece no tema escuro**: Ao expandir o painel de filtros na `HistoryPage`, o conteúdo ultrapassa a altura visível e o navegador exibe a barra de rolagem padrão do sistema operacional — branca/cinza clara no Windows — que contrasta visivelmente com o fundo `zinc-900`.
- **Inconsistência visual**: Qualquer página com conteúdo suficiente para causar scroll exibe o mesmo problema. O usuário percebe o "ruído" visual da scrollbar nativa saindo do sistema de design.
- **Sem padronização entre contextos de scroll**: O `<main>` usa `overflow-y-auto`, mas elementos internos com scroll próprio (futuras listas, modais) herdariam o mesmo problema.

### Por que agora?

A HistoryPage foi recentemente expandida com o painel de filtros colapsável, tornando o problema evidente. Corrigir agora, antes de adicionar mais páginas com conteúdo dinâmico, evita retrabalho futuro.

### Impacto de não resolver

- Usuário percebe inconsistência visual ao usar qualquer filtro ou ao visualizar listas longas.
- A identidade visual dark/green da aplicação é comprometida pela scrollbar do OS.

---

## Escopo

### ✅ Em Escopo (V1)

- Customização da scrollbar em **todos os elementos scrolláveis** da aplicação via CSS global (`index.css`)
- Suporte a **Chromium** (Chrome, Edge, Opera) via `::-webkit-scrollbar`
- Suporte a **Firefox** via `scrollbar-width` e `scrollbar-color`
- Paleta de cores alinhada ao tema: track `zinc-900`, thumb `zinc-700`, hover `zinc-600`
- Scrollbar fina (thin) para não competir com o conteúdo
- Aplicação no `<main>` do Layout e no `<body>` (para mobile e futuras páginas auth)

### ❌ Fora de Escopo (V1)

- Scrollbar animada ou com efeitos de gradiente
- Scrollbar customizada em elementos específicos com cores distintas (ex.: sidebar com cor diferente)
- Suporte a Safari iOS (não suporta `::webkit-scrollbar` de forma confiável — fallback é a scrollbar nativa fina via `scrollbar-width: thin`)

### 🔮 Futuro (V2+)

- Tokens CSS dedicados para scrollbar (`--scrollbar-thumb`, `--scrollbar-track`) permitindo theming por página

---

## Solução Técnica

### Abordagem

Adicionar regras CSS globais no arquivo `client/src/index.css` dentro do `@layer base`. A customização usa duas APIs distintas para cobertura de navegadores:

| API                              | Navegadores suportados            |
|----------------------------------|-----------------------------------|
| `scrollbar-width` + `scrollbar-color` | Firefox 64+, Chrome 121+     |
| `::-webkit-scrollbar` (pseudo-elementos) | Chrome, Edge, Opera, Safari desktop |

### Paleta de cores (alinhada ao Tailwind zinc)

| Elemento        | Cor Tailwind    | Hex       |
|-----------------|-----------------|-----------|
| Track (trilho)  | `zinc-900`      | `#18181b` |
| Thumb (indicador) | `zinc-700`    | `#3f3f46` |
| Thumb hover     | `zinc-600`      | `#52525b` |

A espessura escolhida é `thin` / `6px` — discreta o suficiente para não interferir no layout, mas presente quando necessário.

### Diagrama de aplicação

```
index.css (global)
  └── @layer base
        ├── * { scrollbar-width: thin; scrollbar-color: zinc-700 zinc-900 }   ← Firefox
        └── *::-webkit-scrollbar { width: 6px }                              ← Chromium
            *::-webkit-scrollbar-track { background: zinc-900 }
            *::-webkit-scrollbar-thumb { background: zinc-700; border-radius: 3px }
            *::-webkit-scrollbar-thumb:hover { background: zinc-600 }
```

### Elementos afetados

- `<main>` em `Layout.jsx` (`overflow-y-auto`) — scroll principal do app
- `<body>` — scroll em mobile e nas páginas auth (`/login`, `/register`)
- Qualquer elemento futuro com `overflow-y-auto` ou `overflow-y-scroll` herda automaticamente

### Sem alterações em componentes React

A solução é **puramente CSS**. Nenhum componente precisa ser alterado. A customização é aplicada globalmente e funciona por herança ou via seletor `*`.

---

## Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Safari iOS não renderizar customização | Baixo | Alto | Fallback natural: scrollbar nativa fina do iOS, que já é discreta e aceitável |
| `scrollbar-width: thin` no Firefox reduzir área clicável | Baixo | Baixo | Testar no Firefox; se necessário, usar `auto` apenas no Firefox |
| Conflito com componentes shadcn/ui que têm scroll próprio (ex.: ScrollArea) | Médio | Baixo | O componente `ScrollArea` do shadcn usa uma scrollbar emulada via CSS/JS separada — não é afetado pelas regras `::webkit-scrollbar` aplicadas ao elemento nativo |
| Thumb pouco visível em fundo muito escuro | Baixo | Baixo | Cores escolhidas (`zinc-700` sobre `zinc-900`) têm contraste suficiente para visibilidade sem chamar atenção desnecessária |

---

## Plano de Implementação

| Tarefa | Arquivo | Descrição | Estimativa |
|--------|---------|-----------|------------|
| Adicionar regras CSS globais | `client/src/index.css` | Inserir dentro de `@layer base` as regras `scrollbar-width`, `scrollbar-color` e `::webkit-scrollbar` | 15 min |
| Validar no Chrome/Edge | — | Abrir HistoryPage, expandir filtros, verificar scrollbar customizada | 5 min |
| Validar no Firefox | — | Confirmar `scrollbar-width: thin` aplicado | 5 min |
| Validar mobile (DevTools) | — | Confirmar que em viewport mobile a scrollbar não aparece (iOS overlay scrollbar) | 5 min |

**Estimativa total:** ~30 minutos

---

## Estratégia de Testes

| Cenário | Como testar |
|---------|-------------|
| Desktop Chrome: HistoryPage com filtros expandidos | Abrir filtros → scroll visível → thumb zinc-700 |
| Desktop Firefox: qualquer página com scroll | Barra fina e com cor customizada |
| Mobile (iOS/Android via DevTools): scroll em lista longa | Scrollbar overlay nativa fina — sem conflito visual |
| Página `/login`: `<body>` scroll em tela pequena | Scrollbar customizada ou overlay nativa sem cor branca |
| Componente shadcn `ScrollArea` (se usado no futuro) | Não afetado — usa emulação própria |

---

## Rollback

Por ser uma alteração puramente CSS em `index.css`, o rollback consiste em remover as regras adicionadas no `@layer base`. Sem impacto em banco de dados, API ou componentes React.

---

## Considerações Adicionais

- A propriedade `scrollbar-width: thin` foi adicionada ao padrão CSS Scrollbars Level 1 e tem boa cobertura: Firefox 64+, Chrome 121+, Edge 121+.
- A API `::-webkit-scrollbar` não é padrão (prefixo `-webkit-`), porém é suportada por todos os navegadores Chromium e Safari desktop.
- A combinação das duas abordagens garante cobertura em **>95% dos browsers modernos** usados em desktop.
