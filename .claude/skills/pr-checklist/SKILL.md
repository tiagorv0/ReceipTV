---
name: pr-checklist
description: Gera uma checklist de PR para o ReceipTV verificando as convenções do projeto no diff atual contra master
---

Gere uma checklist de revisão para o PR atual do ReceipTV.

## Passos

1. **Obtenha o diff**: rode `git diff master...HEAD --name-only` para listar os arquivos alterados e `git diff master...HEAD --stat` para um resumo.

2. **Analise o diff por categoria**:
   - Arquivos em `server/routes/` → verificar Swagger e Winston
   - Arquivos em `client/src/` → verificar mobile-first e convenções de UI
   - Arquivos em `server/migrations/` → verificar numeração e idempotência
   - Arquivos `.env` → alertar se aparecerem (não devem ser commitados)

3. **Gere a checklist** com base nos arquivos alterados. Só inclua itens relevantes ao diff — não liste itens sobre código que não foi tocado.

## Itens a verificar por contexto

### Backend (`server/routes/*.js` alterado)
- [ ] Todos os novos endpoints têm bloco `@swagger` documentado?
- [ ] Queries SQL usam parâmetros `$1, $2, ...` (sem interpolação)?
- [ ] `logger.error()` está nos blocos `catch` de operações críticas?
- [ ] Middleware `auth` aplicado em rotas protegidas?
- [ ] Mensagens de erro ao cliente são genéricas (sem SQL/stack trace)?

### Frontend (`client/src/**` alterado)
- [ ] Layout funciona em mobile (sem prefixo = mobile, `md:` = desktop)?
- [ ] Campos de senha usam `PasswordInput` de `src/components/ui/input.jsx`?
- [ ] Collapse/expand usa `grid-template-rows: 0fr → 1fr` (não `max-height`)?
- [ ] Filtros persistidos via `useSearchParams` se aplicável?
- [ ] Scrollbar não foi sobrescrita por componente (global em `index.css`)?

### Migrações (`server/migrations/*.sql` alterado)
- [ ] Nome segue o padrão incremental `NNN_descricao.sql`?
- [ ] SQL usa `IF NOT EXISTS` / `IF EXISTS` para idempotência?
- [ ] Sem `BEGIN`/`COMMIT` no arquivo (runner já gerencia)?

### Geral
- [ ] Backend usa ESM (`import`/`export`) — nenhum `require()`?
- [ ] Nenhum arquivo `.env` incluído no diff?
- [ ] `CLAUDE.md` atualizado se uma nova convenção foi introduzida?

## Formato da resposta

```
## Checklist de PR — <nome do branch>

**Arquivos alterados:** X arquivos (Y backend, Z frontend)

### ✅ Backend
- [x] ...
- [ ] ...

### ✅ Frontend
- [x] ...
- [ ] ...

### ✅ Geral
- [x] ...
- [ ] ...

---
**Status:** Pronto para PR / Pendências antes do merge
```

Marque `[x]` para itens confirmados no diff e `[ ]` para itens que precisam de atenção ou não puderam ser verificados automaticamente.
