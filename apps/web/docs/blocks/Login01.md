---
title: "@domphy/blocks — Login01"
description: "Full structure per spec: centered narrow card (card() patch), title+description header, email/password fields with inline forgot-password link, solid primary..."
---

# Login01

<script setup lang="ts">
import Login01Demo from "../demos/blocks/Login01.ts?raw"
</script>

A **Auth** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `Login01()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Login01Demo" />

::: details Implementation notes
Full structure per spec: centered narrow card (card() patch), title+description header, email/password fields with inline forgot-password link, solid primary submit + outline Google OAuth button, sign-up footer line. Google glyph is a simplified hand-authored monochrome silhouette (original geometry), not the official trademarked asset. Doctor diagnose(): 0 findings.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/auth/login01.ts [Login01]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
