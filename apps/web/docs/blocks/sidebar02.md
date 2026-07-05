---
title: "@domphy/blocks — sidebar02"
description: "Same shell as sidebar01, but each nav group is an independent <details>/<summary> disclosure (details() patch) with its own chevron rotation +..."
---

# sidebar02

<script setup lang="ts">
import Sidebar02Demo from "../demos/blocks/sidebar02.ts?raw"
</script>

A **Sidebar** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `sidebar02()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Sidebar02Demo" />

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
Same shell as sidebar01, but each nav group is an independent &lt;details&gt;/&lt;summary&gt; disclosure (details() patch) with its own chevron rotation + max-height/opacity reveal, verified independent per section (not single-open accordion). Content pane swapped for 40 stacked skeleton() placeholder rows to demonstrate independent scroll under the pinned header, per spec. Same icon-rail/mobile-drawer behavior as sidebar01. Known simplification: when the sidebar is collapsed to icon-rail, a section that the user had manually closed stays closed (its icons hidden) rather than force-flattening to an all-icons rail — real shadcn's icon rail generally doesn't preserve nested disclosure semantics either, and reconciling the two independent collapse axes precisely was judged out of scope for a faithful-enough clean-room port. doctor diagnose() reports 0 issues. Direct-source-diff fix (2026-07-05): Same missing SearchForm as sidebar01. Added.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/sidebar/sidebar02.ts [sidebar02]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
