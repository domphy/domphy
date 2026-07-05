---
title: "@domphy/blocks — codeComparison"
description: "Structurally complete: two bordered/rounded panels, each with a filename header and a <pre><code> block of span.line rows; VitePress/Shiki-style trailing..."
---

# codeComparison

<script setup lang="ts">
import CodeComparisonDemo from "../demos/blocks/codeComparison.ts?raw"
</script>

A **Community** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `codeComparison()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="CodeComparisonDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `leftCode` | `string` | Left/"before" panel source. |
| `rightCode` | `string` | Right/"after" panel source. |
| `filename` | `string` | Filename shown (once) in BOTH panel headers — the two panes are the same file before/after, distinguished by a `before`/`after` header label rather than by differing filenames. Defaults to `"app.&lt;language&gt;"`. |
| `language` | `string` | Language identifier — used only to build the default filename. Defaults to `"ts"`. |
| `highlightColor` | `ThemeColor` | Theme color family for `[!code highlight]` line tint. Defaults to `"warning"`. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Structurally complete: two bordered/rounded panels, each with a filename header and a &lt;pre&gt;&lt;code&gt; block of span.line rows; VitePress/Shiki-style trailing markers (// [!code highlight|++|--|focus], also # for Python/shell) are parsed and stripped, driving a soft dataTone-anchored row tint (or, for at least one focus marker, dimming all non-focused lines) with no diff-gutter symbols, matching the spec. Marked 'partial' specifically for the syntax highlighting itself: this package ships no syntax-highlighter dependency (only cobe/canvas-confetti/rough-notation are installed, and I was told not to add new ones without flagging it), so tokens are colored via a small dependency-free regex tokenizer (comment/string/number/keyword/plain, with a merged JS+Python+Rust/Go-ish keyword list) rather than a real grammar-aware highlighter — it reads as 'syntax highlighted' for common C-like snippets but will misclassify language-specific edge cases a Shiki/Prism grammar would get right, and has no per-language grammar switching despite the `language` prop (which only affects the fallback filename label). Direct-source-diff fix (2026-07-05, follow-up): added the VS badge, per-header file icon, and unified filename prop, verified visually via screenshot. (The syntax-highlighting gap remains a separate, already-documented `partial` limitation.)

Status: **partial** · Reference: [Magic UI original](https://magicui.design/docs/components/code-comparison)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/community/codeComparison.ts [codeComparison]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
