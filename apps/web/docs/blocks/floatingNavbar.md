---
title: "@domphy/blocks — floatingNavbar"
description: "Direction-based (not distance-threshold-based) hide/reveal via a rAF-throttled window scroll listener comparing consecutive scrollY reads, matching the spec's..."
---

# floatingNavbar

<script setup lang="ts">
import FloatingNavbarDemo from "../demos/blocks/floatingNavbar.ts?raw"
</script>

A **Navigation** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `floatingNavbar()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="FloatingNavbarDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `items` | `FloatingNavbarItem[]` | Nav link entries. Defaults to a 4-item marketing-site demo set. |
| `ctaLabel` | `string` | Trailing call-to-action button label. Defaults to "Login". |
| `ctaHref` | `string` | Call-to-action button href. Defaults to "#". |
| `onCtaClick` | `(event: MouseEvent) =&gt; void` | — |
| `scrollSensitivityPx` | `number` | Minimum absolute scroll delta (px) between two frames before a direction change is honored — filters out sub-pixel scroll jitter. Defaults to 4. |

::: details Implementation notes
Direction-based (not distance-threshold-based) hide/reveal via a rAF-throttled window scroll listener comparing consecutive scrollY reads, matching the spec's documented distinguishing behavior versus stickyBanner. A small sensitivity floor (default 4px) filters sub-pixel jitter, and downward hides only past scrollY&gt;80 to avoid flicker right at the top of the page (no numeric threshold is documented upstream, so this is a reasonable low-confidence default). Nav links reuse the listItemButton() ui patch for the hover highlight; CTA reuses linkButton().

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/floating-navbar)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/navigation/floatingNavbar.ts [floatingNavbar]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
