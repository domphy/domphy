// Aceternity UI "Hover Border Gradient" — clean-room reimplementation.
//
// A polymorphic pill container whose rim is traced by a soft glow that
// continuously travels around the perimeter in a loop, and reads as more
// prominent on hover. Implemented purely from the block's public
// functional/visual spec — no upstream Aceternity source was viewed or
// copied.
//
// Technique: the outer wrapper has NO padding of its own; a blurred glow
// layer sits absolutely behind everything, sized to fill the wrapper exactly
// (`inset: 0`), painted with a `radial-gradient` whose center is driven by two
// CSS custom properties (`--hbg-x`/`--hbg-y`, the same "write to a custom
// property every frame" technique `magicCard.ts` uses for its own pointer-
// tracked glow). A `requestAnimationFrame` loop started in `_onMount` steps
// those custom properties continuously through the wrapper's four corner
// anchor points at a constant linear speed — never a CSS `@keyframes` spin,
// matching the spec's own "not a conic-gradient spin" note. The solid content
// layer sits in normal flow with its own small margin, which is what carries
// it inset from the glow layer's edges: since the outer wrapper has
// `overflow: hidden` and sizes itself to the content layer's margin box, only
// a thin margin-wide ring of the glow layer ever peeks out — reading as a
// highlight traveling around the border. Hover only nudges a CSS filter
// (`brightness`/`opacity`) on the two layers via nested `&:hover` selectors —
// no JS re-tracking on hover, the loop keeps running identically underneath.
//
// The spec exposes no color-customization prop upstream; this clean-room
// version adds an optional `color` (defaults to `"neutral"`, matching the
// reference's plain white-to-transparent glow) as a reasonable enhancement.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { type ThemeColor, themeColor, themeDensity, themeSize, themeSpacing } from "@domphy/theme";

export type HoverBorderGradientTag = "button" | "div" | "a";

export interface HoverBorderGradientProps {
  /** Content rendered inside the solid content layer. Defaults to a demo "Aceternity UI" label with a chevron icon. */
  children?: DomphyElement | DomphyElement[] | string;
  /** Style hook for the outer (glow-carrying) layer. */
  containerClassName?: string;
  /** Style hook for the inner content layer. */
  className?: string;
  /** Tag to render the outer wrapper as. Defaults to `"button"`. */
  as?: HoverBorderGradientTag;
  /** `href`, used only when `as: "a"`. */
  href?: string;
  /** Seconds per full loop around the perimeter. Defaults to `1`. */
  duration?: number;
  /** Loop direction. Defaults to `true` (clockwise). */
  clockwise?: boolean;
  /** Theme color family the glow and content fill are drawn from. Defaults to `"neutral"`. */
  color?: ThemeColor;
  onClick?: (event: MouseEvent) => void;
  disabled?: boolean;
  style?: StyleObject;
}

function asContent(value: DomphyElement | DomphyElement[] | string): (string | DomphyElement)[] {
  return Array.isArray(value) ? value : [value];
}

/** Small right-pointing chevron, matching `interactiveHoverButton.ts`'s inline-SVG icon pattern. Inherits its color from the content layer's own `currentColor`. */
function chevronGlyph(): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [{ polyline: null, points: "9 18 15 12 9 6" }],
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    ariaHidden: "true",
    style: { display: "inline-flex", flexShrink: "0", width: themeSpacing(4), height: themeSpacing(4) },
  };
}

// Four corner anchor points (percent of the wrapper's own box) the glow
// travels between, in clockwise screen order (down the right edge, across
// the bottom, up the left edge, back across the top).
const ANCHOR_POINTS: [number, number][] = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
];

/**
 * A polymorphic pill container (button/div/anchor) whose rim is traced by a
 * soft glow continuously traveling around the perimeter — an ambient loop
 * that runs from mount regardless of hover, with hover only nudging the
 * glow/content brightness. Call with no arguments for a working demo button.
 */
function hoverBorderGradient(props: HoverBorderGradientProps = {}): DomphyElement {
  const content = props.children ?? "Aceternity UI";
  const tag = props.as ?? "button";
  const duration = Math.max(0.1, props.duration ?? 1);
  const clockwise = props.clockwise ?? true;
  const color = props.color ?? "neutral";

  const orderedAnchors = clockwise ? ANCHOR_POINTS : [...ANCHOR_POINTS].reverse();

  // Decorative blurred glow, driven purely by `_onMount`-owned CSS custom
  // properties — no `color` prop needed (`_doctorDisable` isn't part of
  // core's strict `PartialElement` type — build through an untyped literal,
  // then assert, mirroring `overlayCanvas` in confetti.ts).
  const glowLayer = {
    span: null,
    ariaHidden: "true",
    dataSlot: "hbg-glow",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      borderRadius: "inherit",
      pointerEvents: "none",
      filter: "blur(2px)",
      opacity: 0.7,
      transition: "opacity 200ms ease, filter 200ms ease",
      backgroundImage: (listener: Listener) =>
        `radial-gradient(60% 60% at var(--hbg-x, 0%) var(--hbg-y, 0%), ${themeColor(listener, "shift-1", color)}, transparent 70%)`,
    } as StyleObject,
  } as DomphyElement<"span">;

  const contentLayer: DomphyElement<"span"> = {
    span: [
      chevronGlyph(),
      { span: asContent(content), style: { position: "relative" } },
    ],
    dataSlot: "hbg-content",
    dataTone: "shift-15",
    class: props.className,
    style: {
      position: "relative",
      zIndex: 1,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      margin: themeSpacing(0.5),
      fontSize: (listener: Listener) => themeSize(listener, "inherit"),
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
      borderRadius: "999px",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", color),
      color: (listener: Listener) => themeColor(listener, "shift-9", color),
      transition: "filter 200ms ease",
    } as StyleObject,
  };

  const sharedStyle: StyleObject = {
    position: "relative",
    display: "inline-flex",
    overflow: "hidden",
    borderRadius: "999px",
    appearance: "none",
    border: "none",
    padding: 0,
    cursor: props.disabled ? "not-allowed" : "pointer",
    opacity: props.disabled ? 0.6 : 1,
    "&:hover [data-slot=hbg-glow]": { opacity: 1, filter: "blur(1px)" },
    "&:hover [data-slot=hbg-content]": { filter: "brightness(0.85)" },
    ...(props.style ?? {}),
  };

  const onMount = (node: ElementNode) => {
    const wrapper = node.domElement as HTMLElement | null;
    if (!wrapper) return;
    let animationFrame = 0;
    const totalDurationMs = duration * 1000;
    const segmentDurationMs = totalDurationMs / orderedAnchors.length;
    const startTime = performance.now();

    const tick = (now: number) => {
      // Belt-and-suspenders stop condition: some hosts (e.g. a test harness
      // that wipes the DOM directly instead of going through the framework's
      // removal lifecycle) never fire the "Remove" hook below. Bailing here
      // once the node is detached prevents the loop from leaking forever and
      // eventually ticking with a stale/invalid `now` from a torn-down timer.
      if (!wrapper.isConnected) return;
      const elapsed = (now - startTime) % totalDurationMs;
      const segmentIndex = Math.floor(elapsed / segmentDurationMs) % orderedAnchors.length;
      const segmentProgress = (elapsed % segmentDurationMs) / segmentDurationMs;
      const from = orderedAnchors[segmentIndex];
      const to = orderedAnchors[(segmentIndex + 1) % orderedAnchors.length];
      const x = from[0] + (to[0] - from[0]) * segmentProgress;
      const y = from[1] + (to[1] - from[1]) * segmentProgress;
      wrapper.style.setProperty("--hbg-x", `${x}%`);
      wrapper.style.setProperty("--hbg-y", `${y}%`);
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);

    node.addHook("Remove", () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    });
  };

  const children = [glowLayer, contentLayer];

  if (tag === "a") {
    const anchorElement: DomphyElement<"a"> = {
      a: children,
      href: props.href ?? "#",
      class: props.containerClassName,
      style: sharedStyle,
      _onMount: onMount,
    };
    if (props.onClick) anchorElement.onClick = props.onClick as (event: MouseEvent) => void;
    return anchorElement;
  }

  if (tag === "div") {
    const divElement: DomphyElement<"div"> = {
      div: children,
      class: props.containerClassName,
      style: sharedStyle,
      _onMount: onMount,
    };
    if (props.onClick) divElement.onClick = props.onClick;
    return divElement;
  }

  const buttonElement: DomphyElement<"button"> = {
    button: children,
    type: "button",
    disabled: props.disabled,
    class: props.containerClassName,
    style: sharedStyle,
    _onMount: onMount,
  };
  if (props.onClick) buttonElement.onClick = props.onClick;
  return buttonElement;
}

export { hoverBorderGradient };
