# TDD — Padronização de Exibição de Datas (dd/MM/yyyy)

| Campo           | Valor                                         |
|-----------------|-----------------------------------------------|
| Tech Lead       | @Tiago Vazzoller                              |
| Equipe          | Tiago Vazzoller                               |
| Status          | Draft                                         |
| Criado em       | 2026-04-07                                    |
| Última revisão  | 2026-04-07                                    |

---

## Contexto

O ReceipTV utiliza datas em dois contextos distintos: **transporte/persistência** (internamente,
entre frontend, URL params, API e banco de dados) e **exibição** (para o usuário final em tela
e em arquivos exportados).

O formato de transporte adotado é ISO 8601 (`yyyy-MM-dd`), pois é o formato nativo do
`<input type="date">` do HTML, do PostgreSQL e dos parâmetros de URL. Esse formato nunca
deve mudar.

O problema identificado é que o formato de transporte está vazando para as interfaces de
exibição, gerando inconsistência visual.

---

## Definição do Problema

### Problemas identificados

- **Badge de filtro ativo na HistoryPage**: o rótulo "Data: 2026-03-01 – 2026-04-30"
  exibe o formato ISO em vez de "01/03/2026 – 30/04/2026".
  - Local: `client/src/pages/HistoryPage.tsx`, linha 183.
  - Impacto: experiência inconsistente com o restante da UI, onde datas usam `dd/MM/yyyy`.

- **Seção "FILTROS APLICADOS" no PDF exportado**: a linha
  "Período: 2026-03-01 – 2026-04-30" exibe o formato ISO no documento gerado.
  - Local: `server/src/services/pdf-export.ts`, linha 55.
  - Impacto: documento entregue ao usuário com formato de data não padrão brasileiro.

- **Seção "FILTROS APLICADOS" no resumo do ZIP exportado**: mesma situação no arquivo
  `.txt` dentro do ZIP.
  - Local: `server/src/services/zip-export.ts`, linha 57.
  - Impacto: arquivo de resumo com formato inconsistente.

### Por que agora?

As exportações de histórico foram recentemente implementadas. A inconsistência é visível
imediatamente ao usuário ao usar filtros de data e exportar. Corrigir agora evita que o
padrão incorreto se prolifere para outras partes do sistema.

### Impacto de não resolver

- Usuários brasileiros recebem datas em formato internacional sem contexto.
- Novos desenvolvedores podem replicar o padrão errado (ausência de convenção documentada).

---

## Escopo

### ✅ Em escopo (V1)

- Definir o padrão de projeto: **transporte em `yyyy-MM-dd`, exibição em `dd/MM/yyyy`**.
- Corrigir o badge de filtro de data na HistoryPage.
- Corrigir o campo "Período" no PDF exportado (`pdf-export.ts`).
- Corrigir o campo "Período" no resumo do ZIP exportado (`zip-export.ts`).
- Criar / reutilizar helper de conversão no frontend (`client/src/utils/date-utils.ts`).
- Criar helper de conversão no backend (dentro de cada service que precisar ou em `server/src/utils/`).

### ❌ Fora de escopo (V1)

- Alterar o formato de transporte das datas na API (permanece `yyyy-MM-dd`).
- Alterar os inputs de data do formulário de filtros (HTML date input usa ISO nativamente).
- Internacionalização completa (locale switching).
- Validação de formato na entrada dos filtros.

---

## Padrão de Projeto (Decisão Arquitetural)

> **Regra:** datas são sempre armazenadas, transportadas e comparadas no formato ISO 8601
> (`yyyy-MM-dd`). Datas são sempre **exibidas** ao usuário no formato brasileiro `dd/MM/yyyy`.
> A conversão ocorre exclusivamente na camada de apresentação (componentes React e templates
> de exportação), nunca antes.

| Contexto                          | Formato       |
|-----------------------------------|---------------|
| `<input type="date">`             | `yyyy-MM-dd`  |
| URL search params (`useSearchParams`) | `yyyy-MM-dd` |
| Parâmetros de query da API        | `yyyy-MM-dd`  |
| Colunas `DATE` / `TIMESTAMP` no PostgreSQL | `yyyy-MM-dd` |
| Exibição em UI (badges, tabelas, cards) | `dd/MM/yyyy` |
| Exibição em PDF exportado         | `dd/MM/yyyy`  |
| Exibição em resumo `.txt` do ZIP  | `dd/MM/yyyy`  |

---

## Solução Técnica

### Visão geral

A conversão de `yyyy-MM-dd` → `dd/MM/yyyy` é uma operação puramente de apresentação.
Ela deve ocorrer apenas no momento em que o valor é inserido num texto visível ao usuário.
Nenhuma conversão deve modificar o estado interno dos filtros nem os valores enviados à API.

### Fluxo de dados

```
[HTML date input] ──yyyy-MM-dd──▶ [estado local + URL params]
                                          │
                                          ├──yyyy-MM-dd──▶ [API GET /receipts]
                                          │                       │
                                          │                  [PostgreSQL WHERE data_pagamento BETWEEN ...]
                                          │
                                          ├──yyyy-MM-dd──▶ [POST /receipts/export → filtros]
                                          │                       │
                                          │               [pdf-export / zip-export]
                                          │                       │
                                          │               formatISOToBR()  ◀── conversão aqui
                                          │                       │
                                          │               "Período: 01/03/2026 – 30/04/2026"
                                          │
                                          └──▶ [badge label] formatISOToBR() ◀── conversão aqui
                                                      │
                                               "Data: 01/03/2026 – 30/04/2026"
```

### Helper de conversão

**Assinatura (frontend e backend):**

```
formatISOToBR(dateStr: string | undefined): string
```

**Contrato:**
- Entrada: string no formato `yyyy-MM-dd` ou `undefined` / string vazia.
- Saída: string no formato `dd/MM/yyyy`, ou string vazia se entrada inválida/ausente.
- Não usa `new Date()` para evitar problemas de timezone (manipulação puramente textual via split/join).

**Exemplo de comportamento:**

| Entrada          | Saída          |
|------------------|----------------|
| `"2026-03-01"`   | `"01/03/2026"` |
| `"2026-04-30"`   | `"30/04/2026"` |
| `""`             | `""`           |
| `undefined`      | `""`           |

### Pontos de alteração

| Arquivo                                          | Linha | Alteração                                                                 |
|--------------------------------------------------|-------|---------------------------------------------------------------------------|
| `client/src/utils/date-utils.ts`                 | —     | Adicionar / expor `formatISOToBR`                                         |
| `client/src/pages/HistoryPage.tsx`               | 183   | Usar `formatISOToBR(appliedFilters.startDate)` e `...endDate` no label   |
| `server/src/services/pdf-export.ts`              | 55    | Converter `filtros.startDate` e `filtros.endDate` antes de interpolar     |
| `server/src/services/zip-export.ts`              | 57    | Converter `filtros.startDate` e `filtros.endDate` antes de interpolar     |

> O helper no backend pode ser definido localmente em cada service (uma linha) ou
> extraído para `server/src/utils/date-utils.ts` se outros services precisarem.

---

## Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Entrada com formato inesperado (ex: timestamp completo) | Baixo — exibe string malformada | Baixo — valores sempre vêm de `<input type="date">` | Helper retorna string vazia para entradas inválidas |
| Regressão nas queries SQL (conversão acidental do valor de transporte) | Alto — filtro de data quebrado | Baixo — conversão é exclusivamente na camada de exibição | Revisar que `appliedFilters.startDate` / `endDate` não são alterados |
| Proliferação de helpers duplicados (frontend e backend desalinhados) | Baixo | Médio | Este TDD define o contrato único; ambas as implementações devem seguir a mesma lógica |

---

## Plano de Implementação

| Fase | Tarefa | Arquivo | Status | Estimativa |
|------|--------|---------|--------|------------|
| 1 — Frontend | Adicionar `formatISOToBR` em `date-utils.ts` | `client/src/utils/date-utils.ts` | TODO | 10 min |
| 1 — Frontend | Aplicar helper no badge da HistoryPage | `client/src/pages/HistoryPage.tsx:183` | TODO | 5 min |
| 2 — Backend | Adicionar helper local ou em utils | `server/src/services/pdf-export.ts` | TODO | 10 min |
| 2 — Backend | Aplicar helper no PDF export | `server/src/services/pdf-export.ts:55` | TODO | 5 min |
| 2 — Backend | Aplicar helper no ZIP export | `server/src/services/zip-export.ts:57` | TODO | 5 min |
| 3 — Validação | Testar manualmente: selecionar filtro de data e verificar badge e exportações | — | TODO | 15 min |

**Estimativa total: ~50 min**

---

## Estratégia de Testes

| Tipo | Escopo | Cenário |
|------|--------|---------|
| Manual (smoke) | Badge de filtro | Selecionar período 01/03/2026 – 30/04/2026 e verificar que o badge exibe `01/03/2026 – 30/04/2026` |
| Manual (smoke) | PDF exportado | Exportar com filtro de data ativo e verificar seção "FILTROS APLICADOS" no PDF |
| Manual (smoke) | ZIP exportado | Exportar ZIP e abrir `resumo.txt`, verificar linha "Período:" |
| Manual (regressão) | Filtro funcional | Confirmar que os resultados filtrados são os mesmos antes e depois da mudança |
| Unit (opcional V2) | `formatISOToBR` | Testar helper com entradas válidas, vazias e indefinidas |

---

## Plano de Rollback

Esta mudança é de baixo risco e afeta apenas strings de exibição.

- Rollback imediato: reverter os 3-4 arquivos alterados para a versão anterior via `git revert` ou `git checkout`.
- Critério de rollback: qualquer quebra no funcionamento dos filtros de data (query SQL incorreta ou badge não renderizando).
- Nenhuma mudança de schema ou migração envolvida.

---

## Questões em Aberto

| # | Questão | Status |
|---|---------|--------|
| 1 | Extrair helper para `server/src/utils/date-utils.ts` ou manter local nos services? | 🟡 Decidir na implementação (preferência: local se apenas 2 uses, utils se ≥ 3) |
| 2 | Aplicar o mesmo padrão na exportação de email (se houver template com datas)? | 🔴 Verificar na implementação |
