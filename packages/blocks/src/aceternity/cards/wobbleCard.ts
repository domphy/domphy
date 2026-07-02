// Aceternity UI "Wobble Card" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A large
// feature tile whose content layer translates a few pixels toward the
// pointer (plus a very slight scale bump) as the cursor moves across the
// card, reading as a soft parallax "wobble" rather than a full drag.
//
// Position tracking is a plain `mousemove` listener writing straight to the
// content layer's inline `transform` — the same "no animation curve needed,
// the browser repaints every pointer-move" tradeoff magicCard.ts makes for
// its cursor-following glow — with a short CSS transition covering the
// mouseleave ease-back-to-rest.
//
// The grain overlay is a tiled `feTurbulence` SVG encoded as a CSS
// `background-image` data URI (a well-known, generic CSS technique — not
// sourced from any of the disallowed references) rather than a real SVG
// filter chain in the element tree: Domphy's `SvgTags` allowlist doesn't
// namespace `feTurbulence`/`feColorMatrix` yet (see noiseTexture.ts's fidelity
// note for the full explanation), but a data-URI background image is just an
// opaque image resource to the browser and sidesteps that gap entirely.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface WobbleCardProps {
  /** Card body — heading, description, optional image. Defaults to a generic demo blurb. */
  children?: DomphyElement[];
  /** Theme color family for the card's background/text ramp. Defaults to `"primary"`. */
  color?: ThemeColor;
  /** Renders the decorative grain overlay. Defaults to `true`. */
  noise?: boolean;
  /** Passthrough style merged onto the outer card container. */
  style?: StyleObject;
  /** Passthrough style merged onto the inner content wrapper that receives the wobble transform. */
  contentStyle?: StyleObject;
}

// Damping keeps the translate to a few percent of the raw pointer offset —
// subtle parallax, not a drag. Capped so a huge card never produces a huge shift.
const POINTER_DAMPING = 0.06;
const MAX_TRANSLATE_PX = 18;
const HOVER_SCALE = 1.03;

const GRAIN_TEXTURE_MARKUP =
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">' +
  '<filter id="wobble-grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>' +
  '<feColorMatrix type="saturate" values="0"/></filter>' +
  '<rect width="100%" height="100%" filter="url(#wobble-grain)"/></svg>';
const GRAIN_TEXTURE_DATA_URI = `data:image/svg+xml,${encodeURIComponent(GRAIN_TEXTURE_MARKUP)}`;

function defaultChildren(): DomphyElement[] {
  return [
    { h3: "Ship products people love", $: [heading({ color: "neutral" })] } as DomphyElement,
    {
      p: "A bento tile that leans gently toward your cursor — a small, tactile detail that makes the surface feel alive.",
      $: [paragraph({ color: "neutral" })],
    } as DomphyElement,
  ];
}

/** Decorative tiled grain layer — purely visual, no text of its own. */
function grainOverlay(): DomphyElement<"div"> {
  const element = {
    div: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      backgroundImage: `url("${GRAIN_TEXTURE_DATA_URI}")`,
      backgroundRepeat: "repeat",
      backgroundSize: "128px 128px",
      mixBlendMode: "overlay",
      opacity: 0.25,
    },
  };
  return element as DomphyElement<"div">;
}

/**
 * A large feature tile whose content subtly translates and scales toward the
 * cursor as it moves across the card. Call with no arguments for a working
 * demo — a colored tile with a generic heading/description.
 */
function wobbleCard(props: WobbleCardProps = {}): DomphyElement<"div"> {
  const color = props.color ?? "primary";
  const noise = props.noise ?? true;
  const children = props.children ?? defaultChildren();

  let contentElement: HTMLElement | null = null;

  const contentWrapper: DomphyElement<"div"> = {
    div: children,
    _onMount: (node: ElementNode) => {
      contentElement = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      contentElement = null;
    },
    style: {
      position: "relative",
      zIndex: 1,
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(2),
      maxWidth: themeSpacing(90),
      transition: "transform 250ms cubic-bezier(0.22, 1, 0.36, 1)",
      transform: "translate(0, 0) scale(1)",
      willChange: "transform",
      ...(props.contentStyle ?? {}),
    } as StyleObject,
  };

  return {
    div: [contentWrapper, ...(noise ? [grainOverlay()] : [])],
    dataTone: "shift-16",
    onMouseMove: (event: MouseEvent, node: ElementNode) => {
      if (!contentElement) return;
      const rect = (node.domElement as HTMLElement).getBoundingClientRect();
      const offsetX = event.clientX - (rect.left + rect.width / 2);
      const offsetY = event.clientY - (rect.top + rect.height / 2);
      const translateX = Math.max(-MAX_TRANSLATE_PX, Math.min(MAX_TRANSLATE_PX, offsetX * POINTER_DAMPING));
      const translateY = Math.max(-MAX_TRANSLATE_PX, Math.min(MAX_TRANSLATE_PX, offsetY * POINTER_DAMPING));
      contentElement.style.transform = `translate(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px) scale(${HOVER_SCALE})`;
    },
    onMouseLeave: () => {
      if (contentElement) contentElement.style.transform = "translate(0, 0) scale(1)";
    },
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(5),
      padding: themeSpacing(8),
      minHeight: themeSpacing(48),
      backgroundColor: (listener) => themeColor(listener, "inherit", color),
      color: (listener) => themeColor(listener, "shift-9", color),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { wobbleCard };
