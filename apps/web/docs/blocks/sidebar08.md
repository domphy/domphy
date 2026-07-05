---
title: "@domphy/blocks — sidebar08"
description: "Reuses sidebar07's team-switcher/nav-main/projects/user-footer rendering (via sidebar05-08-shared.ts) and adds a de-emphasized secondary-nav block..."
---

# sidebar08

<script setup lang="ts">
import Sidebar08Demo from "../demos/blocks/sidebar08.ts?raw"
</script>

A **Sidebar** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `sidebar08()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Sidebar08Demo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `teams` | `SidebarTeam[]` | — |
| `navMain` | `SidebarNavMainItem[]` | — |
| `projects` | `SidebarProject[]` | — |
| `secondaryNav` | `Sidebar08SecondaryNavItem[]` | — |
| `user` | `SidebarUser` | — |
| `breadcrumbItems` | `SidebarBreadcrumbItem[]` | — |
| `children` | `DomphyElement \| DomphyElement[]` | — |

::: details Implementation notes
Reuses sidebar07's team-switcher/nav-main/projects/user-footer rendering (via sidebar05-08-shared.ts) and adds a de-emphasized secondary-nav block (Support/Feedback, no active-state styling, same collapse+tooltip pattern) plus a rounded/shadowed 'inset' main-content card (own dataTone='shift-0' lighter surface vs the root's dataTone='shift-2' muted backdrop) whose margin shrinks in step with the sidebar's collapse transition. Secondary-nav text intentionally stays at the same shift-9 accessibility floor as primary nav (doctor's low-contrast rule) — de-emphasis is instead conveyed via the small() patch's smaller type scale rather than a dimmer color, a deliberate deviation from a literal 'quieter color' reading of the spec in favor of WCAG legibility. Same mobile-overlay-via-CSS-transform caveat as sidebar07. Doctor self-check: 0 issues. Direct-source-diff fix (2026-07-05): Same three gaps as sidebar07 (Platform label, projects More row, icon-rail hide). Added.

Status: **partial** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/sidebar/sidebar08.ts [sidebar08]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
