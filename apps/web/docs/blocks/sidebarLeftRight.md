---
title: "@domphy/blocks — sidebarLeftRight"
description: "Self-contained dual-sidebar Notion-like workspace (left: org switcher + quick links + emoji favorites w/ hover more-menu + expandable emoji workspace groups +..."
---

# sidebarLeftRight

<script setup lang="ts">
import SidebarLeftRightDemo from "../demos/blocks/sidebarLeftRight.ts?raw"
</script>

A **Sidebar** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `sidebarLeftRight()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="SidebarLeftRightDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `organizations` | `SidebarTeam[]` | — |
| `favorites` | `FavoriteItem[]` | — |
| `workspaces` | `WorkspaceGroup[]` | — |
| `footerLinks` | `FooterLink[]` | — |
| `user` | `CurrentUser` | — |
| `calendarGroups` | `CalendarGroup[]` | — |
| `selectedDate` | `Date` | Fixed reference date for the inline month calendar. |
| `breadcrumbLabel` | `string` | — |
| `defaultLeftCollapsed` | `boolean` | — |
| `children` | `DomphyElement \| DomphyElement[]` | — |

::: details Implementation notes
Self-contained dual-sidebar Notion-like workspace (left: org switcher + quick links + emoji favorites w/ hover more-menu + expandable emoji workspace groups + utility footer; right: account header + inline month calendar + checkbox calendar-visibility groups + New Calendar action). Reuses only stable, already-exported read-only pieces from sidebar05-08-shared.ts (renderTeamSwitcher/icons/sidebarBackdrop/etc.) for the org switcher, deliberately avoiding edits to that shared module since it was being actively modified by a concurrent process mid-session (observed content changes between two reads of the same file during this run) — editing it to add new exports would have risked a lost-update race, so a couple of small renderer functions are self-contained here instead. Left-sidebar collapse uses the lighter 'fade the label, keep the icon/emoji' CSS technique (matching the sidebar01-04 family's collapsibleLabel pattern) rather than the heavier dual-row+tooltip pattern used by sidebar07/08, since favorites+workspaces here total 15+ rows and duplicating every one would roughly double the file for no functional difference — a scope choice, not a functional gap. The right sidebar's month calendar is a hand-rolled, always-visible inline grid (own date math: month nav, weekday header, 6x7 day grid keyed by ISO date) rather than @domphy/ui's datePicker() patch, because that patch is architecturally an input-triggered floating popover, not a standalone inline grid; the selected-day cell uses a fixed (non-'inherit') accent background by design, the same accepted exception the core datePicker() patch itself makes for its own selected-day cell (annotated with _doctorDisable and explained inline). Right sidebar is breakpoint-driven display:none/flex (no animated drawer, no manual toggle) per spec — it 'stays visible on desktop.'

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/sidebar/sidebarLeftRight.ts [sidebarLeftRight]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
