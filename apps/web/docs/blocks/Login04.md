---
title: "@domphy/blocks — Login04"
description: "Two-column card frame (form | cover photo) on a muted page background; card surface is hand-styled (radius/outline/overflow matching card()'s own formula)..."
---

# Login04

<script setup lang="ts">
import Login04Demo from "../demos/blocks/Login04.ts?raw"
</script>

A **Auth** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `Login04()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Login04Demo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `brandName` | `string` | — |
| `heading` | `string` | — |
| `description` | `string` | — |
| `emailLabel` | `string` | — |
| `emailPlaceholder` | `string` | — |
| `passwordLabel` | `string` | — |
| `forgotPasswordHref` | `string` | — |
| `primaryButtonLabel` | `string` | — |
| `dividerText` | `string` | — |
| `appleAccessibleLabel` | `string` | — |
| `onAppleClick` | `() =&gt; void` | — |
| `googleAccessibleLabel` | `string` | — |
| `onGoogleClick` | `() =&gt; void` | — |
| `metaAccessibleLabel` | `string` | — |
| `onMetaClick` | `() =&gt; void` | — |
| `signUpPrompt` | `string` | — |
| `signUpLabel` | `string` | — |
| `signUpHref` | `string` | — |
| `termsLabel` | `string` | — |
| `termsHref` | `string` | — |
| `privacyLabel` | `string` | — |
| `privacyHref` | `string` | — |
| `coverImageSrc` | `string` | — |
| `coverImageAlt` | `string` | — |
| `dimCoverInDarkMode` | `boolean` | — |
| `onSubmit` | `(values: { email: string; password: string }) =&gt; void` | — |

::: details Implementation notes
Two-column card frame (form | cover photo) on a muted page background; card surface is hand-styled (radius/outline/overflow matching card()'s own formula) rather than using the card() patch directly, because card()'s fixed grid-template-areas can't give the image side zero padding while the form side keeps its own — documented in the file's header comment. Three-provider OAuth row (Apple/Google/Meta), legal footer below the card. Doctor diagnose(): 0 findings.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/auth/login04.ts [Login04]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
