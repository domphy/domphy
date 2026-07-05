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

## Props

| Prop | Type | Description |
|---|---|---|
| `message` | `string` | Announcement message text. Defaults to a generic release-note demo string. |
| `ctaLabel` | `string` | Inline call-to-action link label. Defaults to "Read announcement". |
| `ctaHref` | `string` | — |
| `onCtaClick` | `(event: MouseEvent) =&gt; void` | — |
| `hideOnScroll` | `boolean` | Enables the auto-hide-on-scroll behavior: once scrolled past ~40px, the banner slides up and stays hidden (it does not reappear on scrolling back up). Defaults to false — the banner stays put like an ordinary sticky header unless a caller opts in. |
| `accentColor` | `ThemeColor` | Background/accent color family. The saturated purple seen in Aceternity's own demo is just example styling, not a documented default — this block defaults to the theme's own "primary" family instead of a hardcoded hue. |

::: details Implementation notes
hideOnScroll defaults to false per spec. When enabled, a one-way latch (hidden state only ever flips to true past the documented ~40px threshold and is never reset) matches the documented 'no reappear on scroll up' behavior exactly, distinguishing it from floatingNavbar's two-way direction toggle. Default accent color uses the theme's own 'primary' family rather than a hardcoded purple/violet hex, per the spec's explicit note that Aceternity's purple is just example styling, not a documented default.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/sticky-banner)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/navigation/stickyBanner.ts [stickyBanner]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
