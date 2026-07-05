---
title: "@domphy/blocks — sidebar07"
description: "Flagship full-featured sidebar: team-switcher dropdown, nested nav-main (inline accordion when expanded / floating flyout via popover() when icon-collapsed),..."
---

# sidebar07

<script setup lang="ts">
import Sidebar07Demo from "../demos/blocks/sidebar07.ts?raw"
</script>

A **Sidebar** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `sidebar07()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Sidebar07Demo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `teams` | `SidebarTeam[]` | — |
| `navMain` | `SidebarNavMainItem[]` | — |
| `projects` | `SidebarProject[]` | — |
| `user` | `SidebarUser` | — |
| `breadcrumbItems` | `SidebarBreadcrumbItem[]` | — |
| `children` | `DomphyElement \| DomphyElement[]` | — |

::: details Implementation notes
Flagship full-featured sidebar: team-switcher dropdown, nested nav-main (inline accordion when expanded / floating flyout via popover() when icon-collapsed), projects list with a hover-revealed 'more actions' popover (sibling button, not nested inside the &lt;a&gt;, to stay valid HTML), user footer dropdown. Desktop collapses width 16rem&lt;-&gt;3rem (themeSpacing(64)/(12)); Cmd/Ctrl+B keyboard shortcut and a thin edge-rail click target both toggle it. Collapsible rows (nav-main leaves, projects) render twice — an expanded label row and a collapsed icon-only row with tooltip() — so the tooltip is only ever reachable while actually collapsed (no approximation there). PARTIAL because: (1) the mobile 'overlay drawer' uses a CSS position:fixed+transform overlay rather than a native &lt;dialog&gt;/showModal() focus-trapped modal; (2) team-switcher/user-footer dropdowns don't get the collapsed-only tooltip treatment (only nav-main/projects rows do), a scope-limiting simplification. Doctor self-check: 0 issues (after adding missing color pairings on themed border/background props and switching literal textDecoration:'none' to a reactive function per the inline-typography rule).

Status: **partial** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/sidebar/sidebar07.ts [sidebar07]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
