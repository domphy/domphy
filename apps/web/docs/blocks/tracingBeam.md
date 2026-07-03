---
title: "@domphy/blocks — tracingBeam"
description: "Static procedurally generated S-curve SVG path, measured via getTotalLength() (wrapped in try/catch for non-layout test runtimes), revealed top-down with the..."
---

# tracingBeam

<script setup lang="ts">
import TracingBeamDemo from "../demos/blocks/tracingBeam.ts?raw"
</script>

A **Backgrounds** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `tracingBeam()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="TracingBeamDemo" />

::: details Implementation notes
Static procedurally generated S-curve SVG path, measured via getTotalLength() (wrapped in try/catch for non-layout test runtimes), revealed top-down with the standard stroke-dasharray/stroke-dashoffset technique. Scroll progress is scoped to the content wrapper's own bounding rect (not document height), per the spec's research note. A critically-damped spring-damper integrator (reusing the same physics smoothCursor.ts already implements in this package) chases the raw scroll fraction, giving the leading edge a slight overshoot-and-settle on fast scrolls. Reference's literal #18CCFC/#6344F5/#AE48FF hex stops replaced with cycling ThemeColor roles (default info/primary/secondary). Cross-sibling DOM refs (svg column vs. content column) are wired via a mutual-registration + guarded trySetup() pattern rather than DOM querying, since this package's client render() fires _onMount top-down (a parent's hook can fire before a later sibling subtree even exists).

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/tracing-beam)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/backgrounds/tracingBeam.ts [tracingBeam]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
