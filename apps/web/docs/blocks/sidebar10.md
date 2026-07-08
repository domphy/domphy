---
title: "@domphy/blocks — sidebar10"
description: "Persistent workspace sidebar reusing the sidebar05-08 team-switcher/user-footer helpers, plus new Favorites (emoji rows with hover-reveal 'more' popover, real..."
---

# sidebar10

<script setup lang="ts">
import Sidebar10Demo from "../demos/blocks/sidebar10.ts?raw"
</script>

A **Sidebar** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `sidebar10()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Sidebar10Demo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `teams` | `SidebarTeam[]` | — |
| `favorites` | `Sidebar10FavoriteItem[]` | — |
| `favoritesVisibleCount` | `number` | — |
| `workspaces` | `Sidebar10Workspace[]` | — |
| `workspacesVisibleCount` | `number` | — |
| `secondaryLinks` | `Sidebar10SecondaryLink[]` | — |
| `breadcrumbItems` | `SidebarBreadcrumbItem[]` | — |
| `children` | `DomphyElement \| DomphyElement[]` | — |

::: details Implementation notes
Persistent workspace sidebar reusing the sidebar05-08 team-switcher/user-footer helpers, plus new Favorites (emoji rows with hover-reveal 'more' popover, real 'show more' reveal instead of a fixed count) and Workspaces (details-accordion with nested pages, hover-reveal 'add page' button, real 'show more' reveal) groups, and a 'sidebar in a popover' quick-actions menu (bordered, grouped icon+label rows) wired to both per-row more-buttons and the header's three-dot button. Gap: 'Ask AI' renders as an inert nav-style row rather than a live assistant (faking an LLM response would misrepresent capability); the hover-revealed 'add page' button stops the details toggle but doesn't create a real page (no page-creation flow was specified); the header's avatar-stack is decorative, not backed by live presence data. Direct-source-diff fix (2026-07-05): Header menu was an invented generic '…' menu — replaced with upstream's exact 4-group Notion page-actions menu, plus per-page emoji on workspace sub-pages.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/sidebar/sidebar10.ts [sidebar10]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
