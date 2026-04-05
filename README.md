# ReceipTV

ReceipTV é um gerenciador financeiro de comprovantes com extração automática por IA. Faça upload de PDFs ou imagens de comprovantes e o sistema extrai automaticamente os dados estruturados (beneficiário, valor, data, banco e tipo de pagamento) para gerar dashboards e relatórios de gastos.

## Funcionalidades

- **Extração por IA**: Analisa PDFs e imagens via Groq (Llama 4 Scout) para extrair nome, valor, data, banco e tipo de pagamento (PIX, TED, Boleto).
- **Autenticação JWT**: Login e cadastro com senha criptografada (bcrypt).
- **Dashboard e Relatórios**: Gráficos de gastos mensais e por banco via Recharts.
- **Histórico de Comprovantes**: Listagem, visualização e exclusão de comprovantes.
- **PWA**: Instalável como app, com suporte a compartilhamento de arquivos pelo mobile (Web Share Target API).
- **Responsivo**: Sidebar no desktop, Bottom Nav no mobile.
- **API documentada**: Swagger UI disponível em `/api-docs`.

## Tecnologias

**Frontend**
- React 19 + Vite 7
- Tailwind CSS 4 + shadcn/ui
- React Router 7, Recharts, Framer Motion
- PWA com Workbox

**Backend**
- Node.js + Express 5 (ESM)
- PostgreSQL 17 via `pg` (sem ORM)
- Groq SDK (`groq-sdk`) com modelo Llama 4 Scout
- JWT, bcryptjs, Multer, Morgan, Winston, Swagger

## Como Rodar

### Pré-requisitos
- Node.js v24+
- Docker e Docker Compose

### 1. Iniciar o banco de dados

```bash
docker-compose up -d
```

### 2. Instalar dependências

```bash
npm install && npm run install-all
```

### 3. Configurar variáveis de ambiente

Crie `server/.env`:

```env
DATABASE_URL=postgresql://postgres:root@localhost:5434/receiptv
JWT_SECRET=sua_chave_secreta
GROQ_API_KEY=sua_groq_api_key
PORT=5000
```

Crie `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Swagger: `http://localhost:5000/api-docs`

### Docker (todos os serviços)

```bash
docker-compose up
```

## Estrutura do Projeto

```
ReceipTV/
├── client/          # React SPA (Vite)
│   └── src/
│       ├── api/     # Axios + serviços
│       ├── components/
│       ├── pages/
│       ├── hooks/
│       └── utils/
├── server/          # API REST (Node.js/Express)
│   ├── config/      # DB pool e logger
│   ├── routes/      # Rotas da API
│   ├── middleware/  # Auth JWT
│   └── services/   # Análise com IA
├── database/        # Schema SQL
└── docker-compose.yml
```
