---
title: "@domphy/blocks — resizableNavbar"
description: "Continuous scroll-offset interpolation (0..1 progress over a configurable shrinkDistancePx, default 240) drives width/margin/border-radius/padding via a JS..."
---

# resizableNavbar

<script setup lang="ts">
import ResizableNavbarDemo from "../demos/blocks/resizableNavbar.ts?raw"
</script>

A **Navigation** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `resizableNavbar()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ResizableNavbarDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `items` | `ResizableNavItem[]` | Nav link entries, shared by the desktop bar and the mobile panel. Defaults to a 4-item marketing-site demo set. |
| `logoLabel` | `string` | Brand/logo text. Defaults to "Acme". |
| `buttons` | `ResizableNavButton[]` | Trailing action buttons. Defaults to a "Login" + "Book a call" pair. |
| `showDesktop` | `boolean` | Renders the desktop row. Defaults to true. |
| `showMobile` | `boolean` | Renders the mobile header + panel. Defaults to true. |
| `mobileOpen` | `ValueOrState&lt;boolean&gt;` | Mobile menu open state — pass your own `State` to control it externally. Defaults to false. |
| `onMobileOpenChange` | `(open: boolean) =&gt; void` | — |
| `shrinkDistancePx` | `number` | Scroll distance (px) over which the bar fully shrinks into its pill shape. Defaults to 240. |

::: details Implementation notes
Continuous scroll-offset interpolation (0..1 progress over a configurable shrinkDistancePx, default 240) drives width/margin/border-radius/padding via a JS lerp() helper formatted into template-literal style values, rather than a native CSS scroll-timeline (broader browser support, and Domphy's reactive style functions already give per-frame control). This is a continuous resize, never a hide, correctly distinguishing it from floatingNavbar. Four button variants are supported (primary/secondary/dark/gradient); gradient is built from themeColor()-composed linear-gradient() stops, never a literal hex color.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/resizable-navbar)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/navigation/resizableNavbar.ts [resizableNavbar]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
