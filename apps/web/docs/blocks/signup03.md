---
title: "@domphy/blocks — signup03"
description: "Single-column form on a full-viewport muted background (dataTone='shift-2' edge-anchor on the root, with the required literal backgroundColor+color pair for..."
---

# signup03

<script setup lang="ts">
import Signup03Demo from "../demos/blocks/signup03.ts?raw"
</script>

A **Auth** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `signup03()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Signup03Demo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `companyName` | `string` | — |
| `logoHref` | `string` | — |
| `title` | `string` | — |
| `subtitle` | `string` | — |
| `fullNameLabel` | `string` | — |
| `fullNamePlaceholder` | `string` | — |
| `emailLabel` | `string` | — |
| `emailPlaceholder` | `string` | — |
| `passwordLabel` | `string` | — |
| `confirmPasswordLabel` | `string` | — |
| `passwordCaption` | `string` | — |
| `submitLabel` | `string` | — |
| `signInPrompt` | `string` | — |
| `signInLinkText` | `string` | — |
| `signInHref` | `string` | — |
| `termsHref` | `string` | — |
| `privacyHref` | `string` | — |
| `onSubmit` | `(event: SubmitEvent) =&gt; void` | — |

::: details Implementation notes
Single-column form on a full-viewport muted background (dataTone='shift-2' edge-anchor on the root, with the required literal backgroundColor+color pair for doctor's dataTone-surface-contract). Centered logo row, uncarded content block, Full Name, Email(+caption), then Password/Confirm Password as a 2-column CSS grid sharing one caption below the grid, solid submit button, sign-in footer line, and a centered legal line (Terms of Service / Privacy Policy) below the block — matching the researchNote that this is the only variant with no social button and the only one (besides signup04) with the legal disclaimer. Same authFieldInput() local patch as signup01/02. Direct-source-diff fix (2026-07-05): Rendered uncarded on the muted page — upstream signup-03 wraps the header+form in a visible Card, matching its sibling login03. Wrapped in card({color:'neutral'}).

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/auth/signup03.ts [signup03]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
