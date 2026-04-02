# TDD — Exportar Histórico em PDF

| Campo          | Valor                                      |
| -------------- | ------------------------------------------ |
| Tech Lead      | Tiago Reolon Vazzoller                     |
| Time           | Tiago Reolon Vazzoller                     |
| Status         | Draft                                      |
| Criado em      | 2026-04-01                                 |
| Última revisão | 2026-04-01                                 |

---

## Contexto

O ReceipTV permite que o usuário visualize e filtre seus comprovantes de pagamento na página de Histórico (`/history`). Atualmente, a única forma de compartilhar um comprovante individual é via WhatsApp (botão por card).

Não existe nenhuma forma de exportar **uma seleção filtrada** de comprovantes como um documento consolidado, o que força os usuários a realizarem capturas de tela, seleções manuais ou exportações externas quando precisam de um relatório em papel ou PDF para fins de controle financeiro, prestação de contas ou comprovação junto a terceiros.

Os arquivos originais dos comprovantes já estão armazenados como `BYTEA` no banco de dados, o que viabiliza a inclusão dos arquivos físicos no export sem necessidade de novas estruturas de dados.

---

## Definição do Problema e Motivação

### Problemas que Estamos Resolvendo

- **Sem relatório consolidado exportável**: O usuário não consegue obter uma listagem de comprovantes filtrada em formato portátil. Para apresentar um extrato de pagamentos a um contador ou gestor financeiro, precisa recorrer a soluções manuais.
  - Impacto: Atrito elevado para casos de uso comuns de controle financeiro.
- **Compartilhamento limitado a comprovantes individuais**: A funcionalidade de WhatsApp envia um único comprovante por vez. Não cobre o cenário de "quero enviar todos os pagamentos de março".
  - Impacto: Fluxo de trabalho ineficiente quando existem múltiplos registros.
- **Arquivos originais inacessíveis em lote**: Os arquivos dos comprovantes existem no banco mas só podem ser obtidos um a um via `GET /receipts/:id/file`.
  - Impacto: Impossível baixar todos os arquivos de um período sem múltiplas requisições manuais.

### Por Que Agora?

- A estrutura de filtros do `HistoryPage` já está consolidada, tornando o conjunto de dados a exportar bem definido.
- Os arquivos originais já estão no banco (`arquivo_data` como `BYTEA`), eliminando trabalho adicional de armazenamento.
- O layout de relatório em PDF e o compartilhamento em lote são uma expectativa natural após a adição de filtros avançados.

### Impacto de Não Resolver

- **Usuário**: Experiência incompleta para casos de uso financeiros reais; possível abandono da ferramenta em favor de planilhas.
- **Produto**: Funcionalidade de filtros perde parte do seu valor percebido sem saída exportável.

---

## Escopo

### ✅ Em Escopo (V1)

- Botão "Exportar" visível na barra de ações do `HistoryPage`, ativo apenas quando há registros filtrados (`total > 0`).
- **Geração de PDF no servidor (backend)**: nova rota `POST /api/receipts/export` que recebe os filtros, consulta o banco, gera o PDF com PDFKit e retorna o arquivo.
- O PDF exporta **todos** os registros do resultado filtrado atual — sem limite de paginação.
- Layout do PDF diferente da tela: formato de relatório em tabela, com cabeçalho de documento, sumário de filtros aplicados e rodapé paginado.
- **Inclusão opcional dos arquivos de comprovante como ZIP**: opção "Baixar arquivos originais (.zip)" que gera um arquivo ZIP contendo os comprovantes individuais (PDF/imagem) de cada registro do resultado filtrado.
- **Compartilhamento via WhatsApp**: o PDF gerado pelo servidor é recebido como blob pelo frontend e compartilhado via Web Share API (mesmo padrão do `shareWA` existente) ou via link `wa.me`.
- **Envio por e-mail**: opção de informar um endereço de e-mail; o backend gera o PDF e o envia como anexo via Nodemailer.
- Nome do arquivo gerado automaticamente com data (`receiptv-historico-YYYY-MM-DD.pdf` / `receiptv-historico-YYYY-MM-DD.zip`).
- **Exportação do Dashboard em PDF (frontend)**: botão "Exportar PDF" no `DashboardPage` que captura os gráficos e KPIs via `html2canvas` e monta o PDF com `jsPDF` no browser. Layout de relatório visual com os cards de KPI e os três gráficos (por banco, por tipo, volume mensal).

### ❌ Fora de Escopo (V1)

- Exportação em outros formatos (CSV, Excel, XLSX).
- Exportação de outras páginas além de Histórico e Dashboard.
- Agendamento ou envio automático recorrente do relatório por e-mail.
- Seleção manual de quais registros incluir no export (exporta o resultado filtrado completo).
- Inclusão dos arquivos originais embutidos dentro do PDF (PDF com anexos nativos) — os arquivos são entregues separadamente via ZIP.

### 🔮 Considerações Futuras (V2+)

- Exportação em CSV/Excel para integração com ferramentas financeiras.
- PDF com miniaturas dos comprovantes embutidas nas linhas da tabela.
- Envio automático agendado (ex: relatório mensal por e-mail no dia 1º).

---

## Solução Técnica

### Visão Geral da Arquitetura

A geração do PDF e do ZIP é feita **no servidor**. O frontend envia os filtros ativos para a nova rota de export; o backend consulta o banco, monta o documento/arquivo e retorna o binário. O frontend recebe o blob e aciona o download ou compartilhamento.

```
Usuário clica em "Exportar" → escolhe formato (PDF / ZIP / E-mail)
        ↓
Frontend coleta appliedFilters + sortBy + opções de entrega
        ↓
POST /api/receipts/export  { filtros, formato, delivery }
        ↓
Backend: consulta receipts no DB com os filtros
        ↓
        ├─ formato=pdf  → PDFKit monta relatório → retorna buffer PDF
        ├─ formato=zip  → archiver empacota arquivos originais → retorna buffer ZIP
        └─ delivery=email → PDFKit → Nodemailer envia anexo → retorna 200 OK
        ↓
Frontend:
  ├─ download    → cria blob URL e aciona <a download>
  ├─ whatsapp    → Web Share API com File(blob) ou fallback wa.me
  └─ email       → exibe confirmação de envio
```

**Componentes envolvidos:**

| Componente / Arquivo                        | Responsabilidade                                                                 |
| ------------------------------------------- | -------------------------------------------------------------------------------- |
| `client/src/pages/HistoryPage.jsx`          | Renderiza botão/modal de export; chama serviço de export com filtros ativos      |
| `client/src/pages/DashboardPage.jsx`        | Renderiza botão "Exportar PDF"; aciona captura dos elementos e download          |
| `client/src/utils/dashboard-pdf-export.js` | Lógica de captura com html2canvas + montagem do PDF com jsPDF (novo utilitário)  |
| `client/src/api/services.js`                | Nova função `exportReceipts(params)` — POST com `responseType: 'blob'`           |
| `server/routes/receipts.js`                 | Nova rota `POST /receipts/export` protegida por `auth`                           |
| `server/services/pdf-export.js`             | Serviço de geração de PDF com PDFKit (novo arquivo)                              |
| `server/services/zip-export.js`             | Serviço de empacotamento ZIP com archiver (novo arquivo)                         |
| `server/services/mailer.js`                 | Serviço de envio de e-mail com Nodemailer (novo arquivo ou existente)            |
| `pdfkit`                                    | Geração do PDF do Histórico no Node.js                                           |
| `archiver`                                  | Empacotamento ZIP no Node.js                                                     |
| `nodemailer`                                | Envio de e-mail com anexo                                                        |
| `html2canvas`                               | Captura dos gráficos e cards do Dashboard como imagem no browser                 |
| `jspdf`                                     | Montagem do PDF do Dashboard no browser                                          |

### Contrato da Nova Rota

**Endpoint:** `POST /api/receipts/export`  
**Auth:** JWT obrigatório (middleware `auth`)

**Request Body:**

```json
{
  "formato": "pdf" | "zip",
  "delivery": "download" | "whatsapp" | "email",
  "email": "usuario@email.com",
  "filtros": {
    "startDate": "2026-03-01",
    "endDate":   "2026-03-31",
    "nome":          "João",
    "banco":         "nubank",
    "tipoPagamento": "PIX",
    "valorMin":      "50",
    "valorMax":      "500",
    "sortBy":        "date_desc"
  }
}
```

| Campo        | Obrigatório | Descrição                                                   |
| ------------ | ----------- | ----------------------------------------------------------- |
| `formato`    | Sim         | `"pdf"` (relatório) ou `"zip"` (arquivos originais)        |
| `delivery`   | Sim         | `"download"` retorna o blob; `"email"` envia e retorna 200 |
| `email`      | Condicional | Obrigatório quando `delivery === "email"`                   |
| `filtros`    | Sim         | Mesmos filtros usados na tela; todos os campos opcionais    |

**Responses:**

```
// delivery = "download" ou "whatsapp"
200 OK
Content-Type: application/pdf  (ou application/zip)
Content-Disposition: attachment; filename="receiptv-historico-2026-03.pdf"
[binary body]

// delivery = "email"
200 OK
{ "message": "Relatório enviado para usuario@email.com" }

// Sem resultados para os filtros
422 Unprocessable Entity
{ "error": "Nenhum comprovante encontrado para os filtros informados." }
```

### Lógica de Filtragem no Backend

A rota de export replica a lógica de filtragem atualmente feita no frontend, aplicando-a diretamente na query SQL para evitar buscar registros desnecessários:

| Filtro          | Cláusula SQL                                   |
| --------------- | ---------------------------------------------- |
| `startDate`     | `data_pagamento >= $n`                         |
| `endDate`       | `data_pagamento <= $n`                         |
| `nome`          | `LOWER(nome) LIKE LOWER('%$n%')`               |
| `banco`         | `LOWER(banco) = LOWER($n)`                     |
| `tipoPagamento` | `LOWER(tipo_pagamento) = LOWER($n)`            |
| `valorMin`      | `valor >= $n`                                  |
| `valorMax`      | `valor <= $n`                                  |
| `sortBy`        | `ORDER BY` mapeado para coluna + direção       |

Para o formato `"zip"`, a query inclui `arquivo_data` e `arquivo_mimetype`. Para `"pdf"`, esses campos são omitidos da seleção para não transferir blobs desnecessariamente.

### Layout do PDF (diferente da tela)

O PDF tem formato de **relatório financeiro**, não de lista de cards.

```
┌─────────────────────────────────────────────────────┐
│  ReceipTV                        01/04/2026 10:32   │  ← Cabeçalho (fundo #16a34a)
│  Relatório de Comprovantes                           │
├─────────────────────────────────────────────────────┤
│  FILTROS APLICADOS                                   │  ← Bloco de sumário
│  Período: 01/03/2026 – 31/03/2026                   │
│  Banco: Nubank  |  Tipo: PIX  |  Valor: até R$ 500  │
│  Total: 12 registros   Valor total: R$ 3.450,00      │
├────┬────────────┬─────────────────┬────────┬────────┬──────────┤
│  # │  Data      │  Beneficiário   │  Banco │  Tipo  │  Valor   │  ← Tabela
├────┼────────────┼─────────────────┼────────┼────────┼──────────┤
│  1 │ 05/03/2026 │ João Silva      │ Nubank │  PIX   │ R$ 150   │
│  2 │ ...        │ ...             │ ...    │ ...    │ ...      │
├─────────────────────────────────────────────────────────────────┤
│  Gerado em 01/04/2026 às 10:32                     Pág 1 / 2  │  ← Rodapé
└─────────────────────────────────────────────────────────────────┘
```

**Colunas da tabela:**

| # | Data | Beneficiário | Banco | Tipo de Pagamento | Valor |
|---|------|--------------|-------|-------------------|-------|

**Regras visuais:**

- Cabeçalho: fundo verde escuro (`#16a34a`), texto branco.
- Linhas da tabela: alternadas (branco / cinza claro) para legibilidade em papel.
- Coluna "Valor": alinhada à direita, em negrito.
- Rodapé: número de página + timestamp em cada página.
- Fonte: `Helvetica` (embutida no PDFKit).

### Estrutura do ZIP

Quando `formato === "zip"`, o arquivo gerado contém:

```
receiptv-historico-2026-03.zip
├── resumo.txt              ← sumário dos filtros e totais em texto plano
├── 001_2026-03-05_joao-silva.pdf
├── 002_2026-03-08_maria-santos.jpg
└── ...
```

Nomenclatura dos arquivos: `{sequencial}_{data}_{nome-normalizado}.{extensao}`.

### UI de Export (HistoryPage)

- **Botão "Exportar"**: localizado na barra entre os stats e o painel de filtros, ao lado direito. Ícone: `Download` (lucide-react). Desabilitado quando `total === 0`.
- Ao clicar: abre um pequeno **popover/dropdown** com as opções de entrega:
  - `Baixar PDF` — download direto
  - `Baixar arquivos (.zip)` — ZIP com comprovantes originais
  - `Enviar por WhatsApp` — gera PDF e compartilha via Web Share API
  - `Enviar por E-mail` — abre um campo inline para digitar o e-mail e confirmar
- **Feedback de loading**: botão mostra spinner enquanto aguarda resposta do servidor.
- Responsivo: visível e funcional em mobile e desktop.

### Dependências a Instalar

**Backend (`server/`):**

```
pdfkit      ^0.x    — geração de PDF do Histórico no Node.js
archiver    ^7.x    — empacotamento ZIP em stream
nodemailer  ^6.x    — envio de e-mail
```

**Frontend (`client/`):**

```
html2canvas ^1.x    — captura de elementos DOM como canvas (gráficos do Dashboard)
jspdf       ^2.x    — montagem do PDF do Dashboard no browser
```

Ambas as dependências de frontend devem ser carregadas via **dynamic import** para não impactar o bundle inicial.

### Layout do PDF do Dashboard (frontend)

O PDF do Dashboard tem formato de **relatório visual**, preservando os gráficos como imagens capturadas.

```
┌─────────────────────────────────────────────────────┐
│  ReceipTV — Visão Geral          01/04/2026 10:32   │  ← Cabeçalho (fundo #16a34a)
├──────────────────────┬──────────────────────────────┤
│  Volume Total        │  Comprovantes Lidos           │  ← KPI cards (texto)
│  R$ 12.450,00        │  48                           │
├─────────────────────────────────────────────────────┤
│  Gastos por Banco                                    │  ← Captura html2canvas
│  [imagem do gráfico de barras]                       │
├─────────────────────────────────────────────────────┤
│  Gastos por Tipo                                     │
│  [imagem do gráfico de barras]                       │
├─────────────────────────────────────────────────────┤
│  Volume Mensal                                       │
│  [imagem do gráfico horizontal]                      │
├─────────────────────────────────────────────────────┤
│  Gerado em 01/04/2026 às 10:32               Pág 1  │  ← Rodapé
└─────────────────────────────────────────────────────┘
```

**Regras visuais:**
- KPI cards renderizados como texto nativo no PDF (não capturados como imagem) para fidelidade de leitura.
- Cada gráfico é capturado individualmente com `html2canvas` e embutido como imagem no PDF.
- O tema escuro dos gráficos é preservado na captura (a captura reflete o que está na tela).
- Botão de exportar fica oculto durante a captura (`display: none` temporário) para não aparecer no PDF.

**Estratégia de captura:**
1. Ocultar botão de exportar.
2. Capturar cada `<section>` de gráfico separadamente com `html2canvas`.
3. Restaurar botão.
4. Montar PDF com jsPDF: cabeçalho + KPI em texto + imagens dos gráficos.
5. Acionar download.

---

## Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Timeout da requisição para filtros com muitos registros + arquivos grandes (ZIP) | Alto | Médio | Implementar geração em stream (`pipe` para `res`); definir timeout de 60s no servidor para essa rota |
| Usuário sem arquivo cadastrado em algum comprovante (campo `arquivo_data` null) | Médio | Médio | Omitir silenciosamente os registros sem arquivo no ZIP; mencionar no `resumo.txt` |
| Credenciais SMTP não configuradas ao usar envio por e-mail | Alto | Médio | Verificar variável `SMTP_*` na inicialização; retornar erro 503 com mensagem clara se não configurado |
| Caracteres especiais em nomes de arquivo corrompem o ZIP em alguns SOs | Baixo | Médio | Normalizar nomes de arquivo (remover acentos, substituir espaços por hífens) antes de adicionar ao ZIP |
| Memória insuficiente ao gerar ZIP com muitos arquivos grandes | Alto | Baixo | Usar streams do archiver em vez de bufferizar tudo em memória; definir limite máximo de registros por export (ex: 500) |
| Web Share API não disponível em desktop (não suporta compartilhamento de arquivos) | Baixo | Alto (desktop) | Fallback para download automático + link `wa.me` com texto no desktop |
| html2canvas não captura gráficos SVG/Canvas do Recharts corretamente | Médio | Médio | Testar captura de cada componente de gráfico; usar `useCORS: true` e `scale: 2` para boa resolução; ajustar se necessário |
| Gráficos do Dashboard ainda em estado de loading ao acionar export | Médio | Baixo | Botão de export do Dashboard só é habilitado após `loading === false` |
| Bundle size do jsPDF + html2canvas (~600KB) impacta performance | Médio | Médio | Importar ambas as bibliotecas via dynamic import — só carregam quando o botão é clicado |

---

## Plano de Implementação

| Fase | Tarefa | Descrição | Status | Estimativa |
|------|--------|-----------|--------|------------|
| **1 — Backend: deps** | Instalar pdfkit, archiver, nodemailer | `npm install pdfkit archiver nodemailer` em `server/` | TODO | 0,5h |
| **2 — Backend: PDF** | Criar `server/services/pdf-export.js` | Serviço que recebe array de receipts + filtros e retorna stream PDFKit com layout de relatório | TODO | 4h |
| **3 — Backend: ZIP** | Criar `server/services/zip-export.js` | Serviço que recebe registros com `arquivo_data` e retorna stream ZIP via archiver | TODO | 2h |
| **4 — Backend: E-mail** | Criar `server/services/mailer.js` | Nodemailer transport configurável via env vars; método `sendExportEmail(to, pdfBuffer)` | TODO | 2h |
| **5 — Backend: Rota** | Criar rota `POST /receipts/export` | Validação de input, filtragem SQL, despacho para o serviço correto, streaming da resposta | TODO | 3h |
| **5 — Backend: Rota** | Adicionar variáveis de ambiente SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` em `server/.env` | TODO | 0,5h |
| **5 — Backend: Rota** | Documentar rota no Swagger | JSDoc da nova rota `POST /receipts/export` | TODO | 0,5h |
| **6 — Frontend: Service** | Adicionar `exportReceipts(params)` em `services.js` | POST com `responseType: 'blob'` para download; POST normal para e-mail | TODO | 0,5h |
| **7 — Frontend: UI** | Adicionar botão + dropdown de opções ao HistoryPage | Opções: baixar PDF, baixar ZIP, WhatsApp, e-mail | TODO | 2h |
| **7 — Frontend: UI** | Implementar campo inline de e-mail | Input + botão "Enviar" exibido ao selecionar opção de e-mail | TODO | 1h |
| **7 — Frontend: UI** | Lógica de download de blob | Criar blob URL, acionar `<a download>`, revogar URL | TODO | 0,5h |
| **7 — Frontend: UI** | Lógica de compartilhamento WhatsApp | Web Share API com fallback para `wa.me` no desktop | TODO | 1h |
| **8 — Dashboard: deps** | Instalar html2canvas + jsPDF | `npm install html2canvas jspdf` em `client/` | TODO | 0,5h |
| **9 — Dashboard: utilitário** | Criar `src/utils/dashboard-pdf-export.js` | Captura com html2canvas, monta PDF com jsPDF, KPIs em texto + gráficos como imagem | TODO | 3h |
| **9 — Dashboard: UI** | Adicionar botão "Exportar PDF" ao DashboardPage | Desabilitado durante loading; oculto na captura; dynamic import das libs | TODO | 1h |
| **10 — Testes manuais** | Testar PDF do Histórico com diferentes filtros | Verificar sumário, dados, totais, paginação | TODO | 1h |
| **10 — Testes manuais** | Testar ZIP com e sem arquivos | Verificar compressão, nomenclatura, `resumo.txt` | TODO | 1h |
| **10 — Testes manuais** | Testar envio por e-mail | Verificar recebimento com anexo PDF | TODO | 0,5h |
| **10 — Testes manuais** | Testar WhatsApp mobile | iOS Safari + Android Chrome: Web Share API com arquivo | TODO | 0,5h |
| **10 — Testes manuais** | Testar PDF do Dashboard | Verificar captura correta dos 3 gráficos; KPIs legíveis; resolução adequada | TODO | 1h |

**Estimativa total:** ~27 horas

---

## Estratégia de Testes

| Tipo | Escopo | Cenários |
|------|--------|----------|
| **Manual — Funcional** | Download de PDF | Com filtros ativos; sem filtros; 1 registro; 100+ registros; filtros sem resultado (deve retornar 422) |
| **Manual — Funcional** | Download de ZIP | Comprovantes com arquivo; comprovantes sem arquivo (devem ser omitidos); verificar `resumo.txt` |
| **Manual — Funcional** | Envio por e-mail | E-mail recebido com anexo PDF; e-mail inválido retorna erro; SMTP não configurado retorna 503 |
| **Manual — Funcional** | WhatsApp | Mobile: Web Share API abre app com arquivo; Desktop: fallback para `wa.me` com texto |
| **Manual — Layout** | Verificação visual do PDF | Cabeçalho correto; sumário de filtros reflete estado da tela; colunas alinhadas; rodapé com paginação |
| **Manual — Dados** | Consistência | Valor total no PDF bate com o exibido na tela; registros correspondem exatamente ao filtrado |
| **Manual — Segurança** | Isolamento de dados | Usuário A não consegue exportar dados do usuário B (auth middleware + `user_id` na query) |
| **Manual — Edge cases** | Casos extremos | Nomes com acentos/cedilha no PDF; nome de arquivo ZIP com caracteres especiais; descrição longa não quebra layout |
| **Manual — Dashboard PDF** | Captura dos gráficos | Três gráficos capturados corretamente; KPIs com valores corretos; botão ausente na captura; resolução adequada para impressão |

---

## Alternativas Consideradas

| Opção | Prós | Contras | Por que não escolhida |
|-------|------|---------|----------------------|
| **Histórico — server-side (PDFKit)** ✅ (escolhida) | Acesso direto ao DB para filtrar; permite incluir arquivos originais no ZIP; possibilita envio de e-mail com anexo; sem impacto no bundle do frontend | Requer nova rota de API e dependências no servidor; latência de rede para retornar o arquivo | ✅ Única abordagem que viabiliza ZIP com arquivos do DB e envio de e-mail |
| Histórico — jsPDF + autoTable (cliente) | Sem chamada de API; geração instantânea | Sem acesso aos arquivos originais do DB; sem envio de e-mail nativo; bundle +300KB | Não atende os requisitos de ZIP com arquivos e e-mail |
| CSS `@media print` + `window.print()` | Zero dependências | Sem controle de layout; sem ZIP; sem e-mail; resultado depende das configurações do browser | Não atende nenhum dos requisitos |
| Puppeteer (HTML→PDF) | Layout idêntico ao HTML; fontes avançadas | Dependência pesada (~300MB); tempo de inicialização; custo de memória em servidor pequeno | Overhead desproporcional; PDFKit é suficiente para layout tabular |
| **Dashboard — html2canvas + jsPDF (cliente)** ✅ (escolhida) | Captura fiel dos gráficos Recharts já renderizados; sem re-implementação de lógica de dados; zero chamada de servidor extra | Qualidade da imagem depende da escala da tela; captura SVG pode exigir ajustes | ✅ Único método que captura gráficos interativos sem re-renderizá-los no servidor |
| Dashboard — servidor renderiza dados em PDF (sem gráficos) | Independente do DOM | Perde os gráficos visuais; exige re-implementar agregações no backend | Elimina o principal valor do Dashboard |

---

## Questões em Aberto

| # | Questão | Status |
|---|---------|--------|
| 1 | Exibir o nome do usuário logado no cabeçalho do relatório PDF? | 🔴 Aberto |
| 2 | Incluir a coluna "Descrição" na tabela do PDF (pode ficar apertado em papel A4)? | 🔴 Aberto |
| 3 | Qual provedor SMTP usar para o envio de e-mail? (Nodemailer + SMTP próprio, Resend, SendGrid?) | 🔴 Aberto |
| 4 | Definir limite máximo de registros por export para evitar sobrecarga de memória no servidor (sugestão: 500)? | 🔴 Aberto |
| 5 | Exportar apenas os registros filtrados ou todos os filtrados? | ✅ Decidido: todos os filtrados |
| 6 | O PDF do Dashboard deve capturar o estado atual da tela (tema escuro) ou renderizar em tema claro para impressão? | 🔴 Aberto |
