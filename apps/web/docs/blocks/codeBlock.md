---
title: "@domphy/blocks — codeBlock"
description: "Syntax highlighting is a small dependency-free regex tokenizer (comment/string/number/keyword/plain) — reads as 'syntax highlighted' for common..."
---

# codeBlock

<script setup lang="ts">
import CodeBlockDemo from "../demos/blocks/codeBlock.ts?raw"
</script>

A **Layout** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `codeBlock()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="CodeBlockDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `code` | `string` | Single-snippet mode: raw source text. Ignored when `tabs` is set. |
| `filename` | `string` | Single-snippet mode: tab label. Defaults to `"index.ts"`. |
| `language` | `string` | Single-snippet mode: language identifier (label/metadata only). Defaults to `"ts"`. |
| `highlightLines` | `number[]` | Single-snippet mode: 1-based highlighted line numbers. |
| `tabs` | `CodeBlockTab[]` | Multi-tab mode: overrides `code`/`filename`/`language`/`highlightLines`. |
| `highlightColor` | `ThemeColor` | Theme color family for highlighted-line tint and the active tab's underline. Defaults to `"warning"`. |
| `className` | `string` | Extra class name merged onto the outer panel. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Syntax highlighting is a small dependency-free regex tokenizer (comment/string/number/keyword/plain) — reads as 'syntax highlighted' for common C-like/Python-like snippets but is not a grammar-aware highlighter (Shiki/Prism); intentionally duplicated (not imported) from this package's own codeComparison.ts tokenizer since block files here are self-contained with no cross-file imports. highlightLines is a first-class prop (1-based line numbers) rather than the VitePress-style `// [!code highlight]` marker-comment convention codeComparison.ts also supports — kept as pure prop-driven per the spec's own prop list. The 2000ms copy-confirmation revert delay is a reasonable default, not a confirmed upstream value, matching the spec's own researchNote 'moderate confidence' flag on that number. Tab switching is a real opacity 0→1 fade (not a simultaneous old/new crossfade) sequenced through a double requestAnimationFrame so the browser paints the cleared frame before animating back in.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/code-block)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/layout/codeBlock.ts [codeBlock]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
