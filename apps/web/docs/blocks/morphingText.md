---
title: "@domphy/blocks — morphingText"
description: "Full behavior implemented: a hidden SVG filter (feGaussianBlur -> feColorMatrix with a steep alpha-contrast matrix) applied statically to a container wrapping..."
---

# morphingText

<script setup lang="ts">
import MorphingTextDemo from "../demos/blocks/morphingText.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `morphingText()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="MorphingTextDemo" />

::: details Implementation notes
Full behavior implemented: a hidden SVG filter (feGaussianBlur -&gt; feColorMatrix with a steep alpha-contrast matrix) applied statically to a container wrapping absolutely-stacked phrase layers; on each interval tick the reactive single-item phrase list is replaced in one `set()` call so the framework's reconciler mounts the new phrase (`motion()` enter) while the old one's `_onBeforeRemove` plays its exit concurrently — the goo filter fuses their overlapping soft edges during that overlap and re-sharpens a single resting phrase. The spec's optional third 'plain non-filtered duplicate layer on top for crisp readability' was intentionally omitted: the same contrast-matrix thresholding that produces the goo effect during overlap is what keeps a single settled phrase sharp, so the extra layer is redundant for this implementation. jsdom has no Web Animations API, so motion()'s enter/exit become synchronous no-ops in tests (verified structurally); real browsers get the actual opacity tween.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/morphing-text)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/morphingText.ts [morphingText]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
