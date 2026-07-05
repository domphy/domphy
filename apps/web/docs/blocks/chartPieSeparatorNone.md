---
title: "@domphy/blocks — chartPieSeparatorNone"
description: "Implemented as chartPieSimple's full-disc layout with strokeWidth and padAngle exposed as explicit props defaulting to '0'/0 (no stroke attribute is even..."
---

# chartPieSeparatorNone

<script setup lang="ts">
import ChartPieSeparatorNoneDemo from "../demos/blocks/chartPieSeparatorNone.ts?raw"
</script>

A **Charts** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `chartPieSeparatorNone()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ChartPieSeparatorNoneDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `PieDatum[]` | — |
| `title` | `string` | — |
| `description` | `string` | — |
| `trendValue` | `string` | — |
| `trendDirection` | `"up" \| "down"` | — |
| `caption` | `string` | — |
| `valueFormatter` | `(value: number) =&gt; string` | — |
| `strokeWidth` | `string` | Exposed for callers who want to re-enable dividers. Defaults to "0" (none). |
| `padAngle` | `number` | Exposed for callers who want to re-enable dividers. Defaults to 0 (none). |

::: details Implementation notes
Implemented as chartPieSimple's full-disc layout with strokeWidth and padAngle exposed as explicit props defaulting to '0'/0 (no stroke attribute is even emitted when strokeWidth is '0'), matching the researchNote's guidance to keep this a configuration variant rather than a structurally different chart. Callers can pass non-zero values to re-enable separators. Same mount-sweep approximation caveat as chartPieSimple.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/charts/pie)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/charts/chart-pie-separator-none.ts [chartPieSeparatorNone]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
