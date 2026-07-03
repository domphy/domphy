---
title: "@domphy/blocks — signup04"
description: "Form + decorative-image combined into one contained panel (dataTone='shift-0' edge anchor, its own border/shadow-like outline, rounded corners) on a muted page..."
---

# signup04

<script setup lang="ts">
import Signup04Demo from "../demos/blocks/signup04.ts?raw"
</script>

A **Auth** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `signup04()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Signup04Demo" />

::: details Implementation notes
Form + decorative-image combined into one contained panel (dataTone='shift-0' edge anchor, its own border/shadow-like outline, rounded corners) on a muted page background (dataTone='shift-2' on the page root). Panel is 1-col on mobile, 2-col at @media(min-width:768px); panel max-width expands from themeSpacing(96)=24em to themeSpacing(224)=56em at the same breakpoint, both pure CSS, no JS. Email field, Password/Confirm as a 2-col grid with shared caption, solid submit, 'Or continue with' divider, and a 3-column row of ICON-ONLY outline buttons for Apple/Google/Meta (configurable via a `providers` prop, each item gets a stable `_key`). Legal line below the panel. No logo row (the spec's domSketch and summary don't include one for this variant, unlike 02/03/05). Provider glyphs are original brand-neutral letter-badge SVGs, not brand marks. Same authFieldInput() local patch as the others.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/auth/signup04.ts [signup04]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
