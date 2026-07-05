---
title: "@domphy/blocks — linkPreview"
description: "Hover/focus-triggered floating card with opacity+scale+translateY enter/exit (~150ms)."
---

# linkPreview

<script setup lang="ts">
import LinkPreviewDemo from "../demos/blocks/linkPreview.ts?raw"
</script>

A **Overlays** block/component from **[Aceternity UI](/docs/blocks/aceternity)** — clean-room reimplemented for Domphy (see [methodology](/docs/blocks/methodology)). Call `linkPreview()` with no arguments for a working demo, or edit the code below live.

<CodeEditor :code="LinkPreviewDemo" />

## Props

| Prop | Type | Description |
|---|---|---|
| `url` | `string` | Destination URL for the wrapped link. Defaults to a generic demo URL. |
| `children` | `DomphyElement \| DomphyElement[] \| string` | Visible link label content. Defaults to the bare `url`. |
| `width` | `number` | Preview card width, in px. Defaults to `200`. |
| `height` | `number` | Preview card height, in px. Defaults to `125`. |
| `isStatic` | `boolean` | When `true`, uses `imageSrc` directly with no async resolution. Defaults to `false`. |
| `imageSrc` | `string` | Static preview image override — required when `isStatic` is `true`, optional fallback otherwise. |
| `imageResolver` | `(destinationUrl: string) =&gt; string \| Promise&lt;string&gt;` | Async or sync resolver producing a preview image URL for `url`. Called once, lazily, on first hover/focus. Ignored when `isStatic` is `true`. |
| `style` | `StyleObject` | Passthrough style merged onto the outer trigger wrapper. |

::: details Implementation notes
Hover/focus-triggered floating card with opacity+scale+translateY enter/exit (~150ms). No hard dependency on a screenshot API: accepts imageSrc (static), an async/sync imageResolver(url), or falls back to a generic placeholder. Uses simple 'centered above trigger' absolute positioning instead of @domphy/ui's popover()/@domphy/floating, since popover's permanently-mounted visibility-toggle content can't be CSS-transitioned (would swallow the fade) and @domphy/floating isn't a package dependency of @domphy/blocks — no viewport-edge auto-flip, appropriate for a small short-lived card per the spec.

Status: **ported** · Reference: [Aceternity UI original](https://ui.aceternity.com/components/link-preview)
:::

::: code-group
<<< ../../../../packages/blocks/src/aceternity/overlays/linkPreview.ts [linkPreview]
:::

[← Back to Aceternity UI catalog](/docs/blocks/aceternity)
