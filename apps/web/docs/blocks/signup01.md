---
title: "@domphy/blocks — signup01"
description: "Minimal single-card signup form: card() patch (@domphy/ui) auto-places h2/p/div/footer into title/desc/content/footer grid areas; Full Name, Email(+caption),..."
---

# signup01

<script setup lang="ts">
import Signup01Demo from "../demos/blocks/signup01.ts?raw"
</script>

A **Auth** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `signup01()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Signup01Demo" />

::: details Implementation notes
Minimal single-card signup form: card() patch (@domphy/ui) auto-places h2/p/div/footer into title/desc/content/footer grid areas; Full Name, Email(+caption), Password(+caption, minlength=8), Confirm Password(+caption) fields; solid dark submit button (dataTone shift-17 edge anchor + button({color:'neutral'})) directly followed by an outline Google button with NO divider between them, matching the spec's researchNote. Reactive loading (spinner + aria-busy + disabled) and error (alert banner) props wired via toState. Deviation: does NOT reuse @domphy/ui's inputText()/inputPassword() patches for the actual &lt;input&gt; elements — inputText() forces type='text' via an unconditional _onSchedule hook (confirmed by reading packages/ui/src/patches/inputText.ts and tracing ElementNode's constructor order), which would silently unmask password fields and break type=email semantics; inputPassword() is a div-wrapper that builds its own internal &lt;input&gt; imperatively with no id/name/required/autocomplete passthrough. Built a small local `authFieldInput()` patch replicating inputText()'s exact visual formula (theme tokens only) instead, preserving correct native type/required/minlength/autocomplete attributes as the spec's behavior section demands. Google glyph is an original brand-neutral letter-badge SVG (not a reproduction of Google's official mark, since a raw multicolor brand logo would also violate the no-raw-hex-color doctor rule).

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/auth/signup01.ts [signup01]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
