---
title: "@domphy/blocks — hoverSidebar"
description: "Domphy has no context/provider primitive; the spec's shared open/expanded context is substituted with a plain State<boolean> threaded as a function argument..."
---

# hoverSidebar

<script setup lang="ts">
import HoverSidebarDemo from "../demos/blocks/hoverSidebar.ts?raw"
</script>

A **Navigation** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `hoverSidebar()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="HoverSidebarDemo" />

::: details Implementation notes
Domphy has no context/provider primitive; the spec's shared open/expanded context is substituted with a plain State&lt;boolean&gt; threaded as a function argument between the desktop-rail and mobile-drawer builders (functionally equivalent for read/write sharing across both variants, documented in the file header). Desktop hover-expand uses mouseenter/mouseleave on the aside; mobile uses the drawer() ui patch as an overlay with a toggle button below a configurable CSS media-feature breakpoint (default ~47.9em, matching the shadcn-sidebar family's own precedent in this repo). Labels are functionally hidden at icon-only width via aria-hidden on the visible label span, with the accessible name carried permanently on the anchor's aria-label instead — so accessibility never depends on the collapse state. Collapsed/expanded widths (~15/56 spacing units) are a reasonable low-confidence default per the spec's own note that exact pixel widths aren't documented.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/sidebar)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/navigation/hoverSidebar.ts [hoverSidebar]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
