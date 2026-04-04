---
name: new-migration
description: Cria um novo arquivo de migração SQL seguindo a convenção NNN_descricao.sql do projeto ReceipTV
---

Crie um novo arquivo de migração SQL para o projeto ReceipTV.

## Contexto do sistema de migrações

- Arquivos ficam em `server/migrations/`
- Nomenclatura: `NNN_descricao.sql` (NNN = número com 3 dígitos, ex: `006_...`)
- O runner (`server/config/migrations.js`) já envolve cada migração em `BEGIN`/`COMMIT` — **não adicionar transaction no arquivo SQL**
- O `version` registrado em `schema_migrations` é o nome do arquivo sem a extensão `.sql`
- Para rodar manualmente: `npm run migrate` (na raiz) ou `node server/config/migrations.js`

## Passos

1. **Descubra o próximo número**: liste os arquivos em `server/migrations/` que terminam em `.sql`, ordene, pegue o número do último arquivo e incremente em 1. Formate com 3 dígitos (ex: `006`, `007`).

2. **Monte o nome do arquivo**: `<NNN>_<descricao>.sql`, onde `<descricao>` é o argumento fornecido em snake_case (substitua espaços e hífens por `_`, tudo minúsculo). Se nenhum argumento foi fornecido, use `nova_migracao`.

3. **Crie o arquivo** em `server/migrations/<NNN>_<descricao>.sql` com o conteúdo adequado para a operação descrita.
   - Se o argumento descreve claramente a operação (ex: `add_coluna_categoria_receipts`), gere o SQL correspondente usando `IF NOT EXISTS` / `IF EXISTS` onde aplicável para idempotência.
   - Se a operação não está clara, crie um template com comentário indicando o que preencher.
   - Nunca use `BEGIN`/`COMMIT` no arquivo — o runner já gerencia a transação.
   - Sempre use SQL parametrizado se houver dados dinâmicos.

4. **Confirme** o arquivo criado (caminho completo) e lembre o comando para executar:
   ```
   npm run migrate
   ```

## Argumento recebido

{{args}}
