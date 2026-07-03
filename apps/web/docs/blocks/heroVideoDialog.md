---
title: "@domphy/blocks — heroVideoDialog"
description: "Built on @domphy/ui's dialog() patch (native <dialog>, backdrop fade, focus trap, scroll lock, outside-click-to-close already handled there) with an additional..."
---

# heroVideoDialog

<script setup lang="ts">
import HeroVideoDialogDemo from "../demos/blocks/heroVideoDialog.ts?raw"
</script>

A **Core** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `heroVideoDialog()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="HeroVideoDialogDemo" />

::: details Implementation notes
Built on @domphy/ui's dialog() patch (native &lt;dialog&gt;, backdrop fade, focus trap, scroll lock, outside-click-to-close already handled there) with an additional transform layered on top via _onMount, keyed to 8 named animationStyle presets (from-center default grow, 4 edge slides, fade, and 2 asymmetric enter/exit combos: top-in-bottom-out, left-in-right-out). The iframe's src is bound reactively to the open State (blank when closed) so the video genuinely stops loading on close rather than just being visually hidden. No bundled default thumbnail asset exists in this package, so the zero-arg demo falls back to a themed placeholder panel instead of a real screenshot image — real usage should pass thumbnailSrc. videoSrc defaults to "about:blank" (no specific third-party video is bundled/referenced); callers supply their own embeddable URL. Light/dark thumbnail variants noted in the spec's researchNote were treated as cosmetic/optional per the spec's own guidance and were not implemented as a separate prop.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/hero-video-dialog)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/core/heroVideoDialog.ts [heroVideoDialog]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
