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

::: details Implementation notes
Full recursive tree: folder rows toggle via a CSS grid 0fr/1fr accordion track (animates any content height without JS measurement, avoids &lt;details&gt;'s UA display:none-on-closed which can't smoothly transition), a rotating chevron, and a closed/open icon swap (both custom hand-drawn generic folder/document SVG glyphs, not any real icon library's artwork). File rows select with a persistent aria-selected highlight. Supports controlled/pre-set expandedIds and selectedId (plain array/id or a Domphy State for external control), per-node selectable flag, folders-first/as-is/custom-comparator sort modes, custom renderFolderIcon/renderFileIcon callbacks, onSelect/onToggle callbacks, and ltr/rtl via the dir attribute + logical padding properties. One deliberate deviation from a literal prop-default reading: passing custom `data` without `selectedId`/`expandedIds` starts with nothing selected/expanded rather than reusing the built-in demo's ids, which would otherwise silently no-op against unrelated data.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/file-tree)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/community/fileTree.ts [fileTree]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
