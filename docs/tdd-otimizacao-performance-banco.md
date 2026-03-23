# TDD - Otimização de Performance das Requisições ao Banco de Dados

| Campo          | Valor                                                       |
| -------------- | ----------------------------------------------------------- |
| Tech Lead      | @tiagorv0                                                   |
| Status         | Draft                                                       |
| Criado em      | 2026-03-23                                                  |
| Última revisão | 2026-03-23                                                  |

---

## Contexto

O ReceipTV está em produção com o backend hospedado no **Render** (free tier) e o banco de dados **PostgreSQL** no **Supabase** (free tier). O frontend também está no Render.

Com o uso real da aplicação, foi identificado que as requisições ao banco de dados estão levando em média **2 segundos** por chamada, impactando significativamente a experiência do usuário.

A investigação do código revelou múltiplos problemas que, combinados, explicam essa latência elevada: desde queries que retornam dados desnecessários (blobs de arquivos incluídos em listagens), passando por ausência de índices, até configuração incorreta da conexão para o ambiente de cloud.

---

## Definição do Problema

### Problemas Identificados

- **Problema 1 — `SELECT *` retornando `BYTEA` na listagem de comprovantes**
  - A rota `GET /api/receipts` executa `SELECT * FROM receipts WHERE user_id = $1`.
  - O campo `arquivo_data` (BYTEA) armazena o arquivo original (PDF ou imagem), podendo ter vários MB por registro.
  - Impacto: cada listagem trafega todos os arquivos do usuário pela rede desnecessariamente, consumindo banda e aumentando latência de forma proporcional ao número e tamanho dos comprovantes.

- **Problema 2 — SSL desabilitado na conexão com o Supabase**
  - `server/config/database.js` tem o SSL comentado: `//ssl: { rejectUnauthorized: false }`.
  - O Supabase exige SSL para conexões externas. Sem SSL explícito, o driver `pg` pode falhar silenciosamente, cair em fallback sem criptografia, ou ter handshake problemático.
  - Impacto: instabilidade de conexão, possível overhead de reconexão por falha de SSL.

- **Problema 3 — Usando conexão direta (porta 5432) ao invés do Transaction Pooler do Supabase**
  - Servidores serverless/efêmeros como o Render free tier criam e destroem conexões frequentemente.
  - A conexão direta (porta 5432) no Supabase é cara: cada nova conexão exige autenticação, alocação de processo e memória no servidor.
  - O Supabase oferece o **Transaction Pooler via PgBouncer** (porta **6543**), que reutiliza conexões e é a escolha recomendada para ambientes serverless.
  - Impacto: latência elevada no estabelecimento de conexão a cada requisição.

- **Problema 4 — Ausência de índices em colunas críticas**
  - A tabela `receipts` não tem índice em `user_id` nem em `data_pagamento`.
  - Todas as queries filtram por `user_id` (e opcionalmente por `data_pagamento`), forçando `seq scan` a cada consulta.
  - Impacto: tempo de query cresce linearmente com o volume de dados.

- **Problema 5 — 4 queries sequenciais em `/reports/summary`**
  - A rota executa 4 `pool.query()` em sequência com `await` encadeado.
  - Cada query espera a anterior terminar antes de iniciar, somando 4 round-trips ao banco.
  - Impacto: latência acumulada desnecessária — as 4 queries são independentes entre si.

- **Problema 6 — Pool sem configuração adequada para free tier em nuvem**
  - `pg.Pool` criado sem `max`, `idleTimeoutMillis`, `connectionTimeoutMillis`.
  - Defaults do `pg` não são otimizados para conexões instáveis de free tier.
  - Impacto: conexões idle acumuladas, timeout sem mensagem de erro clara, comportamento imprevisível.

### Por Que Resolver Agora

- A latência de 2s é perceptível e prejudica a usabilidade.
- Os problemas são de baixa complexidade e alto impacto — a maioria é corrigida com poucas linhas de código.
- Sem correção, a performance piora conforme o volume de dados do usuário cresce.

### Impacto de NÃO Resolver

- **Usuário:** experiência degradada com carregamento lento em todas as telas.
- **Técnico:** aumento linear do tempo de resposta conforme os dados crescem (sem índice + BYTEA na listagem).
- **Infraestrutura:** consumo excessivo de banda por transferir dados binários desnecessários.

---

## Escopo

### ✅ Em Escopo (V1)

- Corrigir `SELECT *` na listagem de comprovantes para excluir `arquivo_data`
- Habilitar SSL na configuração do pool do PostgreSQL
- Trocar a `DATABASE_URL` de produção para usar o Transaction Pooler do Supabase (porta 6543)
- Adicionar índices em `receipts(user_id)` e `receipts(user_id, data_pagamento)` via migration
- Paralelizar as 4 queries do endpoint `/reports/summary` com `Promise.all`
- Configurar parâmetros do `pg.Pool` adequados para o ambiente de nuvem free tier

### ❌ Fora do Escopo (V1)

- Cache em memória (Redis) — overkill para o volume atual
- Paginação da listagem de comprovantes — melhoria futura
- Otimização das queries de AI analysis — latência dominada pelo LLM, não pelo banco
- Migração para outro provedor de banco ou plano pago

### 🔮 Considerações Futuras (V2+)

- Paginação em `GET /receipts` quando o volume crescer
- Cache de relatórios (`/reports/summary`) com invalidação por TTL
- Monitoramento de slow queries via Supabase Dashboard

---

## Solução Técnica

### Visão Geral da Arquitetura

Nenhuma mudança arquitetural. As correções são todas pontuais: configuração de conexão, queries e migration de índices.

```
Render (Backend) ──SSL──► Supabase PgBouncer (6543) ──► PostgreSQL
                           (Transaction Pooler)
```

### 1. Corrigir `SELECT *` na listagem — `server/routes/receipts.js`

**Problema:** `SELECT * FROM receipts` inclui o campo `arquivo_data` (BYTEA).

**Solução:** Selecionar explicitamente apenas os campos necessários para a listagem, excluindo `arquivo_data`.

**Campos a retornar na listagem:**
```
id, user_id, nome, valor, data_pagamento, banco, tipo_pagamento, descricao,
arquivo_mimetype, arquivo_nome, created_at
```

O campo `arquivo_data` **só deve ser retornado** na rota dedicada `GET /receipts/:id/file`.

---

### 2. Configurar conexão SSL e Transaction Pooler — `server/config/database.js`

**Problema:** SSL comentado, pool sem parâmetros para nuvem.

**Solução:**

```
Pool configurado com:
- ssl: { rejectUnauthorized: false }     → SSL obrigatório para Supabase
- max: 5                                  → Limite de conexões (free tier tem limite de 15 conn diretas)
- idleTimeoutMillis: 30000               → Fecha conexões ociosas em 30s
- connectionTimeoutMillis: 10000         → Timeout de 10s para obter conexão do pool
- statement_timeout: 10000               → Mantém timeout de queries em 10s
```

**Troca de porta na `DATABASE_URL` (ambiente de produção):**

A `DATABASE_URL` no Render deve ser trocada da conexão direta (porta 5432) para o **Transaction Pooler** do Supabase (porta **6543**).

No Supabase Dashboard:
> Project Settings → Database → Connection string → **Transaction pooler**

A string de conexão do pooler tem o formato:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

> ⚠️ Apenas a variável de ambiente `DATABASE_URL` no Render precisa ser atualizada — nenhuma mudança de código para a URL em si.

---

### 3. Paralelizar queries em `/reports/summary` — `server/routes/reports.js`

**Problema:** 4 `await pool.query()` sequenciais.

**Solução:** Executar todas em paralelo com `Promise.all`:

```
const [totalResult, byBankResult, byTypeResult, monthlyResult] = await Promise.all([
  pool.query(...),
  pool.query(...),
  pool.query(...),
  pool.query(...),
])
```

Reduz a latência total de `~4 × round-trip` para `~1 × round-trip` (o tempo do mais lento).

---

### 4. Adicionar índices via migration

**Índices a criar:**

| Índice | Tabela | Colunas | Justificativa |
|--------|--------|---------|---------------|
| `idx_receipts_user_id` | `receipts` | `user_id` | Todas as queries filtram por `user_id` |
| `idx_receipts_user_date` | `receipts` | `user_id, data_pagamento` | Queries com filtro de data usam ambas as colunas |

**SQL da migration:**
```sql
CREATE INDEX IF NOT EXISTS idx_receipts_user_id
  ON receipts (user_id);

CREATE INDEX IF NOT EXISTS idx_receipts_user_date
  ON receipts (user_id, data_pagamento);
```

A migration deve ser adicionada ao sistema de migrations existente (`migrate.js`) e aplicada em produção via `node migrate.js`.

---

### Impacto Esperado por Correção

| Correção | Ganho Estimado | Tipo |
|----------|---------------|------|
| Remover BYTEA do SELECT * | Alto — elimina MB de tráfego por request | Rede / throughput |
| Transaction Pooler (porta 6543) | Alto — elimina overhead de nova conexão por request | Latência de conexão |
| SSL habilitado | Médio — estabiliza conexão, elimina handshake inconsistente | Estabilidade |
| Promise.all no summary | Médio — reduz latência de ~4x round-trip para ~1x | Latência de query |
| Índices | Médio/Alto — elimina seq scan (cresce com dados) | Tempo de query |
| Configuração do Pool | Baixo/Médio — elimina timeout e reconexão desnecessária | Estabilidade |

---

## Riscos

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Transaction Pooler incompatível com `pg.Pool` | Alto — queries falham | Baixa | Testar em staging antes de produção; pooler do Supabase é compatível com `pg` |
| Índice em tabela com volume alto bloqueia tabela | Médio — indisponibilidade breve | Baixa | Usar `CREATE INDEX CONCURRENTLY` se a tabela tiver muitos registros |
| Quebra de contrato da API ao remover campos do SELECT * | Alto — frontend quebra | Média | Verificar todos os campos consumidos pelo frontend antes de remover |
| SSL `rejectUnauthorized: false` aceita certificados inválidos | Baixo — risco de segurança | Baixa | Aceitável para Supabase (certificado confiável); padrão do ecossistema para conexões gerenciadas |
| `Promise.all` faz uma query falhar silenciosamente | Médio — dados parciais | Baixa | `Promise.all` rejeita se qualquer promise falhar — o `catch` existente trata corretamente |

---

## Plano de Implementação

| Fase | Tarefa | Arquivo | Estimativa |
|------|--------|---------|------------|
| **1 — Queries** | Substituir `SELECT *` por campos explícitos na listagem | `server/routes/receipts.js` | 30min |
| **1 — Queries** | Paralelizar 4 queries com `Promise.all` | `server/routes/reports.js` | 15min |
| **2 — Banco** | Criar migration com os 2 índices | novo arquivo em `database/` | 15min |
| **2 — Banco** | Aplicar migration em produção | `node migrate.js` | 5min |
| **3 — Conexão** | Habilitar SSL e configurar parâmetros do Pool | `server/config/database.js` | 15min |
| **3 — Conexão** | Trocar `DATABASE_URL` no Render para Transaction Pooler (porta 6543) | Variável de ambiente no Render | 5min |
| **4 — Validação** | Testar todas as rotas afetadas manualmente | — | 30min |

**Estimativa total:** ~2 horas

**Ordem de execução:**
1. Fases 1 e 2 podem ser feitas em paralelo
2. Fase 3 deve ser a última (mexe na conexão — risco maior)
3. Fase 4 obrigatória antes de considerar concluído

---

## Estratégia de Testes

| Tipo | Escopo | Cenários Críticos |
|------|--------|-------------------|
| Manual / smoke | Todas as rotas afetadas | `GET /receipts` não retorna `arquivo_data` no JSON; `GET /receipts/:id/file` ainda retorna o arquivo corretamente |
| Manual / smoke | `/reports/summary` | Retorna os 4 campos (`total`, `byBank`, `byType`, `monthly`) corretamente |
| Manual / smoke | Conexão após deploy | Primeira request após cold start do Render não falha por timeout de conexão |
| Manual | Migration | Índices existem no Supabase Dashboard após `node migrate.js` |

**Checklist antes de deployar a fase 3:**
- [ ] Confirmar string de conexão do Transaction Pooler no Supabase Dashboard
- [ ] Testar nova `DATABASE_URL` localmente (se possível) antes de atualizar no Render
- [ ] Monitorar logs no Render nos primeiros minutos após o deploy

---

## Monitoramento e Observabilidade

Após o deploy, monitorar por pelo menos **24h**:

| O que observar | Onde | Sinal de sucesso |
|----------------|------|-----------------|
| Logs de erro de conexão | Render → Logs | Ausência de `connection refused`, `SSL`, ou `timeout` |
| Tamanho da resposta de `GET /receipts` | DevTools → Network | Redução visível no tamanho da resposta |
| Tempo de resposta percebido | Uso real do app | Listagem e dashboard mais rápidos |
| Erros 500 em qualquer rota | Render → Logs | Zero erros após deploy |

---

## Plano de Rollback

### Gatilhos para rollback

- Erros 500 em qualquer rota após o deploy
- Falha de conexão com o banco em produção
- Dados ausentes ou incorretos na resposta das rotas

### Passos de rollback

1. **Se o problema for na `DATABASE_URL`:** reverter a variável de ambiente no Render para a string de conexão direta (porta 5432) anterior e fazer redeploy.
2. **Se o problema for no código:** reverter o commit via `git revert` e fazer redeploy no Render.
3. **Se o problema for na migration (índices):** os índices podem ser dropados sem perda de dados — `DROP INDEX IF EXISTS idx_receipts_user_id; DROP INDEX IF EXISTS idx_receipts_user_date;` — executar via Supabase SQL Editor.

> Os índices são **não-destrutivos** — não alteram dados, apenas metadados. São a parte de menor risco.

---

## Questões em Aberto

| # | Questão | Status |
|---|---------|--------|
| 1 | O frontend consome algum campo além dos listados na query corrigida? | 🔴 Verificar antes de implementar |
| 2 | A `DATABASE_URL` atual em produção é conexão direta ou já usa pooler? | 🔴 Verificar no Render antes da fase 3 |
