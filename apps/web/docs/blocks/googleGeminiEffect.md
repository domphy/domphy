---
title: "@domphy/blocks — googleGeminiEffect"
description: "Ribbon shapes are generated procedurally at build time (Catmull-Rom spline through sine-perturbed anchor points, converted to cubic Bezier segments) instead of..."
---

# googleGeminiEffect

<script setup lang="ts">
import GoogleGeminiEffectDemo from "../demos/blocks/googleGeminiEffect.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `googleGeminiEffect()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="GoogleGeminiEffectDemo" />

::: details Implementation notes
Ribbon shapes are generated procedurally at build time (Catmull-Rom spline through sine-perturbed anchor points, converted to cubic Bezier segments) instead of hand-authored path 'd' data, per the task's clean-room instruction not to copy path data verbatim. Arc length for those generated ribbons is computed analytically by sampling the Bezier segments, so the default demo's stroke-draw animation is deterministic even under jsdom (no SVGPathElement.getTotalLength() dependency). Callers who instead supply their own custom `d` string get length via `getTotalLength()` at mount time (guarded, falls back to a width-based heuristic when unavailable, e.g. headless/jsdom runtimes) since arbitrary path grammar can't be measured analytically. Scroll-progress is tracked via a scroll/resize listener measuring the section's own scroll-through fraction of the viewport (rAF-lerped for smoothness), remapped per-path through staggered [start,end] sub-ranges so ribbons finish drawing at different moments; per-path `progress` overrides (plain number or State&lt;number&gt;) fully bypass this internal tracking, matching the spec's 'parent controls it directly' requirement. Colors cycle through Domphy theme color roles (info/primary/secondary/error/warning) rather than literal Gemini hex values, since raw hex/rgb is forbidden by the design system.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/google-gemini-effect)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/googleGeminiEffect.ts [googleGeminiEffect]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
