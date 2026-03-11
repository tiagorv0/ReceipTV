---
name: layout-escuro-dashboard-shadcn
overview: Aplicar tema escuro consistente, usar componentes shadcn (Chart, Badge, AlertDialog) no dashboard e histórico, e migrar a navegação para menu apenas no topo.
todos:
  - id: dark-theme-background
    content: Ajustar tokens de cor e classes globais para garantir fundo escuro (`bg-background`) e texto claro em todo o layout.
    status: completed
  - id: dashboard-chart-component
    content: Refatorar gráficos de `DashboardPage` para usar o componente `Chart` do shadcn em vez de usar diretamente `BarChart`/`PieChart` de Recharts.
    status: completed
  - id: banks-badge
    content: Adicionar `Badge`s para cada banco em `summary.byBank` no dashboard, integrados visualmente ao gráfico "Por banco".
    status: completed
  - id: history-delete-alert
    content: Localizar o componente de histórico e envolver a ação de deletar em um `AlertDialog` de confirmação.
    status: completed
  - id: top-menu-layout
    content: Substituir a sidebar pelo menu apenas no topo, ajustando o layout principal para usar uma topbar responsiva com navegação.
    status: completed
isProject: false
---

## Objetivo geral

**Deixar o app com tema escuro consistente**, atualizar o `DashboardPage` para usar o componente `Chart` e `Badge` do shadcn/ui, adicionar alerta de confirmação ao deletar registros no histórico e **mover a navegação para um menu apenas no topo**, mantendo a integração com o layout atual baseado em shadcn.

## 1. Ajustar tema para fundo escuro

- **Revisar configuração de tema**
  - Verificar onde estão definidos os tokens de cor globais (ex.: `tailwind.css` ou arquivo semelhante indicado em `tailwindCssFile` pelo shadcn) e garantir que o `background`/`foreground` estejam configurados para um **tema escuro** (ex.: `bg-background` realmente escuro, `text-foreground` claro).
  - Garantir que nenhum componente esteja forçando cores claras com classes diretas (`bg-white`, `text-slate-900` etc.); trocar para tokens semânticos (`bg-card`, `bg-background`, `text-muted-foreground`).
- **Aplicar fundo escuro no layout principal**
  - No layout raiz (ex.: `DashboardLayout` ou equivalente), envolver o conteúdo em um container com `className="min-h-screen bg-background text-foreground"` para forçar o fundo escuro em todas as páginas do app.
  - Conferir rapidamente páginas principais para garantir que não existam blocos com fundo claro solto que quebrem o tema escuro.

## 2. Usar `Chart` do shadcn no `DashboardPage`

- **Mapear uso atual de gráficos**
  - Em `[client/src/pages/DashboardPage.jsx](client/src/pages/DashboardPage.jsx)`, identificar os gráficos atuais:
    - `BarChart` de gastos mensais usando `monthly`.
    - `PieChart` "Por banco" usando `summary.byBank`.
- **Verificar/assumir componente `Chart` shadcn**
  - Assumir que existe um wrapper `Chart` shadcn (ex.: em `client/src/components/ui/chart.jsx/tsx`) que integra `Recharts` com tokens de tema.
  - Planejar substituir o uso direto de `BarChart`/`PieChart` por composição via `Chart`/`ChartContainer`/`ChartLegend` (padrão típico shadcn), mas **reaproveitando os mesmos dados (`monthly`, `summary.byBank`)**.
- **Refatorar seções de gráfico**
  - Na seção "Gastos mensais":
    - Envolver o conteúdo do `ChartCard` com `Chart`/`ChartContainer` para que as cores venham de tokens (`--chart-1`, `--chart-2`, etc.), eliminando estilos inline (`var(--card-bg)`, `var(--text-main)`, etc.).
    - Manter a responsividade com algo como `ChartContainer` + `ResponsiveContainer` conforme o padrão do componente.
  - Na seção "Por banco":
    - Refatorar o `PieChart` para usar a mesma infraestrutura do `Chart` shadcn.
    - Preparar os dados de `summary.byBank` em um formato que o `ChartLegend` possa consumir, exibindo legendas amigáveis (nome do banco + valor formatado).

## 3. Usar `Badge` para os bancos

- **Definir onde mostrar os badges**
  - Logo abaixo ou ao lado do gráfico "Por banco" em `[client/src/pages/DashboardPage.jsx](client/src/pages/DashboardPage.jsx)`, exibir uma faixa de `Badge`s, um para cada banco presente em `summary.byBank`.
- **Composição com dados existentes**
  - Para cada item de `summary.byBank` (`banco`, `total`):
    - Renderizar `Badge` com o nome do banco como label principal.
    - Opcionalmente, incluir o valor resumido/abreviado (por exemplo, só R$ abreviado ou deixar o valor no tooltip/legenda do `Chart`).
  - Usar variantes semânticas (`variant="outline"`, `variant="secondary"` etc.) ao invés de cores manuais para diferenciar bancos.
- **Integração visual com o tema escuro**
  - Garantir que os `Badge`s usem `bg-primary`/`bg-secondary` e `text-foreground` derivados dos tokens de tema, evitando contrastes ruins com o fundo escuro.

## 4. Alert/AlertDialog para deletar registro em histórico

- **Localizar componente de histórico**
  - Identificar com você (após sua resposta) qual arquivo contém a listagem de histórico (exemplo provável: `HistoryPage.jsx` ou um componente de tabela dentro de outra página).
- **Adicionar confirmação de deleção**
  - Trocar qualquer `confirm()` nativo ou deleção direta por um `**AlertDialog` shadcn** (com título, descrição e botões de confirmação/cancelamento) que envolva o botão/ícone de deletar registro.
  - Padrão sugerido:
    - `AlertDialog` com `AlertDialogTrigger` no botão de lixo.
    - `AlertDialogContent` com `AlertDialogTitle` ("Confirmar exclusão") e `AlertDialogDescription` (explicando que a ação é irreversível).
    - `AlertDialogAction` chamando a função de deleção atual.
    - `AlertDialogCancel` para fechar sem deletar.
- **Feedback visual opcional**
  - Após exclusão bem-sucedida, disparar um `toast()` (caso já use `sonner`) para indicar sucesso, mantendo o padrão de feedback da skill shadcn.

## 5. Mover navegação para menu no topo

- **Redesenhar layout para top menu apenas**
  - No layout principal (onde hoje provavelmente existe uma `Sidebar`), remover a `Sidebar` e criar um componente de **topbar** (ex.: `TopNav` ou `Topbar`) com:
    - Logo/título do app à esquerda.
    - Links de navegação principais (Dashboard, Histórico, Configurações etc.) no centro ou à direita usando `NavigationMenu` ou `Tabs` shadcn, conforme estilo desejado.
    - Ações/contexto de usuário (avatar, logout, tema) alinhados à direita.
- **Integrar top menu com as rotas atuais**
  - Garantir que o menu do topo utilize `NavLink`/`Link` do roteador usado (provavelmente `react-router`) para destacar a rota ativa com variantes (`variant="outline"`, `data-[state=active]` etc.), seguindo o padrão de navegação shadcn.
  - Certificar que a área de conteúdo fique abaixo do topo com padding adequado (`pt-16` ou similar) para não ficar escondida atrás do menu fixo.
- **Responsividade do menu**
  - Incluir um comportamento responsivo básico:
    - Em telas pequenas, colapsar os links em um menu hamburger usando `Sheet` ou `DropdownMenu` shadcn.
    - Em telas médias/grandes, mostrar os links diretamente na topbar.

## 6. Revisão final e alinhamento visual

- **Checagem de consistência visual**
  - Validar que todas as páginas principais herdam o fundo escuro (`bg-background`) e que não restaram caixas claras isoladas.
  - Conferir que o `DashboardPage` usa apenas tokens semânticos de cor e componentes shadcn (`Card`, `Badge`, `Chart`, `AlertDialog` etc.).
- **Pontos de extensão futuros**
  - Deixar o layout de top menu pronto para receber mais links/ícones.
  - Marcar (em comentários internos ou documentação) o local apropriado para adicionar filtros, buscas ou quick-actions no dashboard dentro da topbar.

