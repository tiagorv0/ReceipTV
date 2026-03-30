# TDD — Bottom Navigation Bar (Mobile)

**Data:** 2026-03-30
**Status:** Proposta
**Referência de design:** Stitch · "Histórico - Filtros Colapsados" (projects/8193094193391622554)

---

## 1. Contexto

O menu mobile atual (`Sidebar.jsx`) exibe um cabeçalho com logo e um `<nav>` que colapsa via hambúrguer (hoje desabilitado). Não existe uma bottom navigation bar dedicada para mobile. O resultado é uma experiência de navegação inconsistente em dispositivos móveis.

A imagem de referência (Stitch) mostra um padrão amplamente adotado: uma barra fixa na base da tela com 5 itens, sendo o central um FAB (Floating Action Button) elevado — padrão Material Design 3 / Bottom App Bar.

---

## 2. Objetivo

Criar o componente `BottomNav.jsx`, uma barra de navegação inferior exclusiva para mobile (`md:hidden`), com 5 itens:

| Posição | Label       | Ícone (Lucide)   | Rota        |
|---------|-------------|------------------|-------------|
| 1       | Dashboard   | `LayoutDashboard`| `/`         |
| 2       | Histórico   | `History`        | `/history`  |
| 3 (FAB) | Upload      | `Plus`           | `/upload`   |
| 4       | Perfil      | `CircleUser`     | `/profile`  |
| 5       | Sair        | `LogOut`         | *(logout)*  |

> **Mudanças em relação ao Stitch:** "Stats" → Perfil (`CircleUser`); "User" → Sair (`LogOut`). Cores adaptadas para o tema escuro do projeto.

---

## 3. Design Visual

### 3.1 Estrutura da barra

```
┌─────────────────────────────────────────────────────┐
│                        ●  ← FAB flutuando acima      │
│  [Dashboard]  [Histórico]  [ + ]  [Perfil]  [Sair]  │
└─────────────────────────────────────────────────────┘
```

- Posição: `fixed bottom-0 left-0 right-0`
- Z-index: `z-50`
- Altura: `~64px` (padding `py-3 px-6`)
- Fundo: `bg-zinc-900` + borda superior `border-t border-zinc-800`
- Sombra sutil interna: `shadow-[0_-4px_30px_rgba(0,0,0,0.4)]`

### 3.2 FAB Central (botão Upload)

- Circulo verde elevado: `-mt-8` (sobe acima da barra)
- Dimensões: `w-14 h-14` (`p-4 rounded-full`)
- Cor de fundo: `bg-green-500` (`#22c55e`)
- Glow: `shadow-[0_0_20px_rgba(34,197,94,0.45)]`
- Ícone: `Plus` branco (`text-zinc-900`)
- Hover: `hover:bg-green-400` + escala leve `hover:scale-105`
- Ativo (rota `/upload`): borda extra `ring-2 ring-green-400/60`

### 3.3 Itens de navegação (não-FAB)

**Estado inativo:**
- Ícone: `text-zinc-500`, tamanho `20px`
- Label: `text-[10px] font-semibold uppercase tracking-wide text-zinc-500`

**Estado ativo:**
- Ícone: `text-green-400` (`--primary-strong: #22c55e`)
- Label: `text-green-400`
- Indicador: pequeno ponto `w-1 h-1 rounded-full bg-green-400` abaixo do label
- Sem fundo — o indicador é a âncora visual (diferente do Stitch que usa borda)

**Item Sair:**
- Cor sempre `text-zinc-500`, hover `text-red-400`
- Sem indicador de ativo (não é uma rota)

### 3.4 Paleta de cores aplicada

| Token do projeto      | Valor          | Uso na BottomNav                    |
|-----------------------|----------------|-------------------------------------|
| `--primary-strong`    | `#22c55e`      | Item ativo, FAB background          |
| `--primary-soft`      | `rgba(74,222,128,0.08)` | *(não usado — preferir ponto indicador)* |
| `bg-zinc-900`         | `#18181b`      | Fundo da barra                      |
| `border-zinc-800`     | `#27272a`      | Borda superior                      |
| `text-zinc-500`       | `#71717a`      | Ícones/labels inativos              |
| `text-red-400`        | `#f87171`      | Hover do item Sair                  |

---

## 4. Arquitetura de Componentes

### 4.1 Novo arquivo

```
client/src/components/BottomNav.jsx
```

### 4.2 Integração no Layout

Adicionar `<BottomNav />` dentro de [Layout.jsx](../client/src/components/Layout.jsx), após o `<main>` e antes de `<PWAPrompts />`:

```jsx
// Layout.jsx (após a tag </main>)
<BottomNav />
<PWAPrompts />
```

Adicionar `pb-20 md:pb-0` ao `<main>` para evitar que o conteúdo fique atrás da barra.

### 4.3 Sidebar no mobile

O `<Sidebar />` atual deve continuar sendo renderizado no desktop (`md:flex`) e oculto no mobile (`hidden md:flex`). A div wrapper em [Layout.jsx](../client/src/components/Layout.jsx) deve receber `hidden md:block`.

---

## 5. Estrutura do Componente

```jsx
// client/src/components/BottomNav.jsx
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, History, Plus, CircleUser, LogOut } from 'lucide-react';
import api from '../api/index';

const navItems = [
  { label: 'Dashboard', path: '/',        icon: LayoutDashboard },
  { label: 'Histórico', path: '/history', icon: History },
  null, // espaço reservado para o FAB central
  { label: 'Perfil',    path: '/profile', icon: CircleUser },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate  = useNavigate();

  const handleLogout = async () => { /* mesma lógica de Sidebar.jsx */ };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50
                    bg-zinc-900 border-t border-zinc-800
                    shadow-[0_-4px_30px_rgba(0,0,0,0.4)]
                    flex items-end justify-between px-6 py-3">

      {/* Itens esquerdos */}
      {navItems.slice(0, 2).map(item => <NavItem key={item.path} item={item} active={location.pathname === item.path} />)}

      {/* FAB central */}
      <Link to="/upload" className="-mt-8 w-14 h-14 flex items-center justify-center
                                    bg-green-500 rounded-full
                                    shadow-[0_0_20px_rgba(34,197,94,0.45)]
                                    hover:bg-green-400 hover:scale-105 transition-all
                                    active:scale-95">
        <Plus size={24} className="text-zinc-900" strokeWidth={2.5} />
      </Link>

      {/* Itens direitos + Sair */}
      {navItems.slice(3).map(item => <NavItem key={item.path} item={item} active={location.pathname === item.path} />)}
      <LogoutItem onLogout={handleLogout} />
    </nav>
  );
};
```

---

## 6. Estados de Interação

| Estado     | Visual                                                      |
|------------|-------------------------------------------------------------|
| Inativo    | Ícone + label em `zinc-500`                                 |
| Ativo      | Ícone + label em `green-400` + ponto indicador abaixo       |
| Hover      | Transição de cor `transition-colors duration-150`           |
| FAB padrão | Círculo verde com glow                                      |
| FAB ativo  | `ring-2 ring-green-400/60` + glow intensificado             |
| Sair hover | `text-red-400`                                              |

---

## 7. Acessibilidade

- Cada item do nav usa `aria-label` descritivo
- FAB: `aria-label="Fazer upload de comprovante"`
- Item ativo: `aria-current="page"`
- Botão Sair: `<button>` (não `<Link>`) — ação, não navegação
- Área mínima de toque: `44×44px` (todos os itens atendem via padding)

---

## 8. Ajuste de espaçamento no conteúdo

Para evitar que o conteúdo das páginas fique coberto pela barra (altura ~64px):

```jsx
// Layout.jsx — adicionar pb-20 no mobile
<main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-y-auto relative">
```

---

## 9. Fora de escopo

- Animações de transição entre abas (Framer Motion) — pode ser adicionado em sprint futuro
- Badge de notificação nos ícones
- Temas claro/escuro alternados (projeto usa somente dark)

---

## 10. Arquivos afetados

| Arquivo                                          | Mudança                                          |
|--------------------------------------------------|--------------------------------------------------|
| `client/src/components/BottomNav.jsx`            | **Criar** — novo componente                      |
| [Layout.jsx](../client/src/components/Layout.jsx)| Importar `BottomNav`, ajustar `pb-20`, ocultar `Sidebar` no mobile |
| [Sidebar.jsx](../client/src/components/Sidebar.jsx) | Remover lógica de mobile (nav items), manter apenas desktop |
