# TDD — Atualizar Node.js para v24 LTS

| Campo          | Valor                          |
| -------------- | ------------------------------ |
| Tech Lead      | @tiagorv0                      |
| Time           | Tiago Vazzoller                |
| Status         | Draft                          |
| Criado em      | 2026-04-04                     |
| Última edição  | 2026-04-04                     |

---

## Contexto

O ReceipTV é um monorepo full-stack (React 19 + Vite 7 no client, Node.js + Express 5 no server) que utiliza Docker para ambientes de desenvolvimento e produção, com CI/CD via GitHub Actions e deploy no Render.

Atualmente existe uma **inconsistência de versões do Node.js** no projeto: os Dockerfiles usam Node 22, o CI usa Node 20 e não há nenhum mecanismo de lock local (`.nvmrc`, campo `engines`). Além disso, o Node.js 24 é o **Active LTS** desde outubro de 2025 (suporte até abril de 2028), trazendo melhorias de performance no V8, segurança e novas APIs estáveis.

---

## Definição do Problema

### Problemas que estamos resolvendo

- **Inconsistência de versões entre ambientes**: Docker usa Node 22, CI usa Node 20, máquina local pode ser qualquer versão. Isso pode causar bugs que aparecem apenas em um ambiente específico.
  - Impacto: falhas silenciosas, comportamento inconsistente entre dev/CI/produção.
- **CI desatualizado com Node 20**: dependências do client (Vite 7, React 19, Workbox) exigem Node >= 22.0.0. O CI com Node 20 pode quebrar a qualquer momento ou já estar ignorando warnings.
  - Impacto: builds instáveis, falsos positivos no pipeline.
- **Versão do Node fora do ciclo Active LTS**: Node 22 entrou em Maintenance LTS (outubro 2025). O ciclo Active LTS atual é o Node 24, com patches de segurança e melhorias ativas.
  - Impacto: perda de patches de segurança prioritários, menor performance.

### Por que agora?

- Node 24 LTS está estável há 6 meses (Active LTS desde Out 2025).
- As dependências do projeto já estão compatíveis — nenhuma exige Node < 22.
- A janela de atualização é segura: sem breaking changes que afetem o código do projeto.

### Impacto de NÃO resolver

- CI pode começar a falhar por incompatibilidade de dependências com Node 20.
- Perda de patches de segurança prioritários (Node 22 em Maintenance).
- Dívida técnica acumulada — quanto mais tempo, mais dependências podem exigir Node >= 24.

---

## Escopo

### ✅ Incluído (nesta entrega)

- Atualizar Dockerfiles (server e client) para `node:24-alpine`
- Atualizar GitHub Actions CI para `node-version: 24`
- Adicionar campo `engines` nos 3 `package.json` (root, server, client)
- Criar arquivo `.nvmrc` na raiz com versão 24
- Validar que todas as dependências instalam e funcionam com Node 24

### ❌ Fora do escopo

- Atualizar a versão local do Node na máquina do desenvolvedor (responsabilidade individual via `nvm install`)
- Atualizar configuração do Render (feito separadamente no dashboard)
- Atualizar dependências do projeto (npm packages) — apenas garantir compatibilidade
- Migrar para recursos novos do Node 24 (ex: novas APIs) — isso é trabalho futuro

---

## Solução Técnica

### Visão Geral

Atualização pontual de referências à versão do Node.js em todos os pontos de configuração do projeto, unificando para **Node.js 24 LTS**.

### Componentes Afetados

```
ReceipTV/
├── .nvmrc                          # CRIAR — lock de versão local
├── package.json                    # EDITAR — adicionar engines
├── server/
│   ├── package.json                # EDITAR — adicionar engines
│   └── Dockerfile                  # EDITAR — node:22-alpine → node:24-alpine
├── client/
│   ├── package.json                # EDITAR — adicionar engines
│   └── Dockerfile                  # EDITAR — node:22-alpine → node:24-alpine
├── docker-compose.yml              # SEM ALTERAÇÃO (usa Dockerfiles)
└── .github/workflows/
    ├── main.yml                    # EDITAR — node-version: 20 → 24
    └── deploy-to-render.yml        # SEM ALTERAÇÃO (sem ref a Node)
```

### Alterações por Arquivo

**1. `.nvmrc` (criar na raiz)**

Conteúdo: `24` — permite que `nvm use` detecte automaticamente a versão correta.

**2. `package.json` (raiz)**

Adicionar campo `engines`:
```json
"engines": {
  "node": ">=24.0.0"
}
```

**3. `server/package.json`**

Adicionar campo `engines`:
```json
"engines": {
  "node": ">=24.0.0"
}
```

**4. `client/package.json`**

Adicionar campo `engines`:
```json
"engines": {
  "node": ">=24.0.0"
}
```

**5. `server/Dockerfile`**

```diff
- FROM node:22-alpine
+ FROM node:24-alpine
```

**6. `client/Dockerfile`**

```diff
- FROM node:22-alpine AS builder
+ FROM node:24-alpine AS builder
```

**7. `.github/workflows/main.yml`**

```diff
  # Job: client
  - node-version: 20
  + node-version: 24

  # Job: server
  - node-version: 20
  + node-version: 24
```

### Análise de Breaking Changes (Node 22 → 24)

| Breaking Change | Afeta o projeto? | Motivo |
|----------------|-------------------|--------|
| `import assert` → `import with` | Não | Projeto não usa Import Assertions |
| `util._extend()` removido | Não | Não utilizado no código |
| `fs.rmdir` com `recursive` removido | Não | Não utilizado diretamente |
| `dirent.path` removido → `dirent.parentPath` | Não | Não utilizado |
| `process.mainModule` depreciado | Não | Projeto usa ESM, não CJS |
| `fs.F_OK` etc. depreciados | Não | Não acessados diretamente |
| V8 engine atualizado | Baixo risco | Pode afetar deps com native bindings |

**Conclusão**: nenhum breaking change afeta diretamente o código do projeto. O único risco é com dependências que usam native bindings, mas as principais (`bcryptjs` é JS puro, `pg` tem binding opcional) são compatíveis.

---

## Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Dependência com native binding incompatível com Node 24 | Alto | Baixa | Testar `npm install` + `docker compose build` antes de mergear. Se falhar, identificar pacote e buscar versão compatível |
| `pdf-parse-new` ou `pdfkit` quebram com V8 atualizado | Médio | Baixa | Testar upload de comprovante PDF + exportação PDF após build |
| CI falha por cache de node_modules com versão antiga | Baixo | Média | CI já usa `npm ci` (clean install). Se necessário, invalidar cache manualmente |
| Render não suporta Node 24 na imagem de deploy | Médio | Baixa | Render usa Docker, então a imagem já inclui Node 24. Verificar no dashboard se há config de versão separada |
| Imagem `node:24-alpine` ainda não disponível ou instável | Alto | Muito baixa | Verificar disponibilidade no Docker Hub antes de iniciar. Fallback: usar `node:24-slim` |

---

## Plano de Implementação

| Fase | Tarefa | Descrição | Estimativa |
|------|--------|-----------|------------|
| **1 — Preparação** | Verificar imagem Docker | Confirmar que `node:24-alpine` existe no Docker Hub | 5min |
| **2 — Arquivos de config** | Criar `.nvmrc` | Arquivo na raiz com `24` | 2min |
| | Adicionar `engines` | Campo nos 3 `package.json` | 5min |
| **3 — Docker** | Atualizar Dockerfiles | `node:22-alpine` → `node:24-alpine` em server e client | 5min |
| **4 — CI** | Atualizar workflow | `node-version: 20` → `24` nos 2 jobs do `main.yml` | 5min |
| **5 — Validação** | Build Docker | `docker compose build` — ambas imagens devem buildar sem erro | 10min |
| | Teste funcional | Subir containers, testar upload + listagem + exportação | 15min |
| | Verificar `npm install` | Rodar install local com Node 24 (se disponível) e conferir warnings | 5min |

**Estimativa total**: ~1 hora

---

## Estratégia de Testes

| Tipo de Teste | O que validar | Como |
|---------------|---------------|------|
| **Build Docker** | Imagens constroem sem erro | `docker compose build` |
| **Smoke test — Server** | Server inicia e responde em `/api-docs` | `docker compose up` + acessar `http://localhost:5000/api-docs` |
| **Smoke test — Client** | Client builda e serve via nginx | Acessar `http://localhost:5173` |
| **Funcional — Upload IA** | Upload de comprovante PDF/imagem com extração IA | Testar via interface web |
| **Funcional — Upload Manual** | Criação manual de comprovante | Testar via interface web |
| **Funcional — Exportação** | Exportar PDF e ZIP do histórico | Testar via interface web |
| **CI Pipeline** | Workflow `main.yml` passa nos 3 jobs | Verificar após push no GitHub |
| **Dependências** | `npm ci` sem warnings de engine mismatch | Rodar no server/ e client/ |

---

## Plano de Rollback

### Triggers para rollback

| Trigger | Ação |
|---------|------|
| `docker compose build` falha | Reverter Dockerfiles para `node:22-alpine` |
| `npm ci` falha por incompatibilidade de pacote | Reverter e investigar pacote problemático |
| Server não inicia no container | Reverter Dockerfile do server |
| Client não builda no container | Reverter Dockerfile do client |
| CI pipeline falha após push | Reverter `main.yml` para `node-version: 20` (temporário) |

### Passos de rollback

1. Reverter os commits via `git revert` (todas as alterações são em arquivos de configuração)
2. Rebuildar imagens Docker com `docker compose build`
3. Verificar que tudo volta ao estado anterior
4. Abrir issue documentando o problema encontrado

### Por que o rollback é simples

- Todas as alterações são em **arquivos de configuração** (Dockerfiles, package.json, workflow YAML)
- Nenhuma alteração de código-fonte, schema de banco ou lógica de negócio
- `git revert` de um único commit resolve tudo
