---
title: "@domphy/blocks — fileTree"
description: "Full recursive tree: folder rows toggle via a CSS grid 0fr/1fr accordion track (animates any content height without JS measurement, avoids <details>'s UA..."
---

# fileTree

<script setup lang="ts">
import FileTreeDemo from "../demos/blocks/fileTree.ts?raw"
</script>

A **Community** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `fileTree()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="FileTreeDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `data` | `FileTreeNode[]` | Root-level nodes. Defaults to a small demo `src/` layout. |
| `expandedIds` | `ValueOrState&lt;string[]&gt;` | Folder ids that start (or, when a `State` is passed, stay) expanded. |
| `selectedId` | `ValueOrState&lt;string \| null&gt;` | The initially (or, when a `State` is passed, externally) selected node id. |
| `sort` | `FileTreeSortMode` | How sibling nodes at each level are ordered. Defaults to `"folders-first"`. |
| `direction` | `"ltr" \| "rtl"` | Text direction. Defaults to `"ltr"`. |
| `renderFolderIcon` | `(open: boolean, node: FileTreeNode) =&gt; DomphyElement` | Custom closed/open folder icon renderer. Defaults to a generic folder glyph. |
| `renderFileIcon` | `(node: FileTreeNode) =&gt; DomphyElement` | Custom file icon renderer (e.g. per extension). Defaults to a generic document glyph. |
| `onSelect` | `(node: FileTreeNode) =&gt; void` | — |
| `onToggle` | `(node: FileTreeNode, open: boolean) =&gt; void` | — |
| `color` | `ThemeColor` | Theme color for the panel surface/borders. Defaults to `"neutral"`. |
| `accentColor` | `ThemeColor` | Accent color for the selected-row highlight. Defaults to `"primary"`. |
| `style` | `StyleObject` | — |

::: details Implementation notes
Full recursive tree: folder rows toggle via a CSS grid 0fr/1fr accordion track (animates any content height without JS measurement, avoids &lt;details&gt;'s UA display:none-on-closed which can't smoothly transition), a rotating chevron, and a closed/open icon swap (both custom hand-drawn generic folder/document SVG glyphs, not any real icon library's artwork). File rows select with a persistent aria-selected highlight. Supports controlled/pre-set expandedIds and selectedId (plain array/id or a Domphy State for external control), per-node selectable flag, folders-first/as-is/custom-comparator sort modes, custom renderFolderIcon/renderFileIcon callbacks, onSelect/onToggle callbacks, and ltr/rtl via the dir attribute + logical padding properties. One deliberate deviation from a literal prop-default reading: passing custom `data` without `selectedId`/`expandedIds` starts with nothing selected/expanded rather than reusing the built-in demo's ids, which would otherwise silently no-op against unrelated data.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/file-tree)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/community/fileTree.ts [fileTree]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
