# TDD — Suprimir Modal de Sessão Expirando quando "Continuar Logado" está Ativo

| Campo               | Valor                          |
| ------------------- | ------------------------------ |
| Tech Lead           | Tiago Reolon Vazzoller         |
| Time                | Tiago Reolon Vazzoller         |
| Status              | Draft                          |
| Criado              | 2026-03-31                     |
| Última atualização  | 2026-03-31                     |

---

## Contexto

O ReceipTV usa uma arquitetura de autenticação com dois tokens: um **access token** de curta duração (15 minutos) e um **refresh token** de longa duração armazenado como cookie HTTP-only. O `rememberMe` ("Continuar logado") foi implementado no servidor: quando ativo, o refresh token dura 30 dias; quando inativo, dura apenas 1 hora.

O componente `SessionExpiryWarning` (`client/src/components/SessionExpiryWarning.jsx`) monitora o timestamp de expiração do access token (`localStorage['sessionExpiry']`) e exibe um modal de alerta 5 minutos antes de cada expiração — independentemente da escolha do usuário na tela de login.

O interceptor Axios em `client/src/api/index.js` já trata a renovação silenciosa do access token via `/auth/refresh` quando um 401 é recebido. Ou seja, quando `rememberMe` está ativo e o refresh token ainda é válido, o token é renovado **automaticamente e de forma transparente** — o modal é tecnicamente desnecessário e contradiz a promessa do checkbox "Continuar logado".

---

## Definição do Problema

### Problemas que estamos resolvendo

- **Modal desnecessário com `rememberMe` ativo:** O usuário marcou "Continuar logado" esperando que a sessão se renove automaticamente. Mesmo assim, a cada ~10 minutos, o modal aparece pedindo ação manual — quebrando a experiência prometida.
  - Impacto: Fricção de UX, confusão do usuário, sensação de bug.

- **A flag `rememberMe` não é persistida no cliente:** Após o login, o valor de `rememberMe` existe apenas em memória React (`useState`). Ele não é salvo no `localStorage`, portanto nenhum componente subsequente (como `SessionExpiryWarning`) tem acesso a essa informação.
  - Impacto: Impossibilidade de qualquer lógica condicional baseada na preferência do usuário.

### Por que agora?

O comportamento é regressivo em relação à expectativa criada pelo próprio checkbox "Continuar logado" na tela de login — uma promessa de UX que não está sendo cumprida.

### Impacto de não resolver

- **Usuário:** Experiência confusa e interrompida. O modal é percebido como bug.
- **Produto:** Desconfiança na confiabilidade do sistema de autenticação.

---

## Escopo

### ✅ In Scope (V1)

- Persistir a flag `rememberMe` no `localStorage` após login bem-sucedido
- Modificar `SessionExpiryWarning` para, quando `rememberMe` estiver ativo, **renovar o token silenciosamente** em vez de exibir o modal
- Limpar a flag `rememberMe` do `localStorage` no logout (em `Sidebar.jsx` e `BottomNav.jsx`)

### ❌ Out of Scope (V1)

- Alterações no servidor — o comportamento do refresh token de 30 dias já está correto
- Mudanças no fluxo de renovação do interceptor Axios — já funciona corretamente
- Implementação de "renovação proativa" antes do 401 para usuários sem `rememberMe`

---

## Solução Técnica

### Visão Geral

A correção é inteiramente no frontend e envolve dois pontos:

1. **Persistência da preferência:** salvar `rememberMe` no `localStorage` na função de submit do login, junto com os outros dados já persistidos (`sessionExpiry`, `was_authenticated`).

2. **Comportamento condicional do `SessionExpiryWarning`:** ao calcular quando exibir o alerta, verificar se `rememberMe` está ativo. Se sim, chamar `/auth/refresh` silenciosamente e atualizar `sessionExpiry` sem mostrar o modal ao usuário.

### Fluxo de Dados

```
LOGIN com rememberMe = true
  ↓
POST /auth/login → sucesso
  ↓
localStorage.setItem('rememberMe', 'true')       ← NOVO
localStorage.setItem('sessionExpiry', exp)
localStorage.setItem('was_authenticated', 'true')
  ↓
SessionExpiryWarning inicializa
  ↓
Lê rememberMe do localStorage                    ← NOVO
  ├─ rememberMe = true  →  Renova token silenciosamente (sem modal)
  └─ rememberMe = false →  Comportamento atual: exibe modal 5min antes

LOGOUT
  ↓
localStorage.removeItem('rememberMe')            ← NOVO (junto com os demais removes)
```

### Diagrama de componentes afetados

```
LoginPage.jsx
  └─ handleSubmit()
       ├─ localStorage.setItem('sessionExpiry', ...)      (existente)
       ├─ localStorage.setItem('was_authenticated', ...)  (existente)
       └─ localStorage.setItem('rememberMe', ...)         ← ADICIONAR

SessionExpiryWarning.jsx
  └─ useEffect (timer de expiração)
       ├─ lê rememberMe do localStorage                   ← ADICIONAR
       ├─ if rememberMe → chama /auth/refresh silenciosamente e retorna (sem setShowWarning(true))
       └─ if !rememberMe → comportamento atual (agenda showWarning)

Sidebar.jsx + BottomNav.jsx
  └─ handleLogout()
       └─ localStorage.removeItem('rememberMe')           ← ADICIONAR
```

### Detalhes por arquivo

| Arquivo | Mudança |
|---------|---------|
| `client/src/pages/LoginPage.jsx` | Adicionar `localStorage.setItem('rememberMe', String(rememberMe))` após login bem-sucedido |
| `client/src/components/SessionExpiryWarning.jsx` | Ler `rememberMe` do localStorage; se verdadeiro, renovar silenciosamente sem mostrar modal |
| `client/src/components/Sidebar.jsx` | Adicionar `localStorage.removeItem('rememberMe')` no `handleLogout` |
| `client/src/components/BottomNav.jsx` | Idem ao Sidebar |

---

## Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Renovação silenciosa falha (refresh token expirado ou revogado) | Médio — usuário perde sessão sem aviso | Baixa — só ocorre após 30 dias de inatividade | O `/auth/refresh` já retorna 401 nesse caso; o interceptor Axios dispara `auth:expired`, que redireciona para login via `useSessionSync` |
| Flag `rememberMe` fica "presa" no localStorage após erro de logout | Baixo — próximo login com `rememberMe=false` ainda persistiria `'false'` | Baixa | Salvar `String(rememberMe)` garante que sempre substitui o valor anterior; checar `=== 'true'` é seguro |
| Usuário com sessão ativa antes do fix (sem `rememberMe` no localStorage) | Baixo — valor ausente é tratado como `false`, comportamento atual mantido | Alta (todos os usuários existentes) | Ausência da chave no localStorage equivale a `rememberMe = false`; nenhuma mudança de comportamento |

---

## Plano de Implementação

| Fase | Tarefa | Arquivo | Estimativa |
|------|--------|---------|------------|
| 1 — Persistência | Salvar `rememberMe` no `localStorage` após login | `LoginPage.jsx` | ~30 min |
| 2 — Lógica condicional | Verificar `rememberMe` em `SessionExpiryWarning`; renovar silenciosamente se ativo | `SessionExpiryWarning.jsx` | ~1h |
| 3 — Limpeza no logout | Remover `rememberMe` do localStorage no logout | `Sidebar.jsx`, `BottomNav.jsx` | ~15 min |
| 4 — Testes manuais | Validar os cenários descritos na estratégia de testes | — | ~30 min |

**Estimativa total:** ~2,5 horas

---

## Considerações de Segurança

- **`rememberMe` no `localStorage` é apenas preferência de UX**, não um token de segurança. Não concede acesso nem bypassa autenticação; a autorização real permanece nos cookies HTTP-only.
- A renovação silenciosa depende do `/auth/refresh` do servidor, que já valida o refresh token via hash no banco de dados. Se o token estiver expirado ou revogado, o servidor retorna 401 e o usuário é redirecionado para login normalmente.
- Nenhuma informação sensível (tokens, credenciais) é armazenada ou exposta por esta mudança.

---

## Estratégia de Testes

| Cenário | `rememberMe` | Comportamento Esperado |
|---------|-------------|------------------------|
| Access token próximo de expirar | `true` | Modal **não** aparece; token renovado silenciosamente; `sessionExpiry` atualizado |
| Access token próximo de expirar | `false` | Modal aparece normalmente 5 min antes |
| Refresh token expirado com `rememberMe=true` | `true` | Renovação silenciosa falha → `auth:expired` → redirecionado para `/login?expired=true` |
| Logout | qualquer | `localStorage['rememberMe']` removido |
| Novo login com `rememberMe=false` após ter sido `true` | `false` | Valor sobrescrito corretamente; modal volta a aparecer |
| Usuário existente (sem chave no localStorage) | ausente | Comportamento atual mantido (modal aparece) |

**Testes manuais recomendados:**
1. Fazer login com "Continuar logado" marcado → aguardar 10 minutos → confirmar que o modal não aparece e a sessão continua ativa
2. Fazer login sem "Continuar logado" → aguardar ~10 minutos → confirmar que o modal aparece
3. Fazer logout → inspecionar `localStorage` → confirmar que `rememberMe` foi removido

---

## Questões em Aberto

| # | Questão | Status |
|---|---------|--------|
| 1 | Usuários com `rememberMe=true` que ficam na aba aberta por 30+ dias devem receber alguma notificação antes do refresh token expirar? | 🔴 Aberta — fora do escopo deste fix |
