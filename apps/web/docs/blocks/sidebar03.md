---
title: "@domphy/blocks — sidebar03"
description: "Same shell as sidebar01, but nav items may carry a `children` array; such items render as a <details> row (icon+label+auto chevron) whose child <ul> is..."
---

# sidebar03

<script setup lang="ts">
import Sidebar03Demo from "../demos/blocks/sidebar03.ts?raw"
</script>

A **Sidebar** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `sidebar03()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Sidebar03Demo" />

::: details Implementation notes
Same shell as sidebar01, but nav items may carry a `children` array; such items render as a &lt;details&gt; row (icon+label+auto chevron) whose child &lt;ul&gt; is indented with a themed left border-guide line. Leaf items and child links use aria-current=page for active-state highlighting (verified in the test that both a top-level and a nested child active item are marked). One level of nesting only, per spec's researchNote. doctor diagnose() reports 0 issues.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/sidebar/sidebar03.ts [sidebar03]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
