# ReceipTV 💸

ReceipTV é um gerenciador de comprovantes inteligente que utiliza IA para extrair dados de imagens e PDFs, organiza-os em um banco de dados e permite gerar relatórios financeiros.

## ✨ Funcionalidades

- 🧠 **Análise Inteligente**: Extração de nome, valor, data, banco e tipo de pagamento (PIX, TED, Boleto).
- 🔐 **Autenticação**: Sistema de login e senha seguro com JWT.
- ⚙️ **Configuração Flexível**: Configure sua própria API Key e escolha entre Claude (Anthropic), GPT-4o (OpenAI) ou Gemini (Google).
- 📊 **Dashboard & Relatórios**: Visualize seus gastos mensais e por banco através de gráficos.
- 📱 **Responsivo**: Interface otimizada para Desktop (Sidebar) e Mobile (Bottom Nav).
- 📲 **WhatsApp**: Compartilhamento rápido de comprovantes formatados.

## 🚀 Como Rodar

### Pré-requisitos
- Node.js (v22+)
- Docker e Docker Compose (para o MySQL)

### Passo 1: Iniciar o Banco de Dados
```bash
docker-compose up -d
```

### Passo 2: Instalar Dependências
```bash
npm install
npm run install-all
```

### Passo 3: Configurar o Servidor
Crie um arquivo `.env` na pasta `server/` (exemplo já incluído) com suas credenciais.

### Passo 4: Rodar o Projeto
```bash
npm run dev
```

O frontend estará em `localhost:5173` e o backend em `localhost:5000`.

## 🛠️ Tecnologias

- **Frontend**: Vite, React, React Router, Recharts, Lucide React, Framer Motion.
- **Backend**: Node.js, Express, JWT, BcryptJS, Multer.
- **Banco de Dados**: MySQL (via Docker).
- **IA**: Anthropic SDK, OpenAI SDK, Google Generative AI SDK.
