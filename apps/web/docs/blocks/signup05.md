---
title: "@domphy/blocks — signup05"
description: "Most minimal variant: plain (non-muted) page background, single centered column."
---

# signup05

<script setup lang="ts">
import Signup05Demo from "../demos/blocks/signup05.ts?raw"
</script>

A **Auth** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `signup05()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Signup05Demo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `companyName` | `string` | — |
| `logoHref` | `string` | — |
| `greeting` | `string` | — |
| `signInPrompt` | `string` | — |
| `signInLinkText` | `string` | — |
| `signInHref` | `string` | — |
| `emailLabel` | `string` | — |
| `emailPlaceholder` | `string` | — |
| `submitLabel` | `string` | — |
| `providers` | `SocialProvider[]` | — |
| `termsHref` | `string` | — |
| `privacyHref` | `string` | — |
| `onSubmit` | `(event: SubmitEvent) =&gt; void` | — |

::: details Implementation notes
Most minimal variant: plain (non-muted) page background, single centered column. Header holds the logo row, an h1 'Welcome to Acme Inc.' greeting, and the 'Already have an account? Sign in' line directly beneath the heading (inside the header, NOT the footer) — verified in the test by asserting DOM order (heading before sign-in link before form), preserving the spec's called-out welcome-first hierarchy. Single Email field (no password — implies a passwordless/magic-link flow per the spec's behavior note), solid submit button, 'Or' divider, and a 2-column row of outline buttons for Apple/Google that include both an icon and a visible label (a defensible reading of 'outline buttons ... each with its provider glyph', distinct from signup04's explicitly icon-only 3-up row). Legal line at the bottom. Same authFieldInput()-style local patch and letter-badge glyph approach as signup04.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/auth/signup05.ts [signup05]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
