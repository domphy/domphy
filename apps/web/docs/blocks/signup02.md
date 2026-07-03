---
title: "@domphy/blocks — signup02"
description: "Two-column layout via pure CSS grid (1 col base, 1fr 1fr at @media(min-width:1024px)), left column uncarded form with logo row (centered on mobile, flex-start..."
---

# signup02

<script setup lang="ts">
import Signup02Demo from "../demos/blocks/signup02.ts?raw"
</script>

A **Auth** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `signup02()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Signup02Demo" />

::: details Implementation notes
Two-column layout via pure CSS grid (1 col base, 1fr 1fr at @media(min-width:1024px)), left column uncarded form with logo row (centered on mobile, flex-start at lg via @media), vertically centered form block, GitHub outline button, 'Or continue with' divider() patch, right column full-bleed cover &lt;img&gt; (position:absolute, inset:0, object-fit:cover) hidden below lg — all no-JS, matching the spec's 'purely via a CSS breakpoint' requirement. Same authFieldInput() local patch as signup01 for the same type-forcing reason. Fidelity gap: the dark-mode image dimming ('reduced brightness + grayscale filter') is approximated via `@media (prefers-color-scheme: dark)` rather than the app's explicit `[data-theme=dark]` attribute toggle, because Domphy's CSS-in-JS nesting (StyleList.addCSS) only supports SCSS-style `&`-prefixed self/descendant selectors, not an ancestor-attribute-before-& selector — there is no supported way to write `[data-theme=dark] &` as a style-object key. This is a reasonable best-effort approximation (OS-level dark preference) rather than a true app-theme-synced one; documented so a consumer can swap in a JS-driven filter toggle if exact `data-theme` sync is required.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/auth/signup02.ts [signup02]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
