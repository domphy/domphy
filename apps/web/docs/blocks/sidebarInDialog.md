---
title: "@domphy/blocks — sidebarInDialog"
description: "Settings-style modal (trigger button + <dialog>) with an embedded two-pane layout."
---

# sidebarInDialog

<script setup lang="ts">
import SidebarInDialogDemo from "../demos/blocks/sidebarInDialog.ts?raw"
</script>

A **Sidebar** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `sidebarInDialog()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="SidebarInDialogDemo" />

::: details Implementation notes
Settings-style modal (trigger button + &lt;dialog&gt;) with an embedded two-pane layout. Nav-column visibility uses a CSS @container query (containerType:'inline-size' on the dialog) rather than @media, so 'hidden on narrow dialog widths' tracks the dialog's own rendered width, not the viewport, matching the spec literally. Fade+scale entrance: the base dialog() patch only animates opacity (rAF-deferred so the browser paints the 0-state before transitioning), so a second _onMount hook was composed on the same element (Domphy hooks compose via addHook, don't override) driving `transform: scale()` on the same open state with the same rAF-deferral technique, keeping dialog()'s open/close/focus-trap/scroll-lock/Escape mechanics as the single source of truth. Category content swap is instant (style.display toggle keyed off active-category id) with a ~100ms background-color transition on the active nav row for polish, matching the 'no animation on selection' note. Default content renderer produces the same generic 10-skeleton-row body for every category (per researchNote: 'not a fixed requirement'); callers can override per-category via renderContent(categoryId).

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/sidebar/sidebarInDialog.ts [sidebarInDialog]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
