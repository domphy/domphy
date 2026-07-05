---
title: "@domphy/blocks — sidebar06"
description: "Floating-dropdown nav built on @domphy/ui's popover()+menu()."
---

# sidebar06

<script setup lang="ts">
import Sidebar06Demo from "../demos/blocks/sidebar06.ts?raw"
</script>

A **Sidebar** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `sidebar06()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Sidebar06Demo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `header` | `{ icon?: string; title?: string; subtitle?: string }` | — |
| `navItems` | `Sidebar06NavItem[]` | — |
| `optInCard` | `Sidebar06OptInCard \| null` | — |
| `breadcrumbItems` | `SidebarBreadcrumbItem[]` | — |
| `children` | `DomphyElement \| DomphyElement[]` | — |

::: details Implementation notes
Floating-dropdown nav built on @domphy/ui's popover()+menu(). Only one dropdown open at a time via cross-subscribed State&lt;boolean&gt; instances (opening one closes all siblings). Trigger row gets accent background/foreground via the '&[aria-expanded=true]' CSS selector. Opt-in card + footer included. Same off-canvas mobile shell as sidebar05. PARTIAL because responsive dropdown placement (below-trailing on mobile vs beside-leading on desktop) is approximated with a matchMedia listener flipping a shared placement State between 'bottom-end'/'right-start', combined with @domphy/floating's flip()/shift() middleware for on-screen collision handling — not a bespoke anchor-engine breakpoint rule. Doctor self-check: 0 issues. Direct-source-diff fix (2026-07-05): The opt-in card was button-only — upstream's is a real &lt;form&gt; with an email input above the Subscribe button. Fixed.

Status: **partial** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/sidebar/sidebar06.ts [sidebar06]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
