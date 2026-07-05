---
title: "@domphy/blocks — chartPieInteractive"
description: "Selection is a single State<string> source of truth driving three things together: the active wedge's radius (reactive style.d using CSS path() interpolation..."
---

# chartPieInteractive

<script setup lang="ts">
import ChartPieInteractiveDemo from "../demos/blocks/chartPieInteractive.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartPieInteractive()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartPieInteractiveDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `PieDatum[]` | — |
| `title` | `string` | — |
| `description` | `string` | — |
| `valueFormatter` | `(value: number) =&gt; string` | — |
| `innerRadius` | `number` | — |
| `activeKey` | `string` | Controlled selected category key. Defaults to the first record. |
| `onSelectionChange` | `(key: string) =&gt; void` | — |
| `centerCaption` | `string` | — |
| `activeRadiusDelta` | `number` | Extra outer-radius (viewBox units) the selected wedge grows to. |

::: details Implementation notes
Selection is a single State&lt;string&gt; source of truth driving three things together: the active wedge's radius (reactive style.d using CSS path() interpolation for a ~260ms ease-out grow/shrink transition), the donut's center total text, and the native &lt;select&gt;'s own value — matching the spec's architecture note. Two genuine browser-API gaps versus the visual spec: (1) native HTML &lt;option&gt; elements cannot host a child swatch element, so 'each option carries its own color swatch' is approximated by tinting the option's own text color instead of a true swatch icon; (2) a native &lt;select&gt;'s dropdown popup is rendered by the OS/browser chrome and cannot be given a custom fade+scale open/close transition in cross-browser CSS/JS without replacing it with a fully custom (non-native) listbox widget, which would go against reusing the existing select() primitive. Everything else (enlarge/shrink transition, center value swap, swatch next to the trigger, onSelectionChange callback) is fully implemented. Direct-source-diff fix (2026-07-05): Was missing the block's signature interaction entirely — upstream draws the selected sector enlarged PLUS a detached outer ring floating beyond it. Added the reactive pop-out ring.

Status: **partial** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/pie)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-pie-interactive.ts [chartPieInteractive]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
