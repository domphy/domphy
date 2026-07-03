---
title: "@domphy/blocks — avatarCircles"
description: "Full static overlapping-stack visual and behavior: fixed diameter, ring/border that matches the ambient (page) tone via themeColor(l,'inherit',ringColor)..."
---

# avatarCircles

<script setup lang="ts">
import AvatarCirclesDemo from "../demos/blocks/avatarCircles.ts?raw"
</script>

A **Core** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `avatarCircles()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="AvatarCirclesDemo" />

::: details Implementation notes
Full static overlapping-stack visual and behavior: fixed diameter, ring/border that matches the ambient (page) tone via themeColor(l,'inherit',ringColor) rather than a literal color, negative-margin overlap expressed via themeSpacing(-n) (a real theme token, not a raw px literal), profile links opening in a new tab, and a passive '+N' badge (omitted entirely when overflowCount is 0). Default avatars use a single reusable generic inline-SVG silhouette placeholder instead of hotlinking any real person's photo (upstream's demo uses real GitHub avatars, which this clean-room build intentionally does not fabricate/hotlink) — real usage supplies actual imageUrls via props.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/avatar-circles)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/core/avatarCircles.ts [avatarCircles]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
