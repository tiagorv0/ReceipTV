# TDD - Sistema de Migrations Versionado

| Campo          | Valor                          |
| -------------- | ------------------------------ |
| Tech Lead      | Tiago Vazzoller                |
| Status         | Draft                          |
| Criado em      | 2026-03-22                     |
| Última revisão | 2026-03-22                     |

---

## Contexto

O ReceipTV é uma aplicação full-stack de gerenciamento de comprovantes financeiros com extração via IA. O backend é um servidor Node.js (Express 5, ESM) conectado a um banco PostgreSQL 17, hospedado no Render.

Atualmente, mudanças de schema são gerenciadas por dois arquivos isolados e desconectados entre si:

- `migrate.js` (raiz): executa um `ALTER TABLE` hardcoded para adicionar colunas de arquivo nos recibos
- `server/migrations/create_refresh_tokens.js`: cria a tabela `refresh_tokens` com índices

Cada um é um script Node.js independente, sem nenhum controle de versão ou rastreamento do que já foi aplicado em cada ambiente.

À medida que o projeto cresce, adicionar novas colunas, tabelas ou índices de forma segura e rastreável torna-se crítico para evitar inconsistências entre os ambientes de desenvolvimento e produção.

---

## Definição do Problema

### Problemas a Resolver

- **Migrations hardcoded sem versão**: Os scripts atuais (`migrate.js` e `create_refresh_tokens.js`) executam SQL fixo sem nenhum versionamento. Adicionar uma nova mudança de schema exige criar outro script isolado no mesmo padrão.
  - Impacto: Crescimento desordenado de scripts, sem histórico e sem garantia de ordem de execução.

- **Sem rastreamento de estado**: Não há registro de quais migrations já foram aplicadas no banco. Em um novo ambiente (staging, produção), não é possível saber o estado atual do schema sem inspecionar o banco manualmente.
  - Impacto: Risco de executar migrations já aplicadas ou pular migrations necessárias.

- **Deploy manual e frágil**: A execução de migrations é desconectada do deploy. Em produção no Render, o schema pode ficar desatualizado se ninguém lembrar de rodar o script.
  - Impacto: Erros em produção por schema desatualizado.

### Por Que Agora?

O branch `feat/user-email` adicionou o campo `email` na tabela `users`, e a migration correspondente ainda não existe. Esse é o momento ideal para estruturar o sistema antes que o número de mudanças cresça.

### Impacto de Não Resolver

- **Técnico**: Acúmulo de migrations hardcoded, sem rollback, sem rastreamento — risco crescente a cada nova feature.
- **Produção**: Deploy com schema desatualizado causando erros 500 silenciosos.

---

## Escopo

### ✅ Em Escopo (V1)

- Criar estrutura de diretório `server/migrations/` com arquivos `.sql` versionados
- Criar tabela de controle `schema_migrations` no PostgreSQL
- Implementar runner de migrations em `server/config/migrations.js` que executa apenas as migrations pendentes, em ordem
- Integrar execução automática no boot do servidor (`server/index.js`)
- Expor script manual via `npm run migrate` no `package.json`
- Converter as migrations existentes para o novo formato:
  - `migrate.js` → `001_add_arquivo_columns.sql`
  - `server/migrations/create_refresh_tokens.js` → `002_create_refresh_tokens.sql`
- Criar migration para o campo `email` adicionado na tabela `users` → `003_add_user_email.sql`

### ❌ Fora de Escopo (V1)

- Migrations de rollback / down migrations
- Interface visual para status de migrations
- Suporte a múltiplos bancos ou schemas
- Integração com ferramentas externas (Flyway, Liquibase, Knex)
- Testes automatizados do runner de migrations

### 🔮 Futuro (V2+)

- Down migrations (rollback de schema)
- Validação de checksum dos arquivos SQL
- Dry-run mode (simular sem aplicar)

---

## Solução Técnica

### Visão Geral

O sistema de migrations versionado é composto por três partes:

1. **Arquivos SQL versionados** em `server/migrations/` com prefixo numérico (`001_`, `002_`, ...)
2. **Runner** em `server/config/migrations.js` que lê os arquivos, compara com a tabela de controle e executa apenas os pendentes
3. **Integração** no boot do servidor e como script npm

### Fluxo de Dados

```
Boot do Servidor / npm run migrate
        │
        ▼
Runner: server/config/migrations.js
        │
        ├─► Conecta ao PostgreSQL
        │
        ├─► Cria tabela schema_migrations (se não existir)
        │
        ├─► Lê arquivos de server/migrations/ (ordenados)
        │
        ├─► Compara com registros em schema_migrations
        │
        └─► Para cada migration pendente:
                ├─► Executa SQL em transação
                └─► Registra versão em schema_migrations
```

### Estrutura de Arquivos

```
server/
  config/
    migrations.js                       ← Runner de migrations (novo)
  migrations/
    001_add_arquivo_columns.sql         ← Convertida do migrate.js (raiz)
    002_create_refresh_tokens.sql       ← Convertida do create_refresh_tokens.js
    003_add_user_email.sql              ← Nova migration (feat/user-email)
```

**Arquivos removidos após a migração:**
- `migrate.js` (raiz)
- `server/migrations/create_refresh_tokens.js`

### Tabela de Controle

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ  DEFAULT NOW()
);
```

- `version`: nome do arquivo sem extensão (ex: `001_add_arquivo_columns`)
- `applied_at`: timestamp de quando foi aplicada

### Contrato do Runner

O runner deve:
- Ser idempotente: rodar várias vezes não causa efeitos colaterais
- Executar cada migration em uma transação individual (falha em uma não afeta as anteriores já aplicadas)
- Logar cada migration aplicada via Winston
- Lançar erro (e encerrar o processo) se uma migration falhar, impedindo o servidor de subir com schema inválido

### Integração no Boot

```
server/index.js
  └─► await runMigrations()   ← executa ANTES do app.listen()
  └─► app.listen(PORT, ...)
```

### Script npm

```json
// package.json (raiz)
"scripts": {
  "migrate": "node server/config/migrations.js"
}
```

### Convenção de Nomenclatura dos Arquivos

```
{NNN}_{descricao_snake_case}.sql

Exemplos:
  001_add_arquivo_columns.sql
  002_add_user_email.sql
  003_create_categories_table.sql
```

- `NNN`: número sequencial com 3 dígitos (001, 002, ...)
- Descrição em snake_case, concisa

---

## Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Migration falha no boot em produção | Alto — servidor não sobe | Baixa | Runner lança erro explícito; Render mostrará o log; corrigir e fazer novo deploy |
| Arquivo SQL com erro de sintaxe | Alto — bloqueia o boot | Baixa | Testar sempre localmente antes do commit; transação garante rollback automático do SQL |
| Ordem incorreta de migrations (arquivos fora de ordem) | Médio — dependências quebradas | Baixa | Prefixo numérico `001_`, `002_` garante ordem lexicográfica correta |
| Migration já aplicada manualmente no banco (estado inconsistente) | Médio — runner tenta reaplicar | Baixa | Inserir manualmente o registro em `schema_migrations` para sincronizar o estado |
| Múltiplas instâncias rodando migrations simultaneamente | Médio — race condition | Baixa (Render usa 1 instância no free tier) | `PRIMARY KEY` em `version` garante que apenas uma inserção terá sucesso; segunda instância pula |

---

## Plano de Implementação

| Fase | Tarefa | Descrição | Status | Estimativa |
|------|--------|-----------|--------|------------|
| **1 - Runner** | Criar `server/config/migrations.js` | Lógica de leitura, comparação e execução das migrations | TODO | 2h |
| **1 - Runner** | Criar tabela `schema_migrations` no boot do runner | SQL embutido no próprio runner | TODO | 30min |
| **2 - Migrations** | Criar `001_add_arquivo_columns.sql` | Converter SQL do `migrate.js` (raiz) | TODO | 15min |
| **2 - Migrations** | Criar `002_create_refresh_tokens.sql` | Converter SQL do `create_refresh_tokens.js` | TODO | 15min |
| **2 - Migrations** | Criar `003_add_user_email.sql` | Migration para o campo `email` na tabela `users` | TODO | 15min |
| **3 - Integração** | Integrar runner no `server/index.js` | Chamar `runMigrations()` antes do `app.listen()` | TODO | 30min |
| **3 - Integração** | Adicionar script `migrate` no `package.json` | Permitir execução manual | TODO | 15min |
| **4 - Limpeza** | Remover `migrate.js` da raiz | Substituído pelo novo sistema | TODO | 5min |
| **4 - Limpeza** | Remover `server/migrations/create_refresh_tokens.js` | Substituído pelo arquivo `.sql` equivalente | TODO | 5min |
| **4 - Limpeza** | Atualizar `CLAUDE.md` com nova instrução | Documentar convenção de nomenclatura | TODO | 15min |

**Estimativa total**: ~4 horas

---

## Estratégia de Testes

### Testes Manuais (V1)

Como é um projeto pequeno sem suite de testes automatizados para infraestrutura, a validação será feita manualmente:

| Cenário | Como testar | Resultado esperado |
|---------|-------------|---------------------|
| Primeira execução (banco limpo) | `npm run migrate` com banco vazio | Cria `schema_migrations`, aplica `001`, `002` e `003`, loga cada uma |
| Reexecução (idempotência) | Rodar `npm run migrate` duas vezes | Segunda execução não aplica nada, loga "Nenhuma migration pendente" |
| Boot do servidor aplica migrations | `npm run server` com migration pendente | Servidor sobe após aplicar migrations |
| Migration com erro de SQL | Inserir SQL inválido em um arquivo `.sql` | Runner falha com erro, servidor não sobe, transação revertida |
| Nova migration adicionada | Criar `004_...sql` e rodar | Apenas `004` é aplicada, anteriores ignoradas |

### Validação em Produção

Após o deploy no Render:
1. Verificar logs de boot no painel do Render
2. Confirmar que as migrations foram aplicadas: `SELECT * FROM schema_migrations;`
3. Confirmar que o servidor subiu normalmente
