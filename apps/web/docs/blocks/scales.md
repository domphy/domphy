---
title: "@domphy/blocks — scales"
description: "Implemented as a tileable SVG <pattern> (diagonal reuses this package's stripedPattern three-line-per-tile seam trick; horizontal/vertical use one edge-pinned..."
---

# scales

<script setup lang="ts">
import ScalesDemo from "../demos/blocks/scales.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `scales()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ScalesDemo" />

::: details Implementation notes
Implemented as a tileable SVG &lt;pattern&gt; (diagonal reuses this package's stripedPattern three-line-per-tile seam trick; horizontal/vertical use one edge-pinned line per tile) rather than a repeating-linear-gradient background-image — the spec's own researchNote explicitly allows either technique as equally valid. Only one exportName was specified in the task, so the single `scales()` factory doubles as the reference's separate 'container' wrapper variant: any `children` passed in render above the pattern via a position:relative content slot, matching the documented composited-content behavior without a second export.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/scales)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/scales.ts [scales]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
