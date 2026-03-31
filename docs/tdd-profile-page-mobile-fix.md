# TDD - Ajuste de Layout e Componentes na Página de Perfil

| Campo          | Valor                          |
| -------------- | ------------------------------ |
| Tech Lead      | Tiago Reolon Vazzoller         |
| Status         | Draft                          |
| Criado em      | 2026-03-31                     |
| Última atualização | 2026-03-31                 |
| Branch         | `chore/improvements-layout`    |
| Arquivo alvo   | `client/src/pages/ProfilePage.jsx` |

---

## Contexto

A página de Perfil (`ProfilePage`) permite que o usuário visualize seus dados de conta (username e e-mail) e altere sua senha. A aplicação ReceipTV é acessada tanto via desktop quanto via dispositivos móveis, e todas as telas devem ser responsivas por convenção do projeto.

A seção "Trocar Senha" utiliza um layout de grid com colunas fixas (`grid-cols-[11rem_1fr]`) para posicionar rótulos ao lado esquerdo e inputs ao lado direito. Além disso, os inputs de senha foram implementados manualmente com `<input>` nativo + botão Eye/EyeOff, em vez de usar o componente `PasswordInput` já disponível em `client/src/components/ui/input.jsx`.

---

## Definição do Problema

### Problemas Identificados

- **Layout quebrado no mobile**: O grid `grid-cols-[11rem_1fr]` não colapsa em telas pequenas. O rótulo ocupa ~176px fixos e o input ocupa o restante — em telas de ~390px (iPhone padrão), o campo de input fica com apenas ~170px de largura, truncando o placeholder e tornando a digitação difícil.
  - Impacto visual: o texto do placeholder aparece cortado ("Digite a senha a", "Digite a nova se", "Digite a senha n").

- **Componente `PasswordInput` ignorado**: O arquivo `client/src/components/ui/input.jsx` já exporta um componente `PasswordInput` reutilizável com show/hide integrado. A `ProfilePage` reimplementa essa lógica manualmente com estado local `showPasswords` e três botões Eye/EyeOff avulsos, gerando duplicação desnecessária.

### Por que corrigir agora?

O branch `chore/improvements-layout` está ativamente dedicado a melhorias de layout e padronização de componentes. Esta correção é coesa com o objetivo do branch e tem baixo risco de regressão.

---

## Escopo

### ✅ Em Escopo

- Alterar o layout da seção "Trocar Senha" de grid com colunas fixas para layout empilhado (label acima, input abaixo), funcionando corretamente em mobile e desktop.
- Substituir os três `<input>` nativos de senha pelo componente `PasswordInput` de `ui/input.jsx`.
- Remover o estado `showPasswords` e os botões Eye/EyeOff avulsos, já que o `PasswordInput` gerencia isso internamente.
- Manter o comportamento funcional idêntico: validação de senha, submit do formulário, mensagens de erro/sucesso.

### ❌ Fora de Escopo

- Alterações na seção "Informações da Conta" (username/e-mail read-only).
- Alterações na seção "Zona de Perigo" (delete account).
- Modificações no componente `PasswordInput` em si.
- Criação de novos componentes.
- Alterações no backend ou na API.

---

## Solução Técnica

### Layout Atual (Problema)

```
┌─────────────────────────────────────────┐
│ [SENHA ATUAL    ] [input truncado      ] │  ← grid fixo não responsivo
│ [NOVA SENHA     ] [input truncado      ] │
│ [CONFIRMAR...   ] [input truncado      ] │
└─────────────────────────────────────────┘
```

O `className` do grid atual:
```
grid grid-cols-[11rem_1fr] items-center gap-x-4 gap-y-4
```
O grid não usa breakpoints responsivos, então em mobile o comportamento é idêntico ao desktop — coluna fixa de 176px + input espremido.

### Layout Proposto (Solução)

Substituir o grid por um `space-y-4` com cada campo sendo uma unidade `label + input` empilhada verticalmente. O componente `PasswordInput` já inclui o `label` internamente via prop.

```
┌─────────────────────────────────────────┐
│ SENHA ATUAL                             │
│ [                              👁      ] │
│                                         │
│ NOVA SENHA                              │
│ [                              👁      ] │
│                                         │
│ CONFIRMAR NOVA SENHA                    │
│ [                              👁      ] │
└─────────────────────────────────────────┘
```

### Componente `PasswordInput` — Interface

O componente já existe em `client/src/components/ui/input.jsx:42-61` e aceita as mesmas props que `Input`, incluindo:

| Prop          | Tipo     | Descrição                                      |
| ------------- | -------- | ---------------------------------------------- |
| `label`       | `string` | Rótulo exibido acima do input                  |
| `required`    | `bool`   | Exibe `*` vermelho no rótulo                   |
| `placeholder` | `string` | Texto placeholder                              |
| `value`       | `string` | Valor controlado                               |
| `onChange`    | `func`   | Handler de mudança                             |
| `minLength`   | `number` | Validação HTML nativa                          |
| `error`       | `string` | Mensagem de erro exibida abaixo do input       |

O `type` (password/text) é gerenciado internamente pelo `PasswordInput`.

### Mudanças nos Imports

**Adicionar:**
```js
import { PasswordInput } from '../components/ui/input';
```

**Remover** (não mais necessários após a refatoração):
```js
Eye, EyeOff  // de lucide-react — não usados em mais nenhum lugar da página
```

### Estado a Remover

O estado `showPasswords` é exclusivo do controle manual dos inputs e deve ser removido:

```js
// REMOVER — gerenciado internamente pelo PasswordInput
const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
```

### Estrutura do Formulário Proposto

Substituir o bloco `<div className="grid grid-cols-[11rem_1fr] ...">` por três `PasswordInput` empilhados com `space-y-4`:

```
<form onSubmit={handlePasswordSubmit} className="space-y-4">
  <div className="space-y-4">
    <PasswordInput
      label="Senha Atual"
      required
      placeholder="Digite a senha atual"
      value={passwordForm.currentPassword}
      onChange={...}
    />
    <PasswordInput
      label="Nova Senha"
      required
      minLength={8}
      placeholder="Digite a nova senha"
      value={passwordForm.newPassword}
      onChange={...}
    />
    <PasswordInput
      label="Confirmar Nova Senha"
      required
      placeholder="Digite a senha novamente"
      value={passwordForm.confirmPassword}
      onChange={...}
    />
  </div>
  {/* mensagens de erro/sucesso + botão submit permanecem iguais */}
</form>
```

---

## Riscos

| Risco | Impacto | Probabilidade | Mitigação |
| ----- | ------- | ------------- | --------- |
| `PasswordInput` não render o `border` base sem `className` explícito | Baixo | Baixo | Verificar visualmente após implementação; o componente usa `rounded-xl bg-zinc-700/60` como padrão |
| Remoção de `Eye/EyeOff` quebrar outro import | Baixo | Muito Baixo | Verificar se `Eye`/`EyeOff` são usados em outros locais do arquivo antes de remover do import |
| Comportamento de validação HTML (`required`, `minLength`) pode diferir entre o `<input>` nativo e o `Input` wrapper | Baixo | Baixo | `PasswordInput` repassa todas as props via `{...props}` para o `<input>` nativo, mantendo validação idêntica |

---

## Plano de Implementação

| # | Tarefa | Arquivo | Notas |
| - | ------ | ------- | ----- |
| 1 | Adicionar import de `PasswordInput` | `ProfilePage.jsx:4` | `import { PasswordInput } from '../components/ui/input'` |
| 2 | Remover `Eye`, `EyeOff` do import de `lucide-react` | `ProfilePage.jsx:3` | Confirmar que não são usados em outro lugar do arquivo |
| 3 | Remover estado `showPasswords` | `ProfilePage.jsx:17` | Estado de 3 chaves: `current`, `new`, `confirm` |
| 4 | Substituir o `<div className="grid grid-cols-[11rem_1fr]...">` e seus 3 `<input>` nativos | `ProfilePage.jsx:107-153` | Usar `<div className="space-y-4">` com 3 `PasswordInput` |
| 5 | Verificar visualmente no mobile (375px) e desktop (1280px) | — | Inputs devem ser full-width em ambos os breakpoints |

---

## Estratégia de Testes

| Tipo | O que verificar |
| ---- | --------------- |
| **Visual - Mobile (375px)** | Inputs ocupam 100% da largura disponível; placeholder legível sem truncamento |
| **Visual - Desktop (1280px)** | Layout empilhado mantém aparência consistente com o restante da página |
| **Funcional** | Toggle show/hide de cada campo funciona independentemente |
| **Funcional** | Submit do formulário continua funcionando (validação, chamada API, mensagens de erro/sucesso) |
| **Funcional** | Campos resetam após sucesso (`setPasswordForm` com strings vazias) |

---

## Questões em Aberto

| # | Questão | Status |
| - | ------- | ------ |
| 1 | O layout empilhado deve ser mantido em desktop também, ou usar `md:grid` para reintroduzir o grid em telas maiores? | 🔴 A decidir — a imagem de referência mostra layout mobile; validar se o comportamento desktop também deve mudar |
