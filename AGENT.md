## Visão geral do projeto

O **ReceipTV** é um projeto composto por:
- **Backend (`server/`)**: API em Node.js/Express, usando MySQL, autenticação com JWT, upload de arquivos (via `multer`) e integração com SDKs de IA (`openai`, `groq-sdk`). Usa também `swagger-jsdoc` e `swagger-ui-express` para documentação de API e `winston`/`morgan` para logging.
- **Frontend (`client/`)**: aplicação **React** configurada com **Vite** (`vite.config.js`), responsável pela interface de usuário.

Este `AGENT.md` orienta agentes de IA que atuam neste repositório (especialmente no Cursor) sobre **como entender o contexto**, **como escrever código** e **como interagir com o usuário**.

---

## Stack e dependências principais

### Backend (`server/`)

- **Runtime**: Node.js (ESM, campo `"type": "module"` no `package.json`).
- **Framework web**: `express@^5`.
- **Banco de dados**: `mysql2` (MySQL).
- **Autenticação/segurança**:
  - `jsonwebtoken` para geração e validação de tokens JWT.
  - `bcryptjs` para hash de senhas.
  - `cors` para controle de origem.
  - `dotenv` para variáveis de ambiente.
- **Uploads**:
  - `multer` para upload de arquivos (provavelmente imagens/recibos).
- **IA/LLMs**:
  - `openai` e `groq-sdk` para chamadas a modelos de linguagem.
- **Observabilidade**:
  - `winston` para logs estruturados.
  - `morgan` para logs de requisições HTTP.
- **Docs de API**:
  - `swagger-jsdoc` e `swagger-ui-express` para geração e exibição da documentação.

### Frontend (`client/`)

- **Build tool**: `Vite` (arquivo `vite.config.js`).
- **Framework UI**: `React` com plugin `@vitejs/plugin-react`.
- **Estilização**:
  - **Tailwind CSS** como base de utilitários de estilo (configurado no projeto `client/`).
  - **shadcn/ui** como biblioteca de componentes reutilizáveis (localizados em `client/src/components/ui`).

---

## Estrutura de diretórios (alto nível)

- `server/`
  - Contém a API em Node.js/Express.
  - Arquivo de entrada principal: provavelmente `server/index.js` (ver `main` em `server/package.json`).
  - Espera-se encontrar aqui:
    - Rotas Express.
    - Controladores.
    - Serviços de acesso a dados (MySQL).
    - Integração com `openai`/`groq-sdk`.
    - Configuração de logs (`winston`, `morgan`).
    - Configuração de CORS, autenticação JWT e upload (`multer`).
- `client/`
  - Aplicação React/Vite.
  - `vite.config.js` define as configurações de build/dev.
  - Espera-se encontrar:
    - Componentes React.
    - Páginas e rotas de UI.
    - Chamadas à API backend.

Outros diretórios e arquivos podem existir (por exemplo, `.cursor/`, `.vscode/` etc.), mas a divisão principal é **frontend em `client/`** e **backend em `server/`**.

---

## Convenções gerais para o agente

- **Idioma padrão**: sempre responder em **português (PT-BR)**, exceto se o usuário pedir explicitamente outro idioma.
- **Ferramentas**:
  - Sempre **ler** arquivos relevantes (`Read`) antes de editar (`ApplyPatch`).
  - Evitar qualquer comando destrutivo no shell (remoção de arquivos, resets, etc.) sem instrução explícita do usuário.
  - Quando possível, agrupar leituras com `Glob`/`Grep` para ganhar contexto antes de sugerir alterações.
- **Tom e estilo de comunicação**:
  - Ser direto, cordial e objetivo.
  - Evitar explicações prolixas se o usuário não pedir detalhes.
  - Usar markdown com `##`/`###` para seções e **negrito** para pontos-chave.
- **Segurança e privacidade**:
  - Nunca expor valores reais de variáveis de ambiente, chaves de API ou segredos.
  - Se encontrar credenciais em código, avisar o usuário e sugerir movê-las para `.env` (sem alterar por conta própria, a não ser que o usuário peça).
  - Ao interagir com `openai`/`groq-sdk`, tratar payloads com cuidado, evitando enviar dados sensíveis desnecessários.
- **Consistência**:
  - Manter padrões de estilo já presentes no arquivo/projeto (ex: uso de `;`, aspas simples vs. duplas, etc.).
  - Não mudar convenções de pasta/nomes sem um motivo forte e discussão prévia com o usuário.

---

## Diretrizes específicas para o backend (`server/`)

- **Arquitetura esperada**:
  - Rotas Express organizadas por domínio (por exemplo, autenticação, recibos, usuários).
  - Middlewares para:
    - Autenticação JWT.
    - Tratamento de erros.
    - Logs de requisição (`morgan`) e logs de aplicação (`winston`).
    - CORS.
  - Serviços ou repositórios para acesso ao MySQL via `mysql2`.
  - Camadas de integração com IA (`openai`, `groq-sdk`) separadas em módulos dedicados, quando possível.
- **Boas práticas a seguir**:
  - **Sempre** validar entrada de usuário (body, query, params).
  - Propagar erros com mensagens claras, mas sem vazar detalhes sensíveis (como SQL cru ou stack traces completas) para o cliente.
  - Usar `dotenv` para todas as configurações sensíveis (URI do banco, chaves de API, segredos JWT).
  - Manter a documentação de rotas em sincronia com o Swagger quando fizer alterações importantes.
- **Quando editar/expandir o backend**:
  - Verificar se já existe um padrão de organização (por exemplo, pastas `routes`, `controllers`, `services`) e seguir o mesmo.
  - Adicionar logs relevantes em pontos críticos (erros, fluxos de autenticação, chamadas a IA).
  - Garantir que novas rotas respeitem CORS e autenticação como as demais.

---

## Diretrizes específicas para o frontend (`client/`)

- **Arquitetura esperada**:
  - Componentes React funcionais com hooks.
  - Estrutura baseada em Vite (possíveis entradas em `src/main.jsx` ou similar).
  - Serviços de API centralizados (por exemplo, um módulo `api` ou `services`).
- **Boas práticas a seguir**:
  - Manter UI responsiva e acessível (usar semântica HTML adequada, labels, etc.).
  - Usar **Tailwind CSS** como principal fonte de estilos (classes utilitárias) e evitar CSS ad-hoc em excesso.
  - Reutilizar componentes de **shadcn/ui** sempre que possível para manter consistência visual (botões, cards, inputs, etc.).
  - Tratar estados de carregamento, erro e sucesso nas chamadas à API.
  - Evitar duplicação de lógica de chamada de API; preferir funções utilitárias centralizadas.
  - Manter componentes pequenos e focados; extrair subcomponentes quando necessário.
- **Integração com o backend**:
  - Usar as rotas da API definidas em `server/`.
  - Respeitar o esquema de autenticação (por exemplo, incluir token JWT nos headers quando aplicável).
  - Tratar adequadamente mensagens de erro vindas do backend.

---

## Comportamento esperado do agente no Cursor

- **Antes de modificar código**:
  - Ler o(s) arquivo(s) envolvido(s) e, se necessário, buscar rapidamente por termos com `Grep` para entender o contexto.
  - Verificar se já existem padrões ou utilitários que podem ser reutilizados.
- **Ao implementar funcionalidades**:
  - Seguir a arquitetura existente (não introduzir frameworks ou padrões radicalmente diferentes sem alinhamento com o usuário).
  - Escrever código claro, com nomes de variáveis/funções expressivos.
  - Evitar comentários redundantes; comentar apenas intenções não óbvias e decisões importantes.
- **Ao responder a perguntas conceituais**:
  - Usar o contexto do projeto (React/Vite + Express/MySQL + IA) para exemplificar.
  - Explicar em português de forma direta e, se útil, com pequenos trechos de código.
- **Ao lidar com erros/bugs**:
  - Reproduzir o erro (quando possível) analisando a mensagem e o stack trace.
  - Procurar a origem no código com `Grep`/`Read`.
  - Propor correções minimamente invasivas, preservando comportamento existente, a não ser que o usuário queira uma refatoração maior.

---

## Notas sobre controle de versão e ambiente

- Os metadados atuais indicam que o diretório **não é um repositório Git**.  
  - Não inicializar git, criar branches ou configurar remotes sem solicitação explícita do usuário.
- Presume-se o uso de um arquivo `.env` (não versionado) para variáveis sensíveis:
  - Exemplo de variáveis esperadas (nomes genéricos; não colocar valores reais):
    - `DATABASE_URL` ou variáveis equivalentes de MySQL.
    - `JWT_SECRET`.
    - `OPENAI_API_KEY`.
    - `GROQ_API_KEY`.
- Caso o usuário peça ajuda para scripts de inicialização:
  - Backend: usar `npm install` em `server/` e rodar `npm run dev` ou `npm start` conforme definido em `server/package.json`.
  - Frontend: usar o gerenciador de pacotes preferido pelo usuário em `client/` (por padrão, supor `npm` se nada for dito).

---

## Resumo para atuação rápida do agente

- **Contexto**: Projeto full-stack com **React/Vite** no frontend e **Node/Express + MySQL + IA (OpenAI/Groq)** no backend.
- **Linguagem**: Sempre responder em **português**.
- **Prioridades**:
  - Manter segurança (secrets em `.env`, JWT seguro, validação de input).
  - Respeitar arquitetura e padrões existentes.
  - Evitar mudanças disruptivas sem alinhamento com o usuário.
- **Ferramentas**: Usar `Read` antes de editar, `Grep`/`Glob` para entender o código, e evitar comandos destrutivos no shell.

Seguindo estas diretrizes, o agente deve conseguir trabalhar de forma consistente, segura e produtiva no projeto ReceipTV.

