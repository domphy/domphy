---
title: "@domphy/blocks — containerTextFlip"
description: "Full structure/behavior match: bordered dataTone chip badge that width-tweens (canvas measureText -> reactive MotionKeyframe -> motion() patch) to hug each new..."
---

# containerTextFlip

<script setup lang="ts">
import ContainerTextFlipDemo from "../demos/blocks/containerTextFlip.ts?raw"
</script>

A **Text** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `containerTextFlip()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="ContainerTextFlipDemo" />

::: details Implementation notes
Full structure/behavior match: bordered dataTone chip badge that width-tweens (canvas measureText -&gt; reactive MotionKeyframe -&gt; motion() patch) to hug each new word, with per-character enter/exit staggered via individual motion() instances (transition.delay = index * stagger). Old/new words are kept perfectly overlapping via a wholesale-replaced single-entry reactive list of absolutely-positioned word layers (same technique as the sibling layoutTextFlip.ts), each containing its own set of keyed per-character spans so the reveal genuinely ripples per-glyph rather than crossfading as one block. Exact badge border/shadow/background tokens are this implementation's own reasonable design choice (edge-anchored dataTone chip) since upstream's rendered demo styling wasn't inspectable, per the task's own researchNote — moderate confidence on precise visual tokens, high confidence on structure/behavior. The surrounding demo sentence ('Ship your product [word].') is a fixed literal, not a prop, matching the spec's own prop list (words/interval/animationDuration/className/textClassName/startIndex only).

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/container-text-flip)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/text/containerTextFlip.ts [containerTextFlip]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
