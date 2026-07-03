---
title: "@domphy/blocks — Login05"
description: "Passwordless entry point: header row (logo badge + bold title, sign-up link right-aligned), single required email field, primary Login button, 'Or' divider,..."
---

# Login05

<script setup lang="ts">
import Login05Demo from "../demos/blocks/Login05.ts?raw"
</script>

A **Auth** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `Login05()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Login05Demo" />

::: details Implementation notes
Passwordless entry point: header row (logo badge + bold title, sign-up link right-aligned), single required email field, primary Login button, 'Or' divider, Apple/Google outline fallback buttons, legal footer. No password field / no forgot-password link, matching the spec. Doctor diagnose(): 0 findings.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/auth/login05.ts [Login05]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
