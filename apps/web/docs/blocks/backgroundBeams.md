---
title: "@domphy/blocks — backgroundBeams"
description: "Uses the package's existing 'static path, moving gradient' technique (same idiom as animatedBeam.ts): procedurally generated S-curve fibers with a per-beam..."
---

# backgroundBeams

<script setup lang="ts">
import BackgroundBeamsDemo from "../demos/blocks/backgroundBeams.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `backgroundBeams()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="BackgroundBeamsDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `paths` | `string[]` | Custom SVG path `d` strings, overriding the default generated fibers. |
| `count` | `number` | Number of default beams generated when `paths` is omitted. Capped for performance (the reference ships roughly 50; this defaults far lower). Defaults to `20`. |
| `colors` | `ThemeColor[]` | Theme color roles cycled across each beam's traveling band (three consecutive roles per beam approximate a multi-hue "cyan-purple-magenta" band). Defaults to `["info", "primary", "secondary"]`. |
| `duration` | `number` | Seconds per beam's full travel cycle (base value — actual per-beam duration is randomized around it so beams desync). Defaults to `8`. |
| `blur` | `number` | Blur radius applied to every beam's stroke, in px. Defaults to `1.5`. |
| `showVignette` | `boolean` | Toggles the radial-gradient edge-fade overlay. Defaults to `true`. |
| `children` | `DomphyElement \| DomphyElement[]` | Foreground content layered above the beams. Defaults to a small demo heading. |
| `style` | `StyleObject` | Passthrough style merged onto the outer container. |

::: details Implementation notes
Uses the package's existing 'static path, moving gradient' technique (same idiom as animatedBeam.ts): procedurally generated S-curve fibers with a per-beam linearGradient sliding through objectBoundingBox coordinates, driven by a single IntersectionObserver-gated rAF loop. Two intentional divergences from the reference: (1) default beam count capped at 20 rather than ~50 for perf, per the spec's own research note; (2) the reference's literal cyan/purple/magenta or orange/red hex gradient stops are replaced with cycling Domphy ThemeColor roles (default info/primary/secondary) since raw hex/rgb is forbidden by doctor rules — visually reads as multi-hued across the beam field but each single beam's band is limited to the theme's own color ramp rather than an arbitrary hue.

Status: **partial** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/background-beams)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/backgroundBeams.ts [backgroundBeams]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
