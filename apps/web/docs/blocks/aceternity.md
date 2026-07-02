---
title: "@domphy/blocks — Aceternity UI"
description: "Aceternity UI-sourced eye-catching effect components, clean-room reimplemented for Domphy, deduplicated against Magic UI."
---

# Aceternity UI components

79 components clean-room reimplemented from Aceternity UI's public component catalog, after deduplicating against Magic UI (components that were the same or a near-duplicate effect were skipped — only genuinely distinct or meaningfully-variant effects were ported). See [Methodology](/docs/blocks/methodology) for why this source in particular relies entirely on clean-room reimplementation rather than a license grant.

```ts
import { spotlight, card3D, hoverBorderGradient } from "@domphy/blocks"
```

### Button / Icon / Motion

| Export | Status | Reference |
|---|---|---|
| `pathMorph` | ported | [source](https://ui.aceternity.com/labs/svg-path-morphing) |

### Card / Interaction / Motion

| Export | Status | Reference |
|---|---|---|
| `fanCards` | ported | [source](https://ui.aceternity.com/labs/fey-cards) |
| `layoutMotionCards` | ported | [source](https://ui.aceternity.com/labs/interface-crafts-cards) |

### Hero / Marketing / Motion

| Export | Status | Reference |
|---|---|---|
| `flowingTextMarquee` | ported | [source](https://ui.aceternity.com/labs/wispr-flow-text-animation) |

### Hero / Poster / Motion

| Export | Status | Reference |
|---|---|---|
| `posterReveal` | ported | [source](https://ui.aceternity.com/labs/gta-vi-poster) |

### backgrounds

| Export | Status | Reference |
|---|---|---|
| `auroraBackground` | ported | [source](https://ui.aceternity.com/components/aurora-background) |
| `backgroundBeams` | partial | [source](https://ui.aceternity.com/components/background-beams) |
| `backgroundBeamsWithCollision` | ported | [source](https://ui.aceternity.com/components/background-beams-with-collision) |
| `backgroundGradient` | ported | [source](https://ui.aceternity.com/components/background-gradient) |
| `backgroundLines` | ported | [source](https://ui.aceternity.com/components/background-lines) |
| `backgroundRippleEffect` | ported | [source](https://ui.aceternity.com/components/background-ripple-effect) |
| `canvasRevealEffect` | partial | [source](https://ui.aceternity.com/components/canvas-reveal-effect) |
| `dottedGlowBackground` | ported | [source](https://ui.aceternity.com/components/dotted-glow-background) |
| `glowingEffect` | partial | [source](https://ui.aceternity.com/components/glowing-effect) |
| `glowingStars` | ported | [source](https://ui.aceternity.com/components/glowing-stars-effect) |
| `googleGeminiEffect` | ported | [source](https://ui.aceternity.com/components/google-gemini-effect) |
| `gradientAnimation` | ported | [source](https://ui.aceternity.com/components/background-gradient-animation) |
| `imagesBadge` | ported | [source](https://ui.aceternity.com/components/images-badge) |
| `lampEffect` | ported | [source](https://ui.aceternity.com/components/lamp-effect) |
| `parallaxHeroImages` | ported | [source](https://ui.aceternity.com/components/parallax-hero-images) |
| `scales` | ported | [source](https://ui.aceternity.com/components/scales) |
| `shootingStars` | ported | [source](https://ui.aceternity.com/components/shooting-stars-and-stars-background) |
| `spotlight` | ported | [source](https://ui.aceternity.com/components/spotlight) |
| `spotlightDual` | ported | [source](https://ui.aceternity.com/components/spotlight-new) |
| `svgMaskEffect` | ported | [source](https://ui.aceternity.com/components/svg-mask-effect) |
| `tracingBeam` | ported | [source](https://ui.aceternity.com/components/tracing-beam) |
| `vortex` | ported | [source](https://ui.aceternity.com/components/vortex) |
| `wavyBackground` | ported | [source](https://ui.aceternity.com/components/wavy-background) |
| `webcamPixelGrid` | partial | [source](https://ui.aceternity.com/components/webcam-pixel-grid) |

### buttons

| Export | Status | Reference |
|---|---|---|
| `hoverBorderGradient` | ported | [source](https://ui.aceternity.com/components/hover-border-gradient) |
| `magneticButton` | ported | [source](https://ui.aceternity.com/components/magnetic-button) |
| `statefulButton` | ported | [source](https://ui.aceternity.com/components/stateful-button) |

### cards

| Export | Status | Reference |
|---|---|---|
| `asciiArt` | ported | [source](https://ui.aceternity.com/components/ascii-art) |
| `card3D` | ported | [source](https://ui.aceternity.com/components/3d-card-effect) |
| `cardHoverEffect` | ported | [source](https://ui.aceternity.com/components/card-hover-effect) |
| `cardStack` | ported | [source](https://ui.aceternity.com/components/card-stack) |
| `directionAwareHover` | ported | [source](https://ui.aceternity.com/components/direction-aware-hover) |
| `draggableCard` | ported | [source](https://ui.aceternity.com/components/draggable-card) |
| `evervaultCard` | ported | [source](https://ui.aceternity.com/components/evervault-card) |
| `expandableCard` | partial | [source](https://ui.aceternity.com/components/expandable-card) |
| `focusCards` | ported | [source](https://ui.aceternity.com/components/focus-cards) |
| `keyboard` | ported | [source](https://ui.aceternity.com/components/keyboard) |
| `pixelatedCanvas` | ported | [source](https://ui.aceternity.com/components/pixelated-canvas) |
| `wobbleCard` | ported | [source](https://ui.aceternity.com/components/wobble-card) |

### effects-3d

| Export | Status | Reference |
|---|---|---|
| `globe3D` | partial | [source](https://ui.aceternity.com/components/3d-globe) |
| `marquee3D` | ported | [source](https://ui.aceternity.com/components/3d-marquee) |
| `pin3D` | ported | [source](https://ui.aceternity.com/components/3d-pin) |
| `pointerHighlight` | ported | [source](https://ui.aceternity.com/components/pointer-highlight) |

### inputs

| Export | Status | Reference |
|---|---|---|
| `fileUpload` | ported | [source](https://ui.aceternity.com/components/file-upload) |
| `gooeyInput` | ported | [source](https://ui.aceternity.com/components/gooey-input) |
| `vanishInput` | ported | [source](https://ui.aceternity.com/components/placeholders-and-vanish-input) |

### layout

| Export | Status | Reference |
|---|---|---|
| `codeBlock` | ported | [source](https://ui.aceternity.com/components/code-block) |
| `compareSlider` | ported | [source](https://ui.aceternity.com/components/compare) |
| `containerCover` | ported | [source](https://ui.aceternity.com/components/container-cover) |

### loaders

| Export | Status | Reference |
|---|---|---|
| `loaderSet` | ported | [source](https://ui.aceternity.com/components/loader) |
| `multiStepLoader` | ported | [source](https://ui.aceternity.com/components/multi-step-loader) |

### navigation

| Export | Status | Reference |
|---|---|---|
| `floatingNavbar` | ported | [source](https://ui.aceternity.com/components/floating-navbar) |
| `hoverSidebar` | ported | [source](https://ui.aceternity.com/components/sidebar) |
| `notch` | ported | [source](https://ui.aceternity.com/components/notch) |
| `resizableNavbar` | ported | [source](https://ui.aceternity.com/components/resizable-navbar) |
| `stickyBanner` | ported | [source](https://ui.aceternity.com/components/sticky-banner) |

### overlays

| Export | Status | Reference |
|---|---|---|
| `animatedTestimonials` | ported | [source](https://ui.aceternity.com/components/animated-testimonials) |
| `carousel` | ported | [source](https://ui.aceternity.com/components/carousel) |
| `ditherShader` | ported | [source](https://ui.aceternity.com/components/dither-shader) |
| `imageSlider` | ported | [source](https://ui.aceternity.com/components/images-slider) |
| `linkPreview` | ported | [source](https://ui.aceternity.com/components/link-preview) |

### scroll

| Export | Status | Reference |
|---|---|---|
| `containerScrollAnimation` | ported | [source](https://ui.aceternity.com/components/container-scroll-animation) |
| `heroParallax` | ported | [source](https://ui.aceternity.com/components/hero-parallax) |
| `macbookScroll` | partial | [source](https://ui.aceternity.com/components/macbook-scroll) |
| `parallaxScroll` | ported | [source](https://ui.aceternity.com/components/parallax-scroll) |
| `stickyScrollReveal` | ported | [source](https://ui.aceternity.com/components/sticky-scroll-reveal) |

### text

| Export | Status | Reference |
|---|---|---|
| `canvasText` | ported | [source](https://ui.aceternity.com/components/canvas-text) |
| `containerTextFlip` | ported | [source](https://ui.aceternity.com/components/container-text-flip) |
| `heroHighlight` | ported | [source](https://ui.aceternity.com/components/hero-highlight) |
| `layoutTextFlip` | ported | [source](https://ui.aceternity.com/components/layout-text-flip) |
| `squigglyText` | ported | [source](https://ui.aceternity.com/components/squiggly-text) |
| `textFlippingBoard` | ported | [source](https://ui.aceternity.com/components/text-flipping-board) |
| `textHoverEffect` | ported | [source](https://ui.aceternity.com/components/text-hover-effect) |
| `textRevealCard` | ported | [source](https://ui.aceternity.com/components/text-reveal-card) |

