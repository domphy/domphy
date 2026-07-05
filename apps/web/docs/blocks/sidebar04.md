---
title: "@domphy/blocks — sidebar04"
description: "Reuses sidebar03's parent/child nav-tree interaction model on a wider (themeSpacing(76) ~19rem vs ~16rem) floating aside: margin gap on top/left/bottom,..."
---

# sidebar04

<script setup lang="ts">
import Sidebar04Demo from "../demos/blocks/sidebar04.ts?raw"
</script>

A **Sidebar** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `sidebar04()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Sidebar04Demo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `header` | `SidebarHeaderData` | — |
| `navGroups` | `SidebarNavGroup[]` | — |
| `user` | `SidebarUser` | — |
| `breadcrumb` | `SidebarBreadcrumbItem[]` | — |
| `defaultCollapsed` | `boolean` | — |
| `side` | `"left" \| "right"` | Which viewport edge the sidebar docks against. Defaults to "left". |

::: details Implementation notes
Reuses sidebar03's parent/child nav-tree interaction model on a wider (themeSpacing(76) ~19rem vs ~16rem) floating aside: margin gap on top/left/bottom, rounded corners (borderRadius) and an outline+boxShadow border/shadow treatment instead of a flush edge + hairline border. Content header is non-sticky per spec (position:static). doctor diagnose() reports 0 issues; test asserts the floating card CSS (border-radius + margin) and the non-sticky header.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/sidebar/sidebar04.ts [sidebar04]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
