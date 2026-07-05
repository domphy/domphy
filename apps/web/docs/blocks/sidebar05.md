---
title: "@domphy/blocks — sidebar05"
description: "Inline accordion sidebar."
---

# sidebar05

<script setup lang="ts">
import Sidebar05Demo from "../demos/blocks/sidebar05.ts?raw"
</script>

A **Sidebar** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `sidebar05()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Sidebar05Demo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `header` | `{ icon?: string; title?: string; subtitle?: string }` | — |
| `searchPlaceholder` | `string` | — |
| `navGroups` | `Sidebar05NavGroup[]` | — |
| `breadcrumbItems` | `SidebarBreadcrumbItem[]` | — |
| `children` | `DomphyElement \| DomphyElement[]` | — |

::: details Implementation notes
Inline accordion sidebar. Plus/minus toggle glyph swapped purely via the details[open] CSS attribute selector (no JS, no rotation) — matches the spec's key visual signature. Multiple groups can be open simultaneously (native &lt;details&gt; behavior), one group open by default. Sub-list open/close animates via max-height/opacity transition (~180ms linear). Sidebar hide/show is a width transition + overflow:hidden on desktop; on narrow viewports (@media max-width:768px) it becomes a position:fixed transform-slide overlay with a semi-transparent backdrop. Active sub-link gets accent-tinted background (listItemButton() patch) + bold text (nested strong() patch). Doctor self-check: 0 issues.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/sidebar/sidebar05.ts [sidebar05]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
