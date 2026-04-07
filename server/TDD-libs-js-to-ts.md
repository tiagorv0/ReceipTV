# TDD — Migração de Libs JavaScript para TypeScript-Nativo (Backend)

| Campo          | Valor                                               |
| -------------- | --------------------------------------------------- |
| Tech Lead      | @Tiago Vazzoller                                    |
| Time           | Tiago Vazzoller                                     |
| Epic/Ticket    | —                                                   |
| Status         | Draft                                               |
| Criado em      | 2026-04-07                                          |
| Última revisão | 2026-04-07                                          |

---

## Contexto

O backend do ReceipTV foi recentemente migrado de JavaScript puro para TypeScript 5 (ESM). Apesar da migração do código-fonte, diversas dependências de runtime continuam sendo **bibliotecas JavaScript puras** que dependem de pacotes `@types/*` do DefinitelyTyped para obter suporte ao TypeScript.

Pacotes que dependem de `@types/*` externos apresentam riscos de desalinhamento: os tipos podem estar desatualizados em relação à versão instalada, podem conter gaps, e não se beneficiam de validações em tempo de compilação tão robustas quanto bibliotecas TypeScript-nativas.

Além disso, durante a migração foram exploradas alternativas mais modernas — evidenciado pelo arquivo `server/swagger.ts` que experimenta `swagger-autogen` como substituto ao `swagger-jsdoc`.

**Domínio:** Infraestrutura e autenticação do servidor Express 5 + Node.js 24.

---

## Definição do Problema

### Problemas a Resolver

- **Tipos externos desalinhados:** `@types/jsonwebtoken`, `@types/swagger-jsdoc`, `@types/swagger-ui-express` e outros são mantidos por terceiros no DefinitelyTyped e podem não refletir com precisão a API real da lib em uso.
- **Swagger via JSDoc é frágil:** `swagger-jsdoc` exige anotações `@swagger` em YAML/JSON embutidas nos comentários das rotas — sintaxe propensa a erros silenciosos em runtime, sem validação de schema em tempo de compilação.
- **`jsonwebtoken` sem tipos nativos:** A lib não exporta tipos próprios; depende de `@types/jsonwebtoken`, que em versões passadas conteve bugs de tipagem (ex.: `JwtPayload` como `string | object`).
- **`pdf-parse-new` sem declarações de tipos:** Nenhum `@types/pdf-parse-new` disponível; atualmente tratado via `createRequire` para contornar limitações CJS.

### Por Que Agora?

- O backend acaba de ser completamente reescrito em TypeScript — é o momento ideal para elevar a qualidade dos tipos antes que novas features se acumulem sobre a base atual.
- `swagger-autogen` já está sendo experimentado (`server/swagger.ts`), demonstrando que a equipe já identificou a necessidade de migrar a documentação.
- `jose` é a lib JWT recomendada pelo ecossistema Node.js moderno (WebCrypto API), TypeScript-nativo e alinhado ao padrão IETF.

### Impacto de Não Resolver

- **Técnico:** Risco crescente de incompatibilidade silenciosa entre tipos e comportamento real das libs a cada atualização de dependências.
- **Manutenção:** Swagger via JSDoc exige sincronização manual entre anotações e código — qualquer mudança de rota pode desatualizar a documentação sem aviso.

---

## Escopo

### ✅ Em Escopo (V1)

- Substituir `jsonwebtoken` + `@types/jsonwebtoken` por `jose`
- Substituir `swagger-jsdoc` + `swagger-ui-express` + `@types/swagger-jsdoc` + `@types/swagger-ui-express` por `swagger-autogen` + `swagger-ui-express` (abordagem já explorada em `server/swagger.ts`)
- Adicionar declaração de tipos manual para `pdf-parse-new` (arquivo `.d.ts` local)
- Remover pacotes `@types/*` que se tornarem obsoletos após as substituições

### ❌ Fora do Escopo (V1)

- Substituição de `bcryptjs` → `argon2` (quebra de compatibilidade com hashes existentes no banco de dados — avaliação para V2)
- Migração de `express` para Fastify ou Hono (mudança arquitetural — fora do escopo deste TDD)
- Substituição de `multer`, `cors`, `morgan`, `cookie-parser`, `pg`, `pdfkit`, `archiver`, `nodemailer` — estes têm `@types/*` bem mantidos e troca não traz benefício concreto no momento
- Introdução de frameworks de validação de schema (Zod, Valibot) nas rotas

### 🔮 Considerações Futuras (V2+)

- `bcryptjs` → `argon2` com script de migração de hashes (re-hash no próximo login)
- Validação de request body com Zod + integração com documentação OpenAPI

---

## Solução Técnica

### Visão Geral da Arquitetura

Nenhuma mudança estrutural no servidor. As substituições são **localizadas nos módulos de autenticação e documentação**, mantendo as interfaces externas (endpoints, contratos de API) idênticas.

```
Antes:
  routes/*.ts  ──(@swagger JSDoc)──▶  swagger-jsdoc ──▶ swagger-ui-express
  middleware/auth.ts ──────────────▶  jsonwebtoken

Depois:
  routes/*.ts  ──(sem anotações)──▶  swagger-autogen ──▶ swagger.json ──▶ swagger-ui-express
  middleware/auth.ts ──────────────▶  jose (jwtVerify / SignJWT)
```

### 1. `jsonwebtoken` → `jose`

**Motivação:** `jose` é TypeScript-nativo (tipos embutidos), baseado em WebCrypto API (disponível nativamente no Node.js 18+), mantido ativamente e alinhado com os padrões JOSE (RFC 7515–7519).

**Contrato de uso — geração de token:**

| Aspecto          | Antes (`jsonwebtoken`)           | Depois (`jose`)                              |
| ---------------- | -------------------------------- | -------------------------------------------- |
| Assinar token    | `jwt.sign(payload, secret)`      | `new SignJWT(payload).sign(encodedSecret)`   |
| Verificar token  | `jwt.verify(token, secret)`      | `jwtVerify(token, encodedSecret)`            |
| Tipo do segredo  | `string`                         | `Uint8Array` via `new TextEncoder().encode()` |
| Retorno verify   | `string \| JwtPayload` (impreciso) | `{ payload, protectedHeader }` (tipado)      |
| Async/sync       | Síncrono                         | Assíncrono (Promise)                         |

**Impacto nos arquivos:**
- `server/src/routes/auth.ts` — geração de `accessToken` e `refreshToken`
- `server/src/middleware/auth.ts` — verificação do `accessToken` via cookie

**Compatibilidade:** Tokens JWS (HS256) gerados por `jsonwebtoken` são verificáveis pelo `jose` — usuários com sessão ativa não serão deslogados na transição, **desde que o algoritmo permaneça HS256**.

### 2. `swagger-jsdoc` → `swagger-autogen`

**Motivação:** `swagger-autogen` analisa as rotas automaticamente e gera o `swagger.json`, eliminando a necessidade de anotações JSDoc manuais. O arquivo `server/swagger.ts` já contém a configuração inicial.

**Fluxo de geração:**

```
swagger.ts (script)
   └──▶  swagger-autogen(outputFile, routeFiles, docDefinition)
              └──▶  swagger.json  (gerado em build/dev)
                         └──▶  swaggerUi.setup(require('./swagger.json'))
```

**Mudanças no `index.ts`:**

| Aspecto                  | Antes                                             | Depois                                          |
| ------------------------ | ------------------------------------------------- | ----------------------------------------------- |
| Geração do spec          | `swaggerJsdoc(options)` em runtime                | Leitura de `swagger.json` pré-gerado            |
| Anotações nas rotas      | `@swagger` JSDoc em cada handler                  | Removidas (autogen infere das definições)       |
| Atualização do spec      | A cada restart do servidor                        | Ao rodar `npm run swagger`                      |

**Script adicionado ao `package.json`:**
```
"swagger": "tsx server/swagger.ts"
```
> O arquivo `server/swagger.ts` já existente será movido para `server/src/swagger.ts` para consistência com o restante do código-fonte.

### 3. Declaração de Tipos para `pdf-parse-new`

`pdf-parse-new` é um fork CJS de `pdf-parse` sem tipos publicados. A solução é um arquivo de declaração local:

- Criar `server/src/types/pdf-parse-new.d.ts` declarando a interface de retorno (`{ text, numpages, info, metadata, version }`) e a assinatura da função default.
- Remover o `createRequire` workaround se os tipos locais tornarem a importação direta segura, ou mantê-lo e apenas adicionar a declaração para satisfazer o compilador.

### Diagrama de Dependências (antes × depois)

```mermaid
graph LR
  subgraph Antes
    A1[jsonwebtoken] --> B1[@types/jsonwebtoken]
    A2[swagger-jsdoc] --> B2[@types/swagger-jsdoc]
    A3[swagger-ui-express] --> B3[@types/swagger-ui-express]
    A4[pdf-parse-new] --> B4[sem tipos]
  end
  subgraph Depois
    C1[jose] --> D1[tipos embutidos]
    C2[swagger-autogen] --> D2[tipos embutidos]
    C3[swagger-ui-express] --> B3
    C4[pdf-parse-new] --> D4[src/types/pdf-parse-new.d.ts]
  end
```

---

## Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Tokens JWT existentes inválidos após migração para `jose` | Alto (logout forçado de todos os usuários) | Baixo (HS256 é compatível entre libs) | Verificar compatibilidade de algoritmo em branch de staging antes de mergear; rotacionar secret apenas se necessário |
| `swagger-autogen` não inferir corretamente parâmetros complexos (body, query) | Médio (documentação incompleta) | Médio | Complementar inferência automática com anotações manuais nos casos edge; testar `swagger.json` gerado antes de remover JSDoc |
| Tipos locais de `pdf-parse-new` incompletos | Baixo (erros de compilação em `services/ai.ts`) | Baixo | Declarar apenas os campos efetivamente utilizados; marcar resto como `unknown` |
| Regressão em fluxo de autenticação (`login`, `refresh`, `logout`) | Alto (usuários incapazes de autenticar) | Baixo | Testes manuais completos em staging de todos os fluxos de auth antes do deploy |
| `swagger-ui-express` continua dependendo de `@types/swagger-ui-express` | Baixo (manutenção de um @types) | Certo | Aceitável — `swagger-ui-express` não é TS-nativo e o `@types` é bem mantido; não há substituto direto |

---

## Plano de Implementação

| Fase | Tarefa | Descrição | Estimativa |
|------|--------|-----------|------------|
| **1 — JWT** | Instalar `jose` | `npm install jose` + remover `jsonwebtoken` e `@types/jsonwebtoken` | 0,5d |
| | Migrar `routes/auth.ts` | Substituir `jwt.sign()` por `new SignJWT().sign()` para access e refresh tokens | 1d |
| | Migrar `middleware/auth.ts` | Substituir `jwt.verify()` por `jwtVerify()` | 0,5d |
| | Testes manuais auth | Testar login, refresh, logout, acesso a rota protegida | 0,5d |
| **2 — Swagger** | Instalar `swagger-autogen` | `npm install swagger-autogen` + remover `swagger-jsdoc` e `@types/swagger-jsdoc` | 0,5d |
| | Mover e ajustar `swagger.ts` | Mover `server/swagger.ts` → `server/src/swagger.ts`; ajustar paths e `package.json` | 0,5d |
| | Atualizar `index.ts` | Substituir geração inline por leitura do `swagger.json` gerado; remover import de `swaggerJsdoc` | 0,5d |
| | Remover anotações JSDoc | Limpar comentários `@swagger` das rotas | 1d |
| | Validar documentação gerada | Comparar endpoints documentados antes × depois; corrigir lacunas | 1d |
| **3 — Tipos `pdf-parse-new`** | Criar `.d.ts` local | Declarar interface de retorno e assinatura da função default | 0,5d |
| | Ajustar `services/ai.ts` | Simplificar import se possível; garantir compilação limpa | 0,5d |
| **4 — Limpeza** | Remover `@types` obsoletos | Remover `@types/jsonwebtoken`, `@types/swagger-jsdoc` do `package.json` | 0,25d |
| | Verificar `typecheck` | `npm run typecheck` sem erros | 0,25d |
| | Atualizar `CLAUDE.md` server | Atualizar referências de libs na documentação interna | 0,25d |

**Estimativa total:** ~7 dias

---

## Estratégia de Testes

| Tipo | Escopo | Abordagem |
|------|--------|-----------|
| **Manual — Auth** | Fluxo completo de autenticação | Testar via Swagger UI ou Postman: register → login → acesso à rota protegida → refresh → logout → acesso negado |
| **Manual — JWT compat.** | Token emitido por `jose` verificado com sucesso | Login, copiar cookie `accessToken`, chamar `/api/auth/me` — deve retornar 200 |
| **Manual — Swagger** | Documentação correta em `/api-docs` | Todos os endpoints visíveis, parâmetros e bodies corretos |
| **Compilação** | TypeScript sem erros | `npm run typecheck` deve passar sem erros ou warnings |
| **Build** | Compilação para `dist/` | `npm run build` deve concluir sem erros |

**Cenários críticos para auth:**
- ✅ Login com credenciais válidas → `accessToken` + `refreshToken` nos cookies
- ✅ Acesso a rota protegida com token válido → 200
- ✅ Acesso a rota protegida com token expirado → 401
- ✅ Refresh com `refreshToken` válido → novo `accessToken`
- ✅ Logout → cookies limpos, refresh token revogado no banco
- ✅ Acesso após logout → 401

---

## Monitoramento e Observabilidade

Não há mudança de comportamento observável em produção. Os logs Winston existentes cobrem os fluxos de autenticação. Pontos de atenção pós-deploy:

- Monitorar logs de erro em `middleware/auth.ts` para erros `JWTInvalid` ou `JWTExpired` do `jose` — qualquer aumento indica problema de compatibilidade de tokens.
- Verificar `/api-docs` no ambiente de staging para garantir que o `swagger.json` gerado foi corretamente incluído no deploy.

---

## Plano de Rollback

**Triggers para rollback:**
- Erros de autenticação em mais de 5% das requisições pós-deploy
- `/api-docs` inacessível ou documentação incorreta em produção

**Passos:**
1. Reverter o commit da migração via `git revert` ou retornar ao branch anterior
2. Reinstalar dependências (`npm install` no servidor de produção ou rebuild do container Docker)
3. Verificar que `accessToken` e `refreshToken` voltam a ser emitidos corretamente
4. Investigar causa raiz antes de re-tentar o deploy

> **Nota:** Usuários que receberam tokens assinados por `jose` antes do rollback precisarão fazer login novamente (tokens HS256 são compatíveis nos dois sentidos, mas em caso de rollback emergencial pode-se rotacionar o `JWT_SECRET` para invalidar todos os tokens ativos).

---

## Alternativas Consideradas

| Opção | Prós | Contras | Decisão |
|-------|------|---------|---------|
| **Manter `jsonwebtoken`** | Zero esforço | Tipos externos (`@types/jsonwebtoken`), não TypeScript-nativo | ❌ Rejeitado — objetivo do TDD é eliminar dependências externas de tipos |
| **`jose`** *(escolhido)* | TypeScript-nativo, WebCrypto, RFC-compliant, mantido ativamente | API async (requer `await`) | ✅ Escolhido |
| **`@fastify/jwt`** | Integração nativa com Fastify | Requer migração de Express → Fastify | ❌ Rejeitado — fora do escopo |
| **`swagger-autogen`** *(escolhido)* | Já explorado, mais simples, sem refatoração de rotas | Inferência automática pode ser imprecisa em casos complexos | ✅ Escolhido |
| **`tsoa`** | TypeScript-first com decorators, validação de tipos | Exige refatoração completa de todas as rotas para o padrão `@Route`/`@Get` | ❌ Rejeitado — impacto demasiado alto para V1 |
| **Manter `swagger-jsdoc`** | Zero esforço | JSDoc frágil, sem validação TypeScript | ❌ Rejeitado |

---

## Questões em Aberto

| # | Questão | Status |
|---|---------|--------|
| 1 | O `swagger-autogen` infere corretamente todos os bodies e query params das rotas existentes, ou será necessário manter anotações manuais em alguns endpoints? | 🔴 A verificar na Fase 2 |
| 2 | O `swagger-ui-express` deve ser substituído por alternativa TS-nativa, ou manter com `@types/swagger-ui-express`? | 🟡 Avaliar após V1 — impacto baixo |
| 3 | Rotacionar `JWT_SECRET` após migração para `jose` (invalidando sessões ativas) ou manter compatibilidade? | 🔴 Decisão antes do deploy em produção |
