# TDD — Migrar Exportação do Dashboard para @react-pdf/renderer

| Campo          | Valor                                      |
| -------------- | ------------------------------------------ |
| Tech Lead      | Tiago Reolon Vazzoller                     |
| Time           | Tiago Reolon Vazzoller                     |
| Status         | Draft                                      |
| Criado em      | 2026-04-01                                 |
| Última revisão | 2026-04-01                                 |

---

## Contexto

O ReceipTV possui um botão "Exportar PDF" na página de Dashboard (`/`) que gera um relatório visual com os KPIs e os três gráficos (por banco, por tipo de pagamento e volume mensal). A implementação atual (`client/src/utils/dashboard-pdf-export.js`) utiliza `html2canvas` para capturar os elementos do DOM como imagens e `jsPDF` para montar o documento final no browser.

Desde a migração para Tailwind CSS v4, o sistema de design passou a usar a função de cor `oklch()` por padrão em todos os tokens de cor. O `html2canvas` v1.x não suporta `oklch()` — ao tentar capturar elementos com essa função, as cores são renderizadas como transparente ou preta, corrompendo a aparência dos gráficos no PDF. Para contornar isso, foi implementado um hack que percorre todos os `<style>` do documento, converte manualmente cada valor `oklch()` para `rgb()` via Canvas API, captura o DOM e restaura os estilos originais. Essa abordagem é frágil, depende de internos do DOM e torna a manutenção complexa.

Os gráficos do Dashboard são componentes React puros em HTML/CSS (`SimpleBarChart`), sem canvas nativo nem SVG do Recharts, o que viabiliza a reimplementação dos gráficos diretamente como primitivos SVG do `@react-pdf/renderer`, eliminando completamente a necessidade de captura de DOM.

---

## Definição do Problema e Motivação

### Problemas que Estamos Resolvendo

- **Exportação com cores corrompidas**: O `html2canvas` v1.x não suporta `oklch()` (padrão do Tailwind v4). O hack atual de patch de estilos é frágil: qualquer mudança nos tokens de cor do Tailwind ou na estrutura do DOM pode re-introduzir o bug silenciosamente.
  - Impacto: PDF exportado com gráficos sem cor ou totalmente pretos — funcionalidade inutilizável.
- **Dependência de captura de DOM**: A abordagem atual exige que os elementos estejam renderizados e visíveis no DOM no momento da captura. Isso introduz restrições de timing, necessidade de ocultar o botão de exportar durante a captura e sensibilidade à escala de tela e zoom do browser.
  - Impacto: Comportamento inconsistente entre dispositivos e tamanhos de janela.
- **Bundle size desnecessário**: `html2canvas` (~300KB) e `jspdf` (~300KB) somam ~600KB de dependências carregadas sob demanda. `@react-pdf/renderer` cobre ambos os casos com uma única dependência e geração declarativa.
  - Impacto: Complexidade de dependências maior do que o necessário para a funcionalidade.

### Por Que Agora?

- A funcionalidade está quebrada em produção com Tailwind v4 — a migração é uma correção de bug, não uma melhoria opcional.
- Os gráficos (`SimpleBarChart`) são HTML/CSS puro sem SVG externo, tornando a reimplementação como primitivos react-pdf direta e de baixo risco.
- O padrão `@react-pdf/renderer` já é a abordagem adotada no mercado para geração de PDF no browser com React, e seu modelo declarativo é consistente com o restante da stack do projeto.

### Impacto de Não Resolver

- **Usuário**: Exportação de PDF do Dashboard permanece quebrada — usuário não consegue gerar relatório visual da Visão Geral.
- **Produto**: Funcionalidade anunciada não entrega o prometido; confiança no produto é reduzida.
- **Técnico**: O hack de oklch acumula dívida técnica e pode se tornar ainda mais difícil de manter com futuras atualizações do Tailwind.

---

## Escopo

### ✅ Em Escopo (V1)

- Substituir `html2canvas` + `jsPDF` por `@react-pdf/renderer` na exportação do Dashboard.
- Criar componente React `DashboardPDFDocument.jsx` que renderiza o PDF declarativamente com `@react-pdf/renderer`, contendo:
  - Cabeçalho com título e timestamp.
  - Seção de KPIs (Volume Total e Comprovantes Lidos) como texto nativo.
  - Três seções de gráficos (por banco, por tipo de pagamento, volume mensal) reimplementados como SVG nativo do react-pdf, usando os dados brutos já disponíveis no `DashboardPage`.
  - Rodapé paginado.
- Remover o arquivo `client/src/utils/dashboard-pdf-export.js` e todo o código de hack de oklch.
- Atualizar `DashboardPage.jsx` para usar `pdf(DashboardPDFDocument).toBlob()` e acionar o download.
- Remover as dependências `html2canvas` e `jspdf` do `client/package.json`.
- Adicionar a dependência `@react-pdf/renderer` ao `client/package.json`.
- Manter o mesmo nome de arquivo exportado: `receiptv-dashboard-YYYY-MM-DD.pdf`.
- Manter o botão desabilitado durante o loading de dados e durante a geração do PDF.

### ❌ Fora de Escopo (V1)

- Alteração no layout ou conteúdo visual do PDF exportado (mantém mesmo layout do TDD original).
- Exportação de outras páginas além do Dashboard.
- Adição de novos dados ou gráficos ao PDF.
- Geração de PDF no servidor (backend) para o Dashboard.
- Suporte a temas claro/escuro configurável no PDF.

### 🔮 Considerações Futuras (V2+)

- Adicionar miniatura ou logo do ReceipTV no cabeçalho do PDF.
- Opção de exportar em tema claro (fundo branco) para impressão em papel.

---

## Solução Técnica

### Visão Geral da Arquitetura

A geração do PDF passa a ser **totalmente declarativa no frontend** usando `@react-pdf/renderer`. Em vez de capturar o DOM renderizado como imagens, o componente `DashboardPDFDocument` recebe os dados brutos (summary, monthly) como props e constrói o documento PDF diretamente com primitivos tipados (`View`, `Text`, `Svg`, `Rect`, etc.).

```
Usuário clica em "Exportar PDF"
        ↓
DashboardPage chama pdf(<DashboardPDFDocument data={...} />).toBlob()
        ↓
@react-pdf/renderer monta o documento PDF em Web Worker
        ↓
Blob recebido → cria URL → aciona <a download> → revoga URL
```

**Componentes envolvidos:**

| Componente / Arquivo                         | Responsabilidade                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| `client/src/utils/DashboardPDFDocument.jsx`  | Componente react-pdf com o documento completo: cabeçalho, KPIs, gráficos, rodapé |
| `client/src/pages/DashboardPage.jsx`         | Aciona geração via `pdf().toBlob()`, gerencia estado de loading do export         |
| `client/src/utils/dashboard-pdf-export.js`  | **REMOVIDO** — substituído pelo componente acima                                  |

### Estrutura do Componente DashboardPDFDocument

O documento é um componente React que usa exclusivamente primitivos do `@react-pdf/renderer`:

- `Document`, `Page` — estrutura do documento PDF
- `View` — equivalente a `div` (layout flexbox)
- `Text` — texto renderizado no PDF
- `Svg`, `Rect`, `G` — gráficos de barras reimplementados como SVG nativo
- `StyleSheet.create()` — estilos declarativos (sem Tailwind, sem CSS externo)

**Props do componente:**

| Prop       | Tipo    | Descrição                                                              |
| ---------- | ------- | ---------------------------------------------------------------------- |
| `summary`  | Object  | Dados do endpoint `/api/reports/summary` (total, count, byBank, byType) |
| `monthly`  | Array   | Array de `{ label, total }` para o gráfico de volume mensal            |
| `userName` | String  | Nome do usuário logado, exibido no cabeçalho do PDF                    |

### Reimplementação dos Gráficos como SVG

O `SimpleBarChart` atual é HTML/CSS com barras de largura/altura calculadas em porcentagem. No `DashboardPDFDocument`, cada gráfico é reimplementado usando `<Svg>` + `<Rect>` do react-pdf:

**Gráfico vertical (byBank, byType):**
- Largura fixa da área SVG (ex: 480pt).
- Cada barra: `<Rect>` com altura proporcional ao valor máximo do dataset.
- Label abaixo de cada barra com `<Text>` dentro do `<Svg>`.
- Valor no topo de cada barra.

**Gráfico horizontal (monthly — volume mensal):**
- Barras horizontais com largura proporcional ao valor máximo.
- Label à esquerda, valor à direita.

O cálculo de proporção (`valor / max * escalaMax`) é feito em JavaScript puro antes de passar as dimensões para os elementos SVG — não há dependência de CSS ou DOM.

### Layout do PDF (mantido do TDD original)

```
┌─────────────────────────────────────────────────────┐
│  ReceipTV — Visão Geral          01/04/2026 10:32   │  ← Cabeçalho (fundo #16a34a)
│  João Silva                                         │  ← Nome do usuário logado
├──────────────────────┬──────────────────────────────┤
│  Volume Total        │  Comprovantes Lidos           │  ← KPI (texto nativo)
│  R$ 12.450,00        │  48                           │
├─────────────────────────────────────────────────────┤
│  Gastos por Banco                                    │  ← SVG nativo react-pdf
│  [gráfico de barras verticais]                       │
├─────────────────────────────────────────────────────┤
│  Gastos por Tipo de Pagamento                        │
│  [gráfico de barras verticais]                       │
├─────────────────────────────────────────────────────┤
│  Volume Mensal                                       │
│  [gráfico de barras horizontais]                     │
├─────────────────────────────────────────────────────┤
│  Gerado em 01/04/2026 às 10:32               Pág 1  │  ← Rodapé
└─────────────────────────────────────────────────────┘
```

**Regras visuais (mantidas):**
- Cabeçalho: fundo verde `#16a34a`, texto branco.
- KPIs: texto nativo, dois blocos lado a lado.
- Gráficos: SVG com barras em cor sólida `#16a34a` (react-pdf não suporta gradientes CSS).
- Rodapé: timestamp + número de página em cada página.
- Fonte: `Helvetica` (fonte built-in do react-pdf, sem necessidade de embed).

### Atualização do DashboardPage

O `DashboardPage.jsx` passa a:
1. Importar `pdf` de `@react-pdf/renderer` e `DashboardPDFDocument` via **dynamic import** para não impactar o bundle inicial.
2. Ao clicar em "Exportar PDF": chamar `pdf(<DashboardPDFDocument summary={summary} monthly={monthly} />).toBlob()`.
3. Criar um URL de objeto com o blob, acionar `<a download>`, revogar o URL.
4. Remover a `ref` do botão de exportar (não é mais necessária para ocultar o botão durante captura).

### Dependências

**Remover do `client/package.json`:**
```
html2canvas   ^1.x
jspdf         ^2.x
```

**Adicionar ao `client/package.json`:**
```
@react-pdf/renderer   ^4.x
```

---

## Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| `@react-pdf/renderer` usa Web Worker internamente — ambientes sem suporte a Worker podem falhar | Médio | Baixo | Browsers modernos suportam Web Workers; Vite/webpack bundlam corretamente. Testar no ambiente de produção antes de mergear. |
| Gráficos SVG reimplementados podem ter aparência ligeiramente diferente da tela | Baixo | Médio | O PDF não precisa ser pixel-perfect com a tela — validar que os dados estão corretos e o layout é legível. Ajustar dimensões SVG se necessário. |
| `@react-pdf/renderer` não suporta gradientes CSS — barras serão cor sólida | Baixo | Alto (certo) | Aceitar cor sólida verde `#16a34a` para barras no PDF. O gradiente é cosmético e não afeta a leitura do relatório. |
| Datasets com muitos itens (ex: 12 meses + 20 bancos) podem comprimir os gráficos | Médio | Médio | Todos os itens são exibidos (decisão tomada). Mitigação: calcular a largura/altura SVG dinamicamente em função do número de itens, garantindo largura mínima por barra. |
| Bundle de `@react-pdf/renderer` (~500KB) impacta performance inicial | Médio | Médio | Usar **dynamic import** — a lib só é carregada quando o usuário clica em "Exportar PDF". |
| Dados `null` ou vazios em `summary.byBank` / `summary.byType` podem causar erro no cálculo de proporção | Médio | Baixo | Validar e retornar componente vazio ("Sem dados") quando array estiver vazio ou undefined, espelhando o comportamento do `SimpleBarChart` atual. |

---

## Plano de Implementação

| Fase | Tarefa | Descrição | Status | Estimativa |
|------|--------|-----------|--------|------------|
| **1 — Dependências** | Remover html2canvas e jspdf | `npm uninstall html2canvas jspdf` em `client/` | TODO | 0,25h |
| **1 — Dependências** | Instalar @react-pdf/renderer | `npm install @react-pdf/renderer` em `client/` | TODO | 0,25h |
| **2 — Componente PDF** | Criar `DashboardPDFDocument.jsx` | Estrutura do documento: `Document`, `Page`, estilos, cabeçalho, KPIs, rodapé | TODO | 1h |
| **2 — Componente PDF** | Implementar gráfico vertical SVG | Função auxiliar que recebe array `{label, total}` e retorna `<Svg>` com barras verticais | TODO | 1,5h |
| **2 — Componente PDF** | Implementar gráfico horizontal SVG | Variante horizontal para o volume mensal | TODO | 1h |
| **3 — Integração** | Atualizar `DashboardPage.jsx` | Substituir chamada a `exportDashboardPDF` por `pdf().toBlob()` com dynamic import; ler `userName` do contexto de auth e passar como prop | TODO | 0,5h |
| **3 — Integração** | Remover `dashboard-pdf-export.js` | Deletar arquivo e remover import do `DashboardPage` | TODO | 0,25h |
| **4 — Testes manuais** | Testar export com dados reais | Verificar KPIs, gráficos com dados reais, paginação, rodapé | TODO | 1h |
| **4 — Testes manuais** | Testar edge cases | Dashboard sem dados (summary vazio), um único item em byBank, muitos meses | TODO | 0,5h |
| **4 — Testes manuais** | Testar no mobile | Verificar que o botão de export funciona em iOS Safari e Android Chrome | TODO | 0,5h |

**Estimativa total:** ~6,75 horas

---

## Estratégia de Testes

| Tipo | Escopo | Cenários |
|------|--------|----------|
| **Manual — Funcional** | Geração do PDF | Clicar em "Exportar PDF" com dados carregados; verificar que o download é acionado; abrir o PDF e validar conteúdo |
| **Manual — Dados** | Consistência | KPIs no PDF (Volume Total e Comprovantes Lidos) batem com os valores exibidos na tela |
| **Manual — Gráficos** | Renderização SVG | Os três gráficos aparecem no PDF com barras proporcionais aos dados; labels corretos; sem barras em branco ou zeradas |
| **Manual — Edge cases** | Dados ausentes | Exportar quando `byBank` ou `byType` está vazio — PDF deve renderizar seção sem gráfico com mensagem "Sem dados" |
| **Manual — Layout** | Legibilidade | Cabeçalho verde com texto branco; KPIs legíveis; rodapé com paginação em cada página |
| **Manual — Mobile** | Compatibilidade | Botão de export funciona em iOS Safari e Android Chrome; PDF é baixado ou aberto corretamente |
| **Manual — Loading** | Estado do botão | Botão exibe spinner durante geração; fica desabilitado; retorna ao estado normal após download |

---

## Alternativas Consideradas

| Opção | Prós | Contras | Por que não escolhida |
|-------|------|---------|----------------------|
| **@react-pdf/renderer** ✅ (escolhida) | Geração declarativa sem captura de DOM; sem dependência de oklch; gráficos como SVG nativo; API React familiar | Gráficos precisam ser reimplementados como SVG; sem gradientes CSS | ✅ Elimina o bug de oklch; modelo declarativo consistente com a stack |
| Manter html2canvas + patch oklch | Sem trabalho de reimplementação de gráficos | Hack frágil; depende de internos do DOM; qualidade de captura variável por dispositivo | O bug continua presente; hack pode quebrar com próximas atualizações do Tailwind |
| Atualizar html2canvas para v2.x (beta) | Potencialmente suportaria oklch | Versão beta, instável; API pode mudar; ainda captura DOM (frágil) | Instabilidade inaceitável para produção |
| Capturar gráficos como SVG (via `XMLSerializer`) + embed no jsPDF | Sem dependência de canvas; SVG fiel | jsPDF tem suporte limitado e bugado a SVG embutido; requer fallback para PNG | Suporte a SVG no jsPDF é instável e mal documentado |
| Gerar PDF no servidor (Node.js + PDFKit) | Totalmente independente do browser | Requer endpoint adicional; envia dados para o servidor só para gerar PDF; latência de rede | Sobrecarga desnecessária para um relatório que já tem todos os dados no cliente |

---

## Questões em Aberto

| # | Questão | Status |
|---|---------|--------|
| 1 | Limitar número máximo de itens exibidos nos gráficos do PDF (ex: top 10 por banco) ou exibir todos? | ✅ Decidido: exibir todos os itens, sem limite |
| 2 | Usar cor sólida `#16a34a` para barras (sem gradiente, limitação do react-pdf SVG) ou usar cor diferente? | ✅ Decidido: usar cor sólida `#16a34a` |
| 3 | O PDF do Dashboard deve incluir o nome do usuário logado no cabeçalho? | ✅ Decidido: sim, exibir o nome do usuário no cabeçalho |
