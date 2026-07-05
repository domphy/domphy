---
title: "@domphy/blocks — sidebar11"
description: "Fully recursive folder/file tree component (arbitrary depth via a discriminated-union node type), ancestor folders of the active file pre-expanded on first..."
---

# sidebar11

<script setup lang="ts">
import Sidebar11Demo from "../demos/blocks/sidebar11.ts?raw"
</script>

A **Sidebar** block/component from **[shadcn/ui](/docs/blocks/shadcn)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `sidebar11()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="Sidebar11Demo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `tree` | `Sidebar11TreeNode[]` | — |
| `activeFilePath` | `string` | — |
| `user` | `SidebarUser` | — |
| `onFolderToggle` | `(path: string, open: boolean) =&gt; void` | — |
| `onFileSelect` | `(path: string) =&gt; void` | — |
| `children` | `DomphyElement \| DomphyElement[]` | — |

::: details Implementation notes
Fully recursive folder/file tree component (arbitrary depth via a discriminated-union node type), ancestor folders of the active file pre-expanded on first render, active file highlighted, and a header breadcrumb rebuilt reactively (keyed by cumulative path, not index) from the active file's path segments on every selection. Minor, intentional parity note: like the sibling sidebar05-08 accordions, a folder's expand/collapse state is computed once at construction and does not auto re-expand ancestors on a later click-driven selection change — matches the established convention in this package rather than a divergent gap.

Status: **ported** · Reference: [shadcn/ui original](https://ui.shadcn.com/blocks)
:::

::: code-group
<<< ../../../../packages/blocks/src/shadcn/sidebar/sidebar11.ts [sidebar11]
:::

[← Back to shadcn/ui catalog](/docs/blocks/shadcn)
