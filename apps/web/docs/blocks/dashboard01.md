---
title: "@domphy/blocks — dashboard01"
description: "TypeScript typecheck clean, all 738 package tests pass (4 new), manual @domphy/doctor diagnose() self-check reports 0 diagnostics."
---

# dashboard01

<script setup lang="ts">
import Dashboard01Demo from "../demos/blocks/dashboard01.ts?raw"
</script>

A **Dashboard** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `dashboard01()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Dashboard01Demo" />

::: details Implementation notes
TypeScript typecheck clean, all 738 package tests pass (4 new), manual @domphy/doctor diagnose() self-check reports 0 diagnostics. Composed from existing pieces per instructions: sidebar07() reused wholesale for the app shell (aside+sticky header+backdrop), chartBarStacked() reused for the chart canvas, createDomphyTable + table() patch for the data grid. Deliberate simplifications vs. the full upstream spec (documented in the file's header comment): (1) sidebar07's shell has only one nav-main group + one secondary/projects group, so the spec's third 'pinned to bottom' secondary-utility nav group has no slot and is omitted; (2) sidebar07 owns its own sticky header (toggle+divider+breadcrumb title), which has no slot for a trailing action, so the 'ghost external link' button lives in its own thin utility row at the top of the content pane instead of being fused into that same bar; (3) chartBarStacked's props don't expose a header-aside slot, so the 7/30/90-day range toggleGroup/select control sits in a small row above the chartBarStacked card (which itself re-renders with a range-appropriate title/subtitle/trend) rather than nested inside chartBarStacked's own header; (4) the table's 'view tabs' genuinely filter rows by status via table-core's own ColumnFiltering feature (not a placeholder) with relabeled views (All Items/Done/In Progress/Not Started) instead of reproducing the upstream's differently-named tabs; (5) the row drawer's mobile-vs-desktop placement is resolved once via matchMedia at build time (drawer()'s placement prop isn't itself resize-reactive). Fully functional (not stubbed): row selection with indeterminate header checkbox, native HTML5 drag-and-drop reorder with opacity/shadow feedback, inline-editable Target/Limit numeric cells (commit on change, not per-keystroke, to avoid focus loss), reviewer dropdown, status badges, per-row kebab menu (Edit/Duplicate/Favorite/Delete), column-visibility toggling (Customize Columns), Add Section (creates+opens a new row in the drawer), and first/prev/next/last pagination with page-size select. All sample data/copy/numbers are original inventions, not reproductions of the upstream's real content.

Status: **complete** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks#dashboard-01)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/dashboard/dashboard-01.ts [dashboard01]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
