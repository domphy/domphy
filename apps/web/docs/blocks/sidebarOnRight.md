---
title: "@domphy/blocks — sidebarOnRight"
description: "Thin wrapper over the existing sidebar01-04 family's buildSidebarBlock(), extended (not forked) with new optional `side`/`insetMain` options — kept as the..."
---

# sidebarOnRight

<script setup lang="ts">
import SidebarOnRightDemo from "../demos/blocks/sidebarOnRight.ts?raw"
</script>

A **Sidebar** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `sidebarOnRight()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="SidebarOnRightDemo" />

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
Thin wrapper over the existing sidebar01-04 family's buildSidebarBlock(), extended (not forked) with new optional `side`/`insetMain` options — kept as the family's single source of truth rather than duplicating ~250 lines of shared nav/collapse/drawer code. Defaults preserve byte-identical output for sidebar01-04 (all 14 pre-existing tests still pass; verified before and after). `side:'right'` mirrors the docked edge, border/margin edges, mobile off-canvas transform direction and drawer() placement; the header toggle is pushed to the header's right edge via a toolbarSpacer(). `insetMain:true` reuses sidebar08's rounded/shadowed inset-card treatment with the same collapse-synced margin transition. The nested per-item &lt;details&gt; sub-link accordion is reused as-is from the family's supportsChildren nav renderer even though the spec's behavior text says nav groups have 'no per-item collapse' — the spec's own researchNote explicitly deprioritizes that literal detail in favor of reusing 'standard sidebar chrome shared with other variants in the family,' so this is a deliberate interpretation, called out for transparency. Factory accepts `side:'left'` to fall back to the family's standard left-docked layout (tested).

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/sidebar/sidebarOnRight.ts [sidebarOnRight]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
