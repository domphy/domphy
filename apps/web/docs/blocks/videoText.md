---
title: "@domphy/blocks — videoText"
description: "Full SVG-mask-on-video technique implemented: a hidden <svg><mask> holds one <text> glyph (fill:white via a raw SVG attribute, not `style`, matching this..."
---

# videoText

<script setup lang="ts">
import VideoTextDemo from "../demos/blocks/videoText.ts?raw"
</script>

A **Text** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `videoText()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="VideoTextDemo" />

::: details Implementation notes
Full SVG-mask-on-video technique implemented: a hidden &lt;svg&gt;&lt;mask&gt; holds one &lt;text&gt; glyph (fill:white via a raw SVG attribute, not `style`, matching this package's existing chart-label convention), and the &lt;video&gt; (or fallback) is masked via CSS `mask-image: url(#id)` (+ -webkit- prefix) with maskContentUnits=userSpaceOnUse so glyph centering is responsive with zero JS measurement. `_onMount` calls `.play()` with a catch-and-fail-open guard for autoplay-restriction browsers, and imperatively sets the `.muted` IDL property (not just the content attribute) since some browsers only honor the live property for autoplay. An optional IntersectionObserver pauses/resumes the video when scrolled offscreen (fails open when IntersectionObserver is unavailable). Two honest gaps: (1) no video asset ships with this package, so the zero-argument demo substitutes a looping animated theme-gradient panel behind the same mask rather than a real video — passing `videoSrc` activates the real masked &lt;video&gt; path (same tradeoff `heroVideoDialog` already takes with its 'about:blank' default in this package); (2) CSS `mask-image` referencing an SVG mask fragment on a plain HTML element (not an SVG element) has solid but not universal cross-browser support (full in Chromium/Firefox, prefixed support in modern Safari) — older WebKit may not render the mask.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/video-text)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/text/videoText.ts [videoText]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
