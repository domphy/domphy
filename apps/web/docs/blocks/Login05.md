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

## Props

| Prop | Type | Description |
|---|---|---|
| `title` | `string` | — |
| `signUpPrompt` | `string` | — |
| `signUpLabel` | `string` | — |
| `signUpHref` | `string` | — |
| `emailLabel` | `string` | — |
| `emailPlaceholder` | `string` | — |
| `primaryButtonLabel` | `string` | — |
| `dividerText` | `string` | — |
| `appleButtonLabel` | `string` | — |
| `onAppleClick` | `() =&gt; void` | — |
| `googleButtonLabel` | `string` | — |
| `onGoogleClick` | `() =&gt; void` | — |
| `termsLabel` | `string` | — |
| `termsHref` | `string` | — |
| `privacyLabel` | `string` | — |
| `privacyHref` | `string` | — |
| `onSubmit` | `(values: { email: string }) =&gt; void` | — |

::: details Implementation notes
Passwordless entry point: header row (logo badge + bold title, sign-up link right-aligned), single required email field, primary Login button, 'Or' divider, Apple/Google outline fallback buttons, legal footer. No password field / no forgot-password link, matching the spec. Doctor diagnose(): 0 findings. Direct-source-diff fix (2026-07-05): Header was a horizontal row and the two OAuth buttons were stacked — upstream centers the header as a vertical stack and lays the OAuth buttons out in a 2-column grid at 40em. Rebuilt to match.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/auth/login05.ts [Login05]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
