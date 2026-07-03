---
title: "@domphy/blocks — stickyBanner"
description: "hideOnScroll defaults to false per spec."
---

# stickyBanner

<script setup lang="ts">
import StickyBannerDemo from "../demos/blocks/stickyBanner.ts?raw"
</script>

A **Navigation** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `stickyBanner()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="StickyBannerDemo" />

::: details Implementation notes
hideOnScroll defaults to false per spec. When enabled, a one-way latch (hidden state only ever flips to true past the documented ~40px threshold and is never reset) matches the documented 'no reappear on scroll up' behavior exactly, distinguishing it from floatingNavbar's two-way direction toggle. Default accent color uses the theme's own 'primary' family rather than a hardcoded purple/violet hex, per the spec's explicit note that Aceternity's purple is just example styling, not a documented default.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/sticky-banner)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/navigation/stickyBanner.ts [stickyBanner]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
