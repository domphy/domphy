---
title: "@domphy/blocks — Login03"
description: "Muted-background page (dataTone shift-2 edge anchor), logo+wordmark row above card, OAuth-first button ordering (Apple/Google) above the divider and..."
---

# Login03

<script setup lang="ts">
import Login03Demo from "../demos/blocks/Login03.ts?raw"
</script>

A **Auth** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `Login03()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Login03Demo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `brandName` | `string` | — |
| `heading` | `string` | — |
| `subheading` | `string` | — |
| `appleButtonLabel` | `string` | — |
| `onAppleClick` | `() =&gt; void` | — |
| `googleButtonLabel` | `string` | — |
| `onGoogleClick` | `() =&gt; void` | — |
| `dividerText` | `string` | — |
| `emailLabel` | `string` | — |
| `emailPlaceholder` | `string` | — |
| `passwordLabel` | `string` | — |
| `forgotPasswordHref` | `string` | — |
| `primaryButtonLabel` | `string` | — |
| `signUpPrompt` | `string` | — |
| `signUpLabel` | `string` | — |
| `signUpHref` | `string` | — |
| `termsLabel` | `string` | — |
| `termsHref` | `string` | — |
| `privacyLabel` | `string` | — |
| `privacyHref` | `string` | — |
| `onSubmit` | `(values: { email: string; password: string }) =&gt; void` | — |

::: details Implementation notes
Muted-background page (dataTone shift-2 edge anchor), logo+wordmark row above card, OAuth-first button ordering (Apple/Google) above the divider and email/password form, legal Terms/Privacy footer below the card. Apple/Google glyphs are simplified hand-authored silhouettes, original geometry. Doctor diagnose(): 0 findings.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/auth/login03.ts [Login03]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
