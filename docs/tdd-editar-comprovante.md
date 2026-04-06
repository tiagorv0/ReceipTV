# TDD — Edição de Comprovante

| Campo        | Valor                        |
|--------------|------------------------------|
| Tech Lead    | @tiagorv0                    |
| Status       | Draft                        |
| Criado em    | 2026-04-03                   |
| Última atualização | 2026-04-03             |

---

## Contexto

O ReceipTV permite ao usuário cadastrar comprovantes de pagamento — via extração por IA ou lançamento manual — e visualizá-los na tela de Histórico. Atualmente, cada card de comprovante exibe dois botões de ação: **Compartilhar via WhatsApp** e **Excluir**. Não existe nenhum mecanismo para corrigir dados de um comprovante após o cadastro.

Erros de extração da IA (valor errado, nome incompleto, data incorreta) ou digitação manual exigem que o usuário exclua o registro e crie um novo, o que é uma experiência degradada e causa perda de contexto.

---

## Definição do Problema

- **Sem capacidade de correção**: Dados extraídos incorretamente pela IA ou digitados errado no formulário manual não podem ser corrigidos — o único caminho é excluir e recriar.
  - Impacto: Retrabalho para o usuário e risco de duplicatas.
- **Formulário de lançamento manual não é reutilizável**: O componente `ManualUploadForm` mistura estado de criação e lógica de envio, impossibilitando seu reuso para edição.
  - Impacto: Duplicação de código se a tela de edição for criada sem refatoração prévia.
- **Backend sem endpoint de atualização**: Não existe rota `PUT /api/receipts/:id`, portanto nenhuma edição pode ser persistida.

---

## Escopo

### ✅ Em Escopo (V1)

- Novo botão **Editar** nos cards do Histórico, com o mesmo padrão visual de hover dos botões existentes (WhatsApp e Excluir)
- Modal de edição com backdrop blur + animação `zoom-in-95` — idêntico ao modal de exclusão (`ConfirmModal`)
- Formulário de edição com os mesmos campos do lançamento manual: `nome`, `valor`, `data_pagamento`, `tipo_pagamento`, `banco`, `descricao`, `arquivo`
- Formulário pré-preenchido com os dados atuais do comprovante selecionado
- Substituição do arquivo anexado (opcional — manter existente se nenhum novo for selecionado)
- Endpoint `PUT /api/receipts/:id` no backend (multipart/form-data)
- Atualização otimista da lista local após edição bem-sucedida (sem refetch completo)
- Extração do formulário em componente reutilizável `ReceiptFormFields`
- Documentação Swagger do novo endpoint
- Logging Winston no backend

### ❌ Fora de Escopo (V1)

- Edição em lote (múltiplos comprovantes de uma vez)
- Re-análise por IA após edição
- Histórico de versões/auditoria de alterações
- Edição de comprovantes na tela de Upload
- Notificação ou confirmação por e-mail após edição

---

## Solução Técnica

### Visão Geral da Arquitetura

```
HistoryPage
  ├── [botão Editar por card]
  │     └── abre EditReceiptModal
  │           └── ReceiptFormFields (componente compartilhado)
  │                 ← pré-preenchido com dados do comprovante
  └── onSave(updatedReceipt)
        └── updateReceipt(id, formData)  ← services.js
              └── PUT /api/receipts/:id  ← Express route
                    └── UPDATE receipts  ← PostgreSQL
```

### Fluxo de Dados

1. Usuário clica no botão **Editar** em um card
2. `HistoryPage` define `editModal = { open: true, receipt }` no estado
3. `EditReceiptModal` abre com os campos pré-preenchidos pelos dados de `receipt`
4. Usuário altera campos e confirma
5. Frontend monta `FormData` e chama `PUT /api/receipts/:id`
6. Backend valida, executa `UPDATE`, retorna o comprovante atualizado
7. `HistoryPage` atualiza a lista local substituindo o item pelo retorno da API
8. Modal fecha

---

### Frontend

#### Componente: `ReceiptFormFields`

Extraído de `ManualUploadForm`. Responsável **apenas pelos campos do formulário**, sem lógica de submit ou estado de sucesso.

**Props:**

| Prop | Tipo | Descrição |
|---|---|---|
| `form` | `object` | Estado dos campos (`nome`, `valor`, `data_pagamento`, `tipo_pagamento`, `banco`, `descricao`) |
| `onChange` | `(name, value) => void` | Callback genérico de mudança de campo |
| `file` | `File \| null` | Arquivo selecionado atualmente |
| `onFileChange` | `(File \| null) => void` | Callback ao selecionar arquivo |
| `existingFileName` | `string \| null` | Nome do arquivo já salvo (exibido quando nenhum novo for selecionado) |
| `fileInputRef` | `ref` | Ref do `<input type="file">` |

O `ManualUploadForm` é refatorado para usar `ReceiptFormFields` internamente, sem alterar seu comportamento externo.

---

#### Componente: `EditReceiptModal`

Modal de edição que reutiliza `ReceiptFormFields`.

**Props:**

| Prop | Tipo | Descrição |
|---|---|---|
| `open` | `boolean` | Controla visibilidade |
| `receipt` | `object \| null` | Comprovante a editar (popula formulário inicial) |
| `onClose` | `() => void` | Fecha sem salvar |
| `onSave` | `(updatedReceipt) => void` | Chamado com o retorno da API após salvar |

**Estrutura visual:**

```
┌──────────────────────────────────────────────────┐
│  [backdrop blur]                                  │
│  ┌────────────────────────────────────────────┐   │
│  │  ✏️  Editar Comprovante                    │   │
│  │  ─────────────────────────────────────     │   │
│  │  <ReceiptFormFields ... />                 │   │
│  │  ─────────────────────────────────────     │   │
│  │  [Cancelar]          [Salvar Alterações]   │   │
│  └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

- Backdrop: `fixed inset-0 bg-black/60 backdrop-blur-sm` (igual ao `ConfirmModal`)
- Animação de entrada: `animate-in zoom-in-95 duration-200`
- Largura: `max-w-xl` (mais largo que o `ConfirmModal` padrão para acomodar o formulário)
- Botão confirmar: variante `success` (verde), igual ao `ConfirmModal` com `variant="success"`
- O modal deve ser scrollável internamente se o conteúdo ultrapassar a altura da tela (`overflow-y-auto max-h-[90vh]`)

---

#### Botão Editar nos Cards

Inserido **entre** o botão de WhatsApp e o botão de Excluir, seguindo o mesmo padrão:

```
Whatsapp | Editar | Excluir
```

**Aparência:**

```jsx
<button
  className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-colors border border-blue-500/30"
  title="Editar"
  type="button"
>
  <Pencil size={16} />
</button>
```

- Cor azul para diferenciar do WhatsApp (verde) e do excluir (vermelho)
- Ícone: `Pencil` do `lucide-react`
- Visibilidade: `opacity-100 md:opacity-0 md:group-hover:opacity-100` — mesmo comportamento dos outros botões

---

#### Estado em `HistoryPage`

```js
// Estado existente (não alterar)
const [deleteModal, setDeleteModal] = useState({ open: false, id: null });

// Estado novo
const [editModal, setEditModal]   = useState({ open: false, receipt: null });
```

**Handlers novos:**

- `handleEdit(receipt)` → `setEditModal({ open: true, receipt })`
- `handleEditClose()` → `setEditModal({ open: false, receipt: null })`
- `handleEditSave(updated)` → atualiza `receipts` substituindo o item pelo `updated` retornado, fecha o modal

---

#### Serviço: `updateReceipt`

Adicionado em `client/src/api/services.js`:

```js
// Envia multipart/form-data (suporta arquivo opcional)
export const updateReceipt = (id, formData) =>
  api.put(`/receipts/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
```

---

### Backend

#### Endpoint: `PUT /api/receipts/:id`

**Rota:** `server/routes/receipts.js`

| Campo | Valor |
|---|---|
| Método | `PUT` |
| Caminho | `/api/receipts/:id` |
| Auth | JWT obrigatório |
| Content-Type | `multipart/form-data` |

**Request Body (form-data):**

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `nome` | string | Sim | Nome de quem recebeu |
| `valor` | number | Sim | Valor positivo |
| `data_pagamento` | date (YYYY-MM-DD) | Sim | Data do pagamento |
| `tipo_pagamento` | string | Sim | Ex: PIX, TED, Boleto |
| `banco` | string | Não | Ex: nubank, itau |
| `descricao` | string | Não | Observações |
| `file` | binary | Não | Novo arquivo (PDF/imagem) |

**Responses:**

| Status | Descrição |
|---|---|
| `200 OK` | Comprovante atualizado. Retorna o registro completo sem `arquivo_data`. |
| `400 Bad Request` | Campos obrigatórios ausentes ou valor inválido |
| `403 Forbidden` | Comprovante pertence a outro usuário |
| `404 Not Found` | Comprovante não encontrado |
| `500 Internal Server Error` | Erro no servidor |

**Response 200 (exemplo):**

```json
{
  "id": 42,
  "nome": "Supermercado XYZ",
  "valor": "150.00",
  "data_pagamento": "2026-03-15T00:00:00.000Z",
  "banco": "nubank",
  "tipo_pagamento": "PIX",
  "descricao": "Compras mensais",
  "arquivo_mimetype": "image/jpeg",
  "arquivo_nome": "comprovante.jpg"
}
```

**Lógica do handler:**

1. Verificar que `id` existe e pertence ao `req.user.id` — retornar 403/404 conforme o caso
2. Validar campos obrigatórios (`nome`, `valor`, `data_pagamento`, `tipo_pagamento`)
3. Aplicar `titleCase` em `nome` e `banco`
4. Montar query `UPDATE`:
   - Se `req.file` presente → atualizar também `arquivo_data`, `arquivo_mimetype`, `arquivo_nome`
   - Se `req.file` ausente → manter arquivo existente (não sobrescrever com NULL)
5. Retornar `RETURNING` sem `arquivo_data` (coluna BYTEA pesada)
6. Log Winston `info` com `id` e `user_id`

**Query SQL (estrutura):**

```sql
UPDATE receipts
SET nome = $1, valor = $2, data_pagamento = $3, tipo_pagamento = $4,
    banco = $5, descricao = $6,
    -- condicionalmente:
    arquivo_data = $7, arquivo_mimetype = $8, arquivo_nome = $9
WHERE id = $N AND user_id = $M
RETURNING id, nome, valor, data_pagamento, banco, tipo_pagamento, descricao,
          arquivo_mimetype, arquivo_nome;
```

> A lógica de "incluir ou não as colunas de arquivo" deve ser tratada dinamicamente nos parâmetros, não com interpolação de string.

---

### Migração de Banco

**Nenhuma migração necessária.** A estrutura da tabela `receipts` já suporta todos os campos editáveis. Nenhuma coluna nova é adicionada.

---

## Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|---|---|---|---|
| Sobrescrever arquivo existente com NULL | Alto — perda de dado | Médio | Backend nunca atualiza colunas de arquivo se `req.file` for ausente; cobrir com teste de integração |
| Usuário editar comprovante de outro usuário (IDOR) | Alto — violação de segurança | Baixo | Query sempre filtra `AND user_id = $M`; retornar 403 se não encontrar |
| `ReceiptFormFields` com prop drilling excessivo | Médio — manutenção | Médio | Manter interface simples de props; não compartilhar estado via context desnecessariamente |
| Modal de edição quebrar layout em telas pequenas | Médio — UX mobile | Médio | Usar `max-h-[90vh] overflow-y-auto` e testar em 375px; mobile-first obrigatório |
| Atualização otimista exibir dado desatualizado | Baixo — inconsistência | Baixo | Usar o retorno da API para atualizar o estado local (não os dados do formulário) |

---

## Plano de Implementação

| Fase | Tarefa | Arquivo(s) | Estimativa |
|---|---|---|---|
| **1 — Backend** | Criar endpoint `PUT /api/receipts/:id` com validação, lógica de arquivo e Swagger | `server/routes/receipts.js` | 2h |
| **2 — Serviço** | Adicionar `updateReceipt` | `client/src/api/services.js` | 15min |
| **3 — Refatoração** | Extrair `ReceiptFormFields` de `ManualUploadForm` | `client/src/components/ReceiptFormFields.jsx`, `ManualUploadForm.jsx` | 1h |
| **4 — Modal** | Criar `EditReceiptModal` usando `ReceiptFormFields` | `client/src/components/EditReceiptModal.jsx` | 1.5h |
| **5 — HistoryPage** | Adicionar botão Editar, estado `editModal`, handlers | `client/src/pages/HistoryPage.jsx` | 1h |
| **6 — Testes manuais** | Validar criação, edição sem arquivo, edição com novo arquivo, mobile | — | 30min |

**Total estimado:** ~6h

---

## Estratégia de Testes

### Testes Manuais (V1)

| Cenário | Resultado Esperado |
|---|---|
| Clicar em Editar em um card | Modal abre com campos pré-preenchidos |
| Alterar nome e salvar | Card atualiza com novo nome; modal fecha |
| Salvar sem arquivo novo | Arquivo original é mantido |
| Salvar com novo arquivo | Arquivo é substituído |
| Clicar fora do modal | Modal fecha sem salvar |
| Salvar com `valor = 0` | Erro de validação exibido |
| Editar em tela 375px | Modal scrollável, campos usáveis |
| Backend com ID inválido | Retorna 404 |
| Backend com ID de outro usuário | Retorna 403 |

### Cobertura Crítica

- `PUT /api/receipts/:id` deve ser testado com e sem arquivo
- Verificar que `arquivo_data` não é sobrescrito com NULL quando nenhum arquivo é enviado
- Verificar retorno 403 para ID pertencente a outro usuário

---

## Considerações de Segurança

- **Autorização por recurso**: A query `WHERE id = $1 AND user_id = $2` garante que cada usuário só edita os próprios comprovantes. Se o `UPDATE` retornar 0 linhas, verificar se o ID existe sem o filtro de `user_id` para distinguir 404 de 403.
- **Validação de entrada**: Mesmas regras do endpoint `POST /receipts/manual` — campos obrigatórios, valor numérico positivo, sem interpolação SQL.
- **Arquivo**: O arquivo recebido é armazenado como BYTEA no banco, sem execução. O `multer` já filtra por `memoryStorage`, sem escrita em disco.
- **Sem exposição de `arquivo_data`** no retorno — a coluna BYTEA nunca deve ser retornada nas listagens ou respostas de update.

---

## Questões em Aberto

| # | Questão | Status |
|---|---|---|
| 1 | O botão Editar deve aparecer em mobile sem hover (sempre visível), ou manter o mesmo comportamento de `md:group-hover:opacity-100`? | Aberta |
| 2 | Ao editar, o `ManualUploadForm` na página de Upload deve também reutilizar `ReceiptFormFields` ou é refatoração separada? | Aberta — sugerido V1 focar só no `ManualUploadForm` |
