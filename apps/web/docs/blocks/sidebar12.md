---
title: "@domphy/blocks — sidebar12"
description: "User header, a hand-built always-visible compact month-grid date picker (Sunday-first, prev/next month, adjacent-month days grayed + disabled, selected day as..."
---

# sidebar12

<script setup lang="ts">
import Sidebar12Demo from "../demos/blocks/sidebar12.ts?raw"
</script>

A **Sidebar** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `sidebar12()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Sidebar12Demo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `user` | `Sidebar12User` | — |
| `selectedDate` | `Date` | — |
| `groups` | `Sidebar12CalendarGroup[]` | — |
| `onDateChange` | `(date: Date) =&gt; void` | — |
| `onCalendarToggle` | `(groupLabel: string, entryId: string, checked: boolean) =&gt; void` | — |
| `children` | `DomphyElement \| DomphyElement[]` | — |

::: details Implementation notes
User header, a hand-built always-visible compact month-grid date picker (Sunday-first, prev/next month, adjacent-month days grayed + disabled, selected day as a filled accent circle) synced with the main header's period label/prev/next/today controls, three collapsible checkbox calendar groups (My Calendars/Favorites/Other) using inputCheckbox with a per-entry accent color, and a sticky sidebar with an independently scrolling main content area (position:sticky, not the height:100dvh+overflow:hidden shell used by the rest of the family). Did not reuse @domphy/ui's datePicker() patch since that primitive is an input-triggered popover calendar, not an inline always-visible grid; built a minimal inline calendar instead. Per the spec's own research note, the main content event grid is an explicit open-ended placeholder (a plain day-number grid), not a real event/day view.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/sidebar/sidebar12.ts [sidebar12]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
