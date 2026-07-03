---
title: "@domphy/blocks — marquee3D"
description: "Full behavior implemented, pure CSS (no animation-frame loop, per the spec's own animation note): a fixed perspective()+rotateX/rotateY/rotateZ tilt on the..."
---

# marquee3D

<script setup lang="ts">
import Marquee3DDemo from "../demos/blocks/marquee3D.ts?raw"
</script>

A **Effects 3D** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `marquee3D()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Marquee3DDemo" />

::: details Implementation notes
Full behavior implemented, pure CSS (no animation-frame loop, per the spec's own animation note): a fixed perspective()+rotateX/rotateY/rotateZ tilt on the grid wrapper, per-column infinite loops using the same 'translate by exactly one repeated group length' trick this package's marquee.ts uses, alternating columns via animation-direction:reverse plus a small negative animation-delay stagger, an optional co-tilted grid-line decoration layer (a plain descendant of the transformed wrapper, so it tilts for free with no extra transform needed), and an optional un-rotated hero heading overlay. The documented upstream grid-line defaults (200px horizontal / 150px vertical) are preserved as the prop defaults but converted to themeSpacing() units internally so the component never emits literal px in its style objects. Exact tilt angles (rotateX 55°/rotateZ -45°) are this implementer's reasonable choice for a classic isometric read, since the spec didn't mandate specific degrees.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/3d-marquee)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/effects-3d/marquee3D.ts [marquee3D]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
