---
title: "@domphy/blocks — sidebar01"
description: "Full docked-sidebar shell: workspace switcher (popover+menu), grouped nav (list()/listItemButton()), pinned account footer (avatar+popover+menu), sticky..."
---

# sidebar01

<script setup lang="ts">
import Sidebar01Demo from "../demos/blocks/sidebar01.ts?raw"
</script>

A **Sidebar** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `sidebar01()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Sidebar01Demo" />

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
Full docked-sidebar shell: workspace switcher (popover+menu), grouped nav (list()/listItemButton()), pinned account footer (avatar+popover+menu), sticky content header (toggle+divider+breadcrumb), 3-tile+1-block content demo (skeleton()). Collapse-to-icon-rail is a real toState&lt;boolean&gt; driving width/label fade via themeSpacing/opacity transitions (200ms/150ms linear); ctrl/cmd+B wired via a document keydown listener in _onMount/_onRemove. Mobile breakpoint (&lt;=767px) swaps to a real overlay drawer built from @domphy/ui's drawer() patch on a &lt;dialog&gt;, duplicating the same nav content. Omitted: literal letter-spacing on the uppercase group label (forbidden inline per doctor's inline-typography rule; no dedicated patch exposes it) and per-icon tooltips in icon-rail mode (tooltip() could be attached but was left off to keep the block a lean, literal tree — noted as the one interaction from the spec not wired). doctor diagnose() reports 0 issues on the rendered tree; shares packages/blocks/src/shadcn/sidebar/sidebar01-04-shared.ts with sidebar02-04. Direct-source-diff fix (2026-07-05): Missing the docs SearchForm (search input) upstream includes in the header, aside, and mobile drawer. Added.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/sidebar/sidebar01.ts [sidebar01]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
