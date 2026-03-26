# TDD - Suporte PWA (Progressive Web App) no ReceipTV

| Campo              | Valor       |
| ------------------ | ----------- |
| Tech Lead          | Tiago Vazzoller |
| Time               | Tiago Vazzoller |
| Ticket/Epic        | —           |
| Status             | Draft       |
| Criado em          | 2026-03-25  |
| Última atualização | 2026-03-25  |

---

## Contexto

O ReceipTV é um gerenciador financeiro de comprovantes com extração via IA, hospedado em `receiptv.onrender.com`. O frontend é uma SPA React 19 + Vite 7, com layout responsivo que já oferece Sidebar (desktop) e Bottom Navigation (mobile).

Atualmente, acessar o app pelo celular exige abrir o navegador, digitar a URL e navegar normalmente — sem experiência nativa. O app não possui nenhum suporte a PWA: sem `manifest.json`, sem service worker, sem ícones de instalação.

**Stakeholders:** usuário final (pessoa física que gerencia comprovantes pelo celular).

---

## Definição do Problema

### Problemas a Resolver

- **Acesso inconveniente pelo celular:** o usuário precisa navegar via browser toda vez; não há atalho na tela inicial do dispositivo.
  - Impacto: fricção no uso diário, menor retenção.
- **Ausência de experiência app-like no mobile:** sem splash screen, sem modo fullscreen, sem ícone próprio — a barra de endereços do browser fica visível.
  - Impacto: percepção de produto menos polido.
- **Sem funcionalidade offline mínima:** uma queda de conexão resulta em tela em branco, sem feedback útil.
  - Impacto: experiência degradada em conexões instáveis.

### Por Que Agora?

O layout mobile já está bem desenvolvido (bottom nav, responsividade). É o momento natural de evoluir para uma experiência instalável, sem mudanças estruturais no app.

### Impacto de Não Resolver

- **Usuários:** continuam com experiência inferior no dispositivo mais usado.
- **Produto:** perde uma melhoria de baixo esforço e alto valor percebido.

---

## Escopo

### ✅ Em Escopo (V1)

- Instalação do `vite-plugin-pwa` no projeto frontend
- Geração do `manifest.json` (nome, ícones, cores, orientação, display mode)
- Registro de service worker com estratégia de cache para assets estáticos (precache)
- Ícones do app em múltiplos tamanhos (192×192, 512×512, maskable)
- Página de fallback offline (`/offline.html`) exibida quando não há conexão e a rota não está em cache
- Prompt de instalação "Adicionar à tela inicial" detectado e exibido ao usuário
- Suporte a tema: `theme_color` e `background_color` alinhados à identidade visual do app

### ❌ Fora de Escopo (V1)

- Push notifications
- Sincronização em background (Background Sync API)
- Estratégias de cache para chamadas de API (dados dinâmicos)
- Suporte offline completo (funcionalidade sem rede)
- Testes automatizados do service worker

### 🔮 Considerações Futuras (V2+)

- Cache de dados de relatórios recentes para leitura offline
- Notificações push para alertas de novos comprovantes processados
- Sincronização em background ao retomar conexão

---

## Solução Técnica

### Visão Geral

Adicionar `vite-plugin-pwa` ao pipeline de build do Vite. O plugin gera automaticamente o `manifest.webmanifest` e o service worker durante o `vite build`, sem necessidade de gerenciar esses arquivos manualmente.

**Componentes principais:**

- **`vite-plugin-pwa`** — geração do manifest + service worker via Workbox
- **Workbox (GenerateSW)** — estratégia de precache para todos os assets do build
- **Componente `<InstallPrompt>`** — detecta e expõe o evento `beforeinstallprompt` ao usuário
- **`/offline.html`** — fallback estático quando a rota não está em cache e não há rede

### Diagrama de Arquitetura

```mermaid
graph TD
    subgraph Build
        V[Vite Build] --> P[vite-plugin-pwa]
        P --> M[manifest.webmanifest]
        P --> SW[service-worker.js via Workbox]
        P --> PC[Precache de assets estáticos]
    end

    subgraph Runtime
        B[Browser] --> R[Registra SW]
        R --> C[Cache de assets JS/CSS/HTML]
        B --> IP[Evento beforeinstallprompt]
        IP --> UI[Componente InstallPrompt]
        UI --> A[Usuário instala o app]
    end

    subgraph Offline
        B --> REQ[Requisição de rota]
        REQ -->|Cache hit| C
        REQ -->|Cache miss + sem rede| OF[/offline.html]
    end
```

### Estratégia de Cache

| Recurso                             | Estratégia          | Descrição                                                      |
| ----------------------------------- | ------------------- | -------------------------------------------------------------- |
| Assets do build (JS, CSS, HTML)     | **Precache**        | Todos os arquivos gerados pelo Vite são cacheados no install   |
| Fontes externas (Fontsource)        | **Cache First**     | Fontes raramente mudam; serve do cache, atualiza em background |
| Imagens estáticas (`/public`)       | **Cache First**     | Ícones e imagens do public folder                              |
| Chamadas de API (`/api/*`)          | **Sem cache (V1)**  | Dados dinâmicos; autenticação JWT requer request sempre fresh  |
| Rotas não cacheadas + offline       | **Fallback offline**| Serve `/offline.html` como fallback                            |

> **Decisão sobre API:** chamadas para `/api/*` **não** serão interceptadas pelo service worker na V1. JWT armazenado no `localStorage` não é acessível pelo SW, e interceptar requisições autenticadas introduz risco de servir dados desatualizados. O benefício não justifica a complexidade na V1.

### Web App Manifest

| Campo              | Valor                              |
| ------------------ | ---------------------------------- |
| `name`             | ReceipTV                           |
| `short_name`       | ReceipTV                           |
| `start_url`        | `/`                                |
| `display`          | `standalone`                       |
| `orientation`      | `portrait`                         |
| `theme_color`      | A definir (cor primária do design) |
| `background_color` | A definir (cor de fundo do splash) |
| `icons`            | 192×192, 512×512, maskable 512×512 |

### Componente de Prompt de Instalação

Um componente React escuta o evento `beforeinstallprompt` e, quando disponível, exibe um banner/botão não intrusivo (ex.: no bottom da tela mobile) com a ação "Instalar app". Após a instalação, o prompt é ocultado e o evento `appinstalled` é registrado.

**Comportamento:**
- Exibido apenas no mobile (ou desktop com suporte à instalação)
- Pode ser descartado pelo usuário sem voltar a aparecer na sessão
- Não bloqueia o uso do app

### Ícones Necessários

| Arquivo                | Tamanho   | Finalidade                      |
| ---------------------- | --------- | ------------------------------- |
| `icon-192x192.png`     | 192×192px | Ícone padrão Android/Chrome     |
| `icon-512x512.png`     | 512×512px | Ícone de alta resolução         |
| `icon-maskable.png`    | 512×512px | Ícone adaptável (safe zone 80%) |
| `apple-touch-icon.png` | 180×180px | iOS (Add to Home Screen)        |

### Mudanças no `vite.config.js`

O plugin `VitePWA` será adicionado ao array `plugins` com configuração de manifest e Workbox. Nenhuma mudança em rotas, componentes existentes ou lógica de negócio.

### Mudanças no `index.html`

Adição de `<meta name="theme-color">` e `<link rel="apple-touch-icon">` no `<head>`.

---

## Riscos

| Risco | Impacto | Probabilidade | Mitigação |
| ----- | ------- | ------------- | --------- |
| **Cache stale após deploy** — o SW cacheado continua servindo versão antiga | Alto | Médio | Workbox gerencia versioning automaticamente; configurar `skipWaiting: true` + `clientsClaim: true`; exibir notificação de "nova versão disponível" |
| **Service worker quebra rota de login** — SW intercepta redirect pós-login | Médio | Baixo | Excluir `/api/*` do cache; testar fluxo de auth completo em modo PWA instalado |
| **`beforeinstallprompt` não disparado** — critérios do browser não atendidos (HTTPS, manifest válido) | Médio | Médio | Garantir HTTPS (Render já provê); validar manifest com Lighthouse; ocultar prompt se evento não ocorrer |
| **Ícones ausentes ou com tamanho errado** — instalação sem ícone correto no dispositivo | Baixo | Médio | Gerar todos os tamanhos necessários antes do deploy; validar com Lighthouse PWA audit |
| **Conflito com Vite 7** — versão do plugin incompatível | Baixo | Baixo | Verificar compatibilidade do `vite-plugin-pwa` com Vite 7 antes de instalar |

---

## Plano de Implementação

| Fase | Tarefa | Descrição | Status | Estimativa |
| ---- | ------ | --------- | ------ | ---------- |
| **1 - Preparação** | Gerar ícones | Criar/exportar ícones em todos os tamanhos | TODO | 1h |
| | Verificar compatibilidade | Confirmar `vite-plugin-pwa` com Vite 7 | TODO | 30min |
| **2 - Configuração** | Instalar plugin | `npm install vite-plugin-pwa -D` no `client/` | TODO | 10min |
| | Configurar `vite.config.js` | Adicionar `VitePWA` com manifest + Workbox | TODO | 1h |
| | Adicionar ícones ao `public/` | Copiar ícones gerados para a pasta pública | TODO | 15min |
| | Atualizar `index.html` | Adicionar meta tags para iOS/theme | TODO | 15min |
| **3 - Componente** | Criar `InstallPrompt` | Componente que escuta `beforeinstallprompt` | TODO | 2h |
| | Integrar ao Layout | Renderizar `<InstallPrompt>` no Layout mobile | TODO | 30min |
| **4 - Offline** | Criar `/offline.html` | Página estática de fallback sem rede | TODO | 1h |
| **5 - Validação** | Lighthouse audit | Rodar auditoria PWA no Chrome DevTools | TODO | 1h |
| | Teste de instalação | Testar em Android (Chrome) e iOS (Safari) | TODO | 1h |
| | Teste de update | Verificar que novo deploy invalida cache antigo | TODO | 30min |
| **6 - Deploy** | Build + deploy | `npm run build` + deploy no Render | TODO | 30min |

**Estimativa total:** ~2 dias

---

## Estratégia de Testes

| Tipo | Escopo | Abordagem |
| ---- | ------ | --------- |
| **Lighthouse PWA Audit** | Manifest, SW, HTTPS, instalabilidade | Chrome DevTools → aba Lighthouse → categoria PWA |
| **Teste manual de instalação** | Android (Chrome), iOS (Safari) | Verificar prompt "Adicionar à tela inicial" e splash screen |
| **Teste de fluxo autenticado** | Login → Dashboard no modo standalone | Verificar que JWT/auth funciona normalmente após instalação |
| **Teste de update** | Cache invalidado após novo build | Fazer deploy, abrir app instalado, verificar notificação de update |
| **Teste offline** | Rota offline quando sem rede | Desligar rede no DevTools, navegar para rota não cacheada — deve exibir `/offline.html` |

### Critérios de Aceite

- [ ] Score PWA ≥ 90 no Lighthouse
- [ ] Prompt de instalação aparece no Android/Chrome em `receiptv.onrender.com`
- [ ] App instalado abre sem barra de endereços (modo `standalone`)
- [ ] Ícone correto aparece na tela inicial do dispositivo
- [ ] Splash screen exibida ao abrir
- [ ] Fluxo de login/JWT funciona normalmente no modo instalado
- [ ] Sem rede + rota não cacheada → exibe página offline (sem tela em branco)
