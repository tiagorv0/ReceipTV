# TDD — Lançamento Manual de Comprovantes

| Campo           | Valor                                          |
|-----------------|------------------------------------------------|
| Tech Lead       | Tiago Vazzoller                                |
| Status          | Draft                                          |
| Criado em       | 2026-03-24                                     |
| Última atualização | 2026-03-24                                  |

---

## Contexto

O **ReceipTV** é um gerenciador financeiro de comprovantes com extração de dados via IA (Groq/Llama-4-Scout). Atualmente, a única forma de registrar um comprovante é enviando o arquivo para análise automática pela IA, que extrai campos como beneficiário, valor, data, banco e tipo de pagamento.

Embora a análise por IA seja o diferencial do produto, há cenários em que o usuário precisa registrar um comprovante sem depender da IA: arquivos com baixa qualidade, comprovantes em papel, situações offline, ou simplesmente preferência por controle manual dos dados.

---

## Definição do Problema

### Problemas que estamos resolvendo

- **Sem opção manual**: O usuário é forçado a usar a IA mesmo quando o arquivo não é legível ou quando prefere inserir os dados diretamente.
- **Taxa de falha da IA**: Comprovantes com baixa qualidade de imagem ou layouts incomuns geram erros na extração, bloqueando o registro.
- **Ausência de visualizador**: Ao fazer upload de um arquivo, o usuário não tem pré-visualização — ele envia "às cegas".

### Por que agora?

- É um requisito solicitado diretamente pelo usuário do produto.
- Completa o fluxo de registro e torna o produto utilizável em 100% dos cenários.

### Impacto de não resolver

- **Usuário**: Incapaz de registrar comprovantes quando a IA falha. Experiência bloqueada.
- **Produto**: Funcionalidade core incompleta — o app não serve para todos os casos de uso prometidos.

---

## Escopo

### ✅ Em Escopo (V1)

- Toggle visual no topo da página de upload para alternar entre **"Analisar por IA"** e **"Lançar Manualmente"**
- Formulário de lançamento manual com os campos:
  - Arquivo do comprovante (opcional)
  - Data de pagamento
  - Tipo de pagamento
  - Nome de quem recebeu o pagamento
  - Valor (R$)
  - Banco
  - Descrição (campo livre)
- Pré-visualizador do arquivo selecionado ao lado do formulário (imagens e PDF)
- Novo endpoint no backend: `POST /api/receipts/manual`
- Dados salvos na mesma tabela `receipts` existente

### ❌ Fora do Escopo (V1)

- Edição de comprovantes já registrados
- Validação de CPF/CNPJ do beneficiário
- OCR parcial (pré-preencher o formulário a partir do arquivo)
- Múltiplos arquivos por comprovante

### 🔮 Considerações Futuras (V2+)

- Modo híbrido: enviar arquivo para IA e permitir edição dos dados extraídos antes de salvar
- Importação em lote via CSV

---

## Solução Técnica

### Visão Geral da Arquitetura

O toggle na tela de upload controla qual modo está ativo. No modo manual, o layout divide-se em dois painéis: formulário (esquerda) e visualizador de arquivo (direita). Ao submeter, o frontend chama o novo endpoint `POST /api/receipts/manual`, que persiste os dados diretamente sem chamar a IA.

```
Usuário
  │
  ├─ [Tab: Analisar por IA]  →  Fluxo existente (POST /receipts/analyze)
  │
  └─ [Tab: Lançar Manualmente]
       │
       ├─ Preenche formulário + seleciona arquivo (opcional)
       │
       └─ POST /api/receipts/manual  →  Salva em receipts (sem IA)
```

### Fluxo de Dados — Lançamento Manual

1. Usuário acessa `/upload` e clica em **"Lançar Manualmente"**
2. O toggle alterna o layout para o formulário + visualizador
3. Usuário seleciona o arquivo (opcional) → visualizador exibe pré-view
4. Usuário preenche os campos obrigatórios e clica em **"Salvar Comprovante"**
5. Frontend envia `multipart/form-data` para `POST /api/receipts/manual`
6. Backend valida campos, persiste na tabela `receipts` e retorna o registro criado
7. Frontend exibe confirmação de sucesso

### APIs e Endpoints

#### Novo endpoint

| Endpoint                  | Método | Descrição                    |
|---------------------------|--------|------------------------------|
| `/api/receipts/manual`    | POST   | Registra comprovante manual  |

**Request** — `multipart/form-data`:

```json
{
  "nome": "Supermercado XYZ",
  "valor": 190.80,
  "data_pagamento": "2024-01-01",
  "tipo_pagamento": "PIX",
  "banco": "nubank",
  "descricao": "Compras do mês",
  "file": "<binary | opcional>"
}
```

**Response** — `201 Created`:

```json
{
  "id": 42,
  "nome": "Supermercado Xyz",
  "valor": 190.80,
  "data_pagamento": "2024-01-01T00:00:00.000Z",
  "tipo_pagamento": "PIX",
  "banco": "Nubank",
  "descricao": "Compras do mês"
}
```

**Validações no backend**:
- `nome`, `valor`, `data_pagamento`, `tipo_pagamento` são obrigatórios
- `valor` deve ser número positivo
- `data_pagamento` deve ser data válida
- `banco` deve ser um dos valores do enum de bancos (ou "outro")

### Alterações no Banco de Dados

**Nenhuma alteração de schema necessária.** O endpoint reutiliza a tabela `receipts` existente:

```
receipts (
  id, user_id, nome, valor, data_pagamento,
  banco, tipo_pagamento, descricao,
  arquivo_data, arquivo_mimetype, arquivo_nome,
  created_at
)
```

A diferença em relação ao `/analyze` é que `arquivo_data` pode ser `NULL` (arquivo opcional no lançamento manual).

### Componentes Frontend

| Componente / Arquivo         | Responsabilidade                                                     |
|------------------------------|----------------------------------------------------------------------|
| `UploadPage.jsx`             | Orquestra o toggle e renderiza o modo ativo                          |
| `ManualUploadForm.jsx` (novo) | Formulário de lançamento manual                                     |
| `FilePreview.jsx` (novo)     | Visualizador de arquivo (imagem ou PDF via `<iframe>` / `<img>`)    |
| `services.js`                | Adicionar função `createManualReceipt(formData)`                     |

**Toggle — comportamento esperado:**

- Visual: dois botões lado a lado, o ativo com fundo sólido (estilo pill, igual ao design da referência)
- Estado local em `UploadPage.jsx` via `useState('ia' | 'manual')`
- Trocar de aba limpa o estado do formulário/arquivo da aba anterior

**Visualizador de arquivo:**
- Imagem (JPEG, PNG): `<img src={objectUrl} />`
- PDF: `<iframe src={objectUrl} />` ou `<embed />`
- Fallback: ícone de documento com nome do arquivo

---

## Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Usuário salvar comprovante sem arquivo e campos incompletos | Médio | Alta | Validação client-side + server-side com mensagens claras |
| PDF não renderizar no visualizador em alguns navegadores | Baixo | Média | Fallback para exibir apenas o nome e ícone do arquivo |
| Inconsistência de dados entre modo manual e modo IA (ex: formatação do banco) | Médio | Média | Aplicar mesma função `titleCase` no endpoint `/manual`; reutilizar lista `BANKS` no frontend |
| Aumento de escopo durante implementação (ex.: validações complexas) | Médio | Alta | Manter V1 focado no formulário simples; diferir validações avançadas para V2 |

---

## Plano de Implementação

| Fase | Tarefa | Descrição | Estimativa |
|------|--------|-----------|------------|
| **1 — Backend** | Novo endpoint | Criar `POST /receipts/manual` em `server/routes/receipts.js` | 2h |
| **1 — Backend** | Swagger | Documentar o novo endpoint | 30min |
| **2 — Serviço Frontend** | `createManualReceipt` | Adicionar função em `client/src/api/services.js` | 15min |
| **3 — Componentes** | `FilePreview.jsx` | Componente de pré-visualização de imagem/PDF | 1h |
| **3 — Componentes** | `ManualUploadForm.jsx` | Formulário com todos os campos + integração com `FilePreview` | 3h |
| **4 — Integração** | `UploadPage.jsx` | Adicionar toggle + renderizar modo IA ou manual conforme seleção | 1h |
| **5 — Testes manuais** | Smoke test | Verificar fluxo completo (com e sem arquivo) | 30min |

**Estimativa total**: ~8 horas

**Ordem de dependências**: Backend → Serviço Frontend → Componentes → Integração na página

---

## Estratégia de Testes

| Tipo | Escopo | Cenários Críticos |
|------|--------|-------------------|
| **Manual / Smoke** | Fluxo completo | Upload com arquivo, upload sem arquivo, campos obrigatórios vazios |
| **Validação de formulário** | Frontend | Submissão com campo obrigatório vazio deve exibir erro; valor negativo deve ser rejeitado |
| **Visualizador** | Frontend | Imagem JPEG/PNG exibe corretamente; PDF renderiza ou exibe fallback; trocar arquivo atualiza o preview |
| **Endpoint backend** | API | `201` com dados válidos; `400` com campos obrigatórios ausentes; `400` com valor inválido; `401` sem token |
| **Consistência** | Integração | Registro salvo aparece corretamente na tela de histórico com todos os campos |

---

## Considerações de Segurança

- **Autenticação**: O endpoint `POST /receipts/manual` utiliza o mesmo middleware `auth` JWT existente — nenhuma mudança necessária.
- **Validação de entrada**: Validar e sanitizar todos os campos no servidor antes de inserir no banco (queries parametrizadas com `pg.Pool` — já em uso).
- **Upload de arquivo**: Mesmo tratamento do endpoint `/analyze` — `multer` com `memoryStorage`, sem gravar em disco. Arquivo armazenado como `BYTEA` no banco.
- **Exposição de dados**: A resposta do endpoint nunca retorna o `arquivo_data` (binário), apenas metadados.
