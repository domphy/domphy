---
title: "@domphy/blocks — Login02"
description: "Full page-level 2-col grid (brand row + centered form column | full-bleed cover photo), image column hidden and grid collapses to 1 col at max-width 47.9375em..."
---

# Login02

<script setup lang="ts">
import Login02Demo from "../demos/blocks/Login02.ts?raw"
</script>

A **Auth** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `Login02()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Login02Demo" />

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
| `githubButtonLabel` | `string` | — |
| `onGithubClick` | `() =&gt; void` | — |
| `signUpPrompt` | `string` | — |
| `signUpLabel` | `string` | — |
| `signUpHref` | `string` | — |
| `coverImageSrc` | `string` | — |
| `coverImageAlt` | `string` | — |
| `dimCoverInDarkMode` | `boolean` | — |
| `onSubmit` | `(values: { email: string; password: string }) =&gt; void` | — |

::: details Implementation notes
Full page-level 2-col grid (brand row + centered form column | full-bleed cover photo), image column hidden and grid collapses to 1 col at max-width 47.9375em via @media. Dark-mode image dimming via prefers-color-scheme media query (brightness+saturate filter), discrete not animated. GitHub glyph is a simplified hand-authored octocat-style silhouette, original geometry. Doctor diagnose(): 0 findings.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/auth/login02.ts [Login02]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
