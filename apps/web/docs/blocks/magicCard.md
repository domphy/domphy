---
title: "@domphy/blocks — magicCard"
description: "Both documented visual modes are implemented and selectable via a `variant: 'border' | 'orb'` prop (the spec explicitly left this decision to the implementer)."
---

# magicCard

<script setup lang="ts">
import MagicCardDemo from "../demos/blocks/magicCard.ts?raw"
</script>

A **Effects** block/component from **[Magic UI](/docs/blocks/magicui)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `magicCard()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="MagicCardDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `variant` | `"border" \| "orb"` | `"border"` traces a spotlight along the card edge; `"orb"` is a softer diffuse glow behind the content. Defaults to `"border"`. |
| `spotlightSize` | `number` | Spotlight diameter in pixels, `"border"` mode only. Defaults to `200`. |
| `orbSize` | `number` | Orb diameter in pixels, `"orb"` mode only. Defaults to `420`. |
| `orbBlur` | `number` | Orb blur radius in pixels, `"orb"` mode only. Defaults to `60`. |
| `orbOpacity` | `number` | Orb opacity while hovered, `"orb"` mode only. Defaults to `0.9`. |
| `glowColor` | `ThemeColor` | Glow color. Defaults to `"primary"`. |
| `borderRadius` | `number` | Corner radius in pixels. Defaults to `16`. |
| `children` | `DomphyElement[]` | Card content rendered inside the card. Defaults to a small demo card body. |

::: details Implementation notes
Both documented visual modes are implemented and selectable via a `variant: 'border' | 'orb'` prop (the spec explicitly left this decision to the implementer). 'border' mode uses the standard two-layer mask-composite:'exclude' ring technique (padding-box vs border-box XOR, matching csstype's mask/maskComposite/WebkitMaskComposite properties) with a radial-gradient positioned by CSS custom properties. 'orb' mode is a large blurred circular div whose position tracks the same custom properties. Cursor tracking is a plain mousemove listener on the root element writing --magic-card-x/-y directly via style.setProperty (imperative DOM writes outside Domphy's reactive graph, per the framework's own documented pattern for continuous high-frequency updates — see core/refs.md's ResizeObserver/IntersectionObserver examples), plus a CSS opacity transition for the fade in/out. The orb's fixed-tone (non-'inherit') backgroundColor intentionally carries _doctorDisable:'tone-background-inherit' with an inline comment, because it is a solid decorative accent blob with no children (not a themed content surface) — the exact same pattern @domphy/ui's own fab() patch uses for its button fill (verified by running that patch's style directly through doctor's diagnose(), which flags the identical warning, confirming this is a known accepted exception rather than a bug). Doctor-clean end to end.

Status: **ported** · Reference: [Magic UI original](https://magicui.design/docs/components/magic-card)
:::

::: code-group
<<< ../../../../packages/blocks/src/magicui/effects/magicCard.ts [magicCard]
:::

[← Back to Magic UI catalog](/docs/blocks/magicui)
