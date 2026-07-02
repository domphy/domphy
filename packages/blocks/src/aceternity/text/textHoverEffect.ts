// Aceternity UI "Text Hover Effect" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied).
// Very large outlined heading text that fills in with a vivid multi-color
// gradient only in the area the cursor is hovering over, like a colorful
// spotlight revealing paint beneath a stencil.
//
// Two stacked SVG `<text>` copies at the same position: a permanently
// visible thin outline-only copy (`fill="none"`, subtle `stroke`), and a
// gradient-filled copy that is only visible through an SVG `<mask>` whose
// visible region is a soft-edged (`feGaussianBlur`'d) circle tracking the
// pointer. Pointer position is written straight to the mask circle's
// `cx`/`cy` attributes on every `pointermove` — an imperative DOM write, not
// reactive state, matching the zero-lag tradeoff this package's own
// `svgMaskEffect.ts`/`magicCard.ts` make for their own cursor-following
// reveals — with the position/opacity change eased by a plain CSS
// `transition` on the circle sized by the `duration` prop (`0` = snap
// instantly to the pointer, per the documented default).
//
// The SVG is `viewBox`-sized to a fixed internal coordinate space and scaled
// responsively via `width: 100%; height: auto`, so the rendered aspect ratio
// always matches the viewBox exactly — no letterboxing, which keeps the
// pointer's client-to-viewBox coordinate mapping a simple uniform scale. The
// text's own `fontSize` (an SVG attribute, not a CSS `style` prop — the only
// heading-scale mechanism available on `<text>`, which has no HTML heading
// tag to route through `heading()`) is sized proportionally to the string
// length so the glyphs read as "spans most of the container's width"
// regardless of what `text` is passed, without any DOM measurement pass —
// this also makes the resting (non-hovered) render fully SSR-safe, since
// only the pointer-follow behavior needs `_onMount`.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { type ThemeColor, themeColor } from "@domphy/theme";

export interface TextHoverEffectProps {
  /** The string rendered as the big outlined heading. Defaults to `"Domphy"`. */
  text?: string;
  /** Seconds controlling how much the reveal's position/opacity transition is
   * eased — `0` snaps instantly to the pointer, larger values add a smooth
   * lag/fade. Defaults to `0`. */
  duration?: number;
  /** Gradient color stops, warm-to-cool, used to fill the pointer-revealed text. Defaults to `["danger", "warning", "info", "secondary"]`. */
  colors?: ThemeColor[];
  /** Theme color family for the resting outline stroke. Defaults to `"neutral"`. */
  strokeColor?: ThemeColor;
  /** Extra class name merged onto the outer container's native `class` attribute. */
  className?: string;
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

let textHoverEffectInstanceCounter = 0;

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 300;
// Approximate average glyph-width-to-fontSize ratio for a bold, mostly-
// uppercase display face — used to size the text to fill most of the
// viewBox width without a DOM measurement pass (see file header comment).
const AVERAGE_GLYPH_WIDTH_RATIO = 0.58;
const MIN_FONT_SIZE = 40;
const MAX_FONT_SIZE = 260;
const REVEAL_RADIUS = VIEWBOX_HEIGHT * 0.55;
const REVEAL_BLUR_STD_DEVIATION = VIEWBOX_HEIGHT * 0.05;

const DEFAULT_COLORS: ThemeColor[] = ["danger", "warning", "info", "secondary"];

/** `<stop>` is a paint-server node, not text — it has no visible `color` to
 * follow the tone context, so the `missing-color` doctor rule is a false
 * positive here (mirrors backgroundBeams.ts's own bandStop() suppression). */
function gradientStop(offset: string, color: ThemeColor): DomphyElement {
  return {
    stop: null,
    offset,
    style: { stopColor: (listener) => themeColor(listener, "shift-9", color) } as StyleObject,
    _doctorDisable: "missing-color",
  } as DomphyElement;
}

/**
 * Very large outlined heading text that fills in with a vivid multi-color
 * gradient only in the area the cursor hovers over — a colorful spotlight
 * revealing paint beneath a stencil. Purely pointer-driven; resting state is
 * outline-only. Call with no arguments for a working demo.
 */
function textHoverEffect(props: TextHoverEffectProps = {}): DomphyElement<"div"> {
  const text = props.text ?? "Domphy";
  const durationSeconds = Math.max(0, props.duration ?? 0);
  const colors = props.colors && props.colors.length > 0 ? props.colors : DEFAULT_COLORS;
  const strokeColor = props.strokeColor ?? "neutral";

  const instanceId = ++textHoverEffectInstanceCounter;
  const gradientId = `domphy-text-hover-effect-gradient-${instanceId}`;
  const maskId = `domphy-text-hover-effect-mask-${instanceId}`;
  const blurFilterId = `domphy-text-hover-effect-blur-${instanceId}`;

  const characterCount = Math.max(1, Array.from(text).length);
  const fontSize = Math.min(
    MAX_FONT_SIZE,
    Math.max(MIN_FONT_SIZE, (VIEWBOX_WIDTH * 0.92) / (characterCount * AVERAGE_GLYPH_WIDTH_RATIO)),
  );

  const gradientStops = colors.map((color, index) =>
    gradientStop(`${Math.round((index / Math.max(1, colors.length - 1)) * 100)}%`, color),
  );

  const revealTransition = durationSeconds > 0 ? `cx ${durationSeconds}s ease-out, cy ${durationSeconds}s ease-out, opacity ${durationSeconds}s ease-out` : "none";

  // Captured on the circle's OWN mount rather than queried from the outer
  // container's `_onMount` — a parent's `_onMount` fires before its own
  // subtree is done attaching, so a `querySelector` for a deeply-nested
  // descendant run there would miss it. Event listeners below only read this
  // ref at event time (after the whole tree has settled), so it's safe
  // regardless of mount order — same idiom this package's own
  // `backgroundBeams.ts` (gradient ref) and `kineticText.ts` (character
  // refs) already use.
  let circleRef: SVGCircleElement | null = null;

  const revealCircle: DomphyElement = {
    circle: null,
    cx: VIEWBOX_WIDTH / 2,
    cy: VIEWBOX_HEIGHT / 2,
    r: REVEAL_RADIUS,
    fill: "white",
    // Decorative mask-only shape — no visible color of its own (its fill is
    // pure luminance data for the mask, not paint), same reasoning as
    // gradientStop()'s own suppression above.
    _doctorDisable: "missing-color",
    style: { opacity: 0, filter: `url(#${blurFilterId})`, transition: revealTransition } as StyleObject,
    _onMount: (node: ElementNode) => {
      circleRef = node.domElement as unknown as SVGCircleElement;
    },
    _onRemove: () => {
      circleRef = null;
    },
  } as DomphyElement;

  const outlineText: DomphyElement = {
    text,
    x: "50%",
    y: "50%",
    textAnchor: "middle",
    dominantBaseline: "middle",
    fontSize,
    fill: "none",
    stroke: (listener: Listener) => themeColor(listener, "shift-6", strokeColor),
    strokeWidth: Math.max(1, fontSize * 0.012),
    style: { fontWeight: () => "800" } as StyleObject,
  } as DomphyElement;

  const gradientText: DomphyElement = {
    text,
    x: "50%",
    y: "50%",
    textAnchor: "middle",
    dominantBaseline: "middle",
    fontSize,
    fill: `url(#${gradientId})`,
    mask: `url(#${maskId})`,
    style: { fontWeight: () => "800" } as StyleObject,
  } as DomphyElement;

  const svgElement: DomphyElement<"svg"> = {
    svg: [
      {
        defs: [
          { linearGradient: gradientStops, id: gradientId, x1: "0%", y1: "0%", x2: "100%", y2: "0%" } as DomphyElement,
          { filter: [{ feGaussianBlur: null, stdDeviation: String(REVEAL_BLUR_STD_DEVIATION) } as DomphyElement], id: blurFilterId } as DomphyElement,
          { mask: [revealCircle], id: maskId } as DomphyElement,
        ],
      } as DomphyElement,
      outlineText,
      gradientText,
    ],
    viewBox: `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`,
    ariaHidden: "true",
    style: { width: "100%", height: "auto", display: "block" } as StyleObject,
  } as DomphyElement<"svg">;

  return {
    div: [svgElement],
    class: props.className,
    role: "img",
    ariaLabel: text,
    style: {
      position: "relative",
      width: "100%",
      cursor: "default",
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const containerElement = node.domElement as HTMLElement;

      const setRevealPosition = (clientX: number, clientY: number) => {
        if (!circleRef) return;
        const rect = containerElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const scale = VIEWBOX_WIDTH / rect.width;
        const localX = (clientX - rect.left) * scale;
        const localY = (clientY - rect.top) * scale;
        circleRef.setAttribute("cx", localX.toFixed(1));
        circleRef.setAttribute("cy", localY.toFixed(1));
      };

      const handlePointerMove = (event: PointerEvent) => {
        setRevealPosition(event.clientX, event.clientY);
        if (circleRef) circleRef.style.opacity = "1";
      };
      const handlePointerLeave = () => {
        if (circleRef) circleRef.style.opacity = "0";
      };

      containerElement.addEventListener("pointermove", handlePointerMove);
      containerElement.addEventListener("pointerleave", handlePointerLeave);

      node.addHook("Remove", () => {
        containerElement.removeEventListener("pointermove", handlePointerMove);
        containerElement.removeEventListener("pointerleave", handlePointerLeave);
      });
    },
  };
}

export { textHoverEffect };
