---
title: "@domphy/blocks — fileUpload"
description: "Full functional port: large rounded bordered drop-zone (role=button, keyboard-activatable) with a faint repeating-linear-gradient grid pattern masked by a..."
---

# fileUpload

<script setup lang="ts">
import FileUploadDemo from "../demos/blocks/fileUpload.ts?raw"
</script>

A **Inputs** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `fileUpload()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="FileUploadDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `onChange` | `(files: File[]) =&gt; void` | Fires with the full current file list whenever a selection changes. |
| `onFilesSelected` | `(files: File[]) =&gt; void` | Alias for , matching the spec's own naming. |
| `multiple` | `boolean` | Allows selecting/dropping more than one file at once. Defaults to `true`. |
| `accept` | `string` | Native `accept` filter, e.g. `"image/*"` or `".pdf,.docx"`. |
| `maxFiles` | `number` | Maximum number of files kept — extra files (beyond this count) are dropped. |
| `maxSize` | `number` | Maximum size per file, in bytes — oversized files are silently excluded. |
| `files` | `File[]` | Externally-managed file list to render instead of the component's own internal state. |
| `className` | `string` | Extra class name merged onto the outer wrapper's native `class` attribute. |
| `style` | `StyleObject` | Passthrough style merged onto the drop-zone box. |

::: details Implementation notes
Full functional port: large rounded bordered drop-zone (role=button, keyboard-activatable) with a faint repeating-linear-gradient grid pattern masked by a radial-gradient fade toward the edges; click-to-browse via a hidden native file input, drag-and-drop via a dragenter/dragleave depth counter (avoids flicker from child-boundary crossings) that also drives a scale-up + accent-outline active state through motion(); dropped/selected files render as staggered-entrance rows (filename, formatted size, MIME type, type-aware icon) with maxFiles/maxSize/accept filtering and controlled-or-uncontrolled file list support; a two-layer faintly rotated 'ghost' outline stack behind the drop-zone's front face nudges further apart on hover per the spec's tactile-stack note. One judgment call not pinned down by the spec: only two icon variants (generic document vs. image) are used for file-type glyphs rather than a large per-MIME-type icon set, since the spec only asked for 'a file-type icon' without enumerating types, a reasonable, non-overengineered default rather than a fidelity gap.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/file-upload)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/inputs/fileUpload.ts [fileUpload]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
