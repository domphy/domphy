// magicui "Orbiting Circles" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// decorative "hub and spoke" layout: a fixed center element with one or more
// icon chips continuously orbiting it at a constant angular velocity.
//
// The upright-glyph trick: each orbiting chip's CSS `@keyframes` animate the
// full `transform` shorthand from `rotate(0) translateX(radius) rotate(0)` to
// `rotate(360deg) translateX(radius) rotate(-360deg)`. Browsers interpolate
// matching transform-function lists position-by-position, so the two
// `rotate()` calls animate independently of the `translateX()` between them —
// the outer rotate sweeps the chip around the circle while the inner
// counter-rotate cancels that sweep out locally, keeping the chip's own
// content upright instead of spinning in place. `animation-direction: reverse`
// flips the whole loop, which reads as counterclockwise motion for a
// symmetric infinite loop. Per-item `animation-delay` is negative and
// distributed evenly across `duration`, so items appear pre-spread around the
// ring instead of clumping together at mount.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";

export interface OrbitingCircleItem {
  /** Content rendered inside this orbiting slot — an icon glyph or arbitrary node. */
  content: DomphyElement;
  /** Start-offset in seconds along the ring, overriding the automatic even spacing. */
  delay?: number;
}

export interface OrbitingCirclesProps {
  /** Items placed evenly around the ring. Defaults to 6 generic icon placeholders. */
  items?: (DomphyElement | OrbitingCircleItem)[];
  /** Element pinned at the shared center point — does not orbit. Pass `null` to omit. Defaults to a small hub glyph. */
  center?: DomphyElement | null;
  /** Orbiting icon box size, in `themeSpacing` units (≈30px at the default). Defaults to 7.5. */
  iconSizeUnits?: number;
  /** Ring radius, in px. Defaults to 160. */
  radius?: number;
  /** Seconds per full revolution. Defaults to 20. */
  duration?: number;
  /** Counterclockwise instead of clockwise. Defaults to false. */
  reverse?: boolean;
  /** Multiplies angular velocity (shrinks the effective revolution time). Defaults to 1. */
  speed?: number;
  /** Renders the faint dashed orbit guide circle. Defaults to true. */
  path?: boolean;
  /** Passthrough style merged onto the outer (relative, overflow-hidden) container. */
  style?: StyleObject;
}

const DEFAULT_ICON_SIZE_UNITS = 7.5;
const DEFAULT_RADIUS = 160;
const DEFAULT_DURATION = 20;

// Hand-authored, simple geometric glyph shapes (24x24, stroke=currentColor) —
// generic placeholders for "an icon goes here", not tracing any icon library.
const DEFAULT_GLYPH_SHAPES: DomphyElement[][] = [
  [{ circle: null, cx: "12", cy: "12", r: "7" }],
  [{ rect: null, x: "5", y: "5", width: "14", height: "14", rx: "2" }],
  [{ polygon: null, points: "12,4 20,19 4,19" }],
  [{ polygon: null, points: "12,3 21,12 12,21 3,12" }],
  [{ path: null, d: "M13 3 5 14h6l-1 7 9-11h-6l1-7z" }],
  [{ path: null, d: "M12 3s7 7.5 7 12a7 7 0 1 1-14 0c0-4.5 7-12 7-12z" }],
];

function orbitGlyph(shape: DomphyElement[]): DomphyElement<"svg"> {
  return {
    svg: shape,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    role: "presentation",
    ariaHidden: "true",
    style: { width: "55%", height: "55%" },
  } as DomphyElement<"svg">;
}

function defaultItems(): OrbitingCircleItem[] {
  return DEFAULT_GLYPH_SHAPES.map((shape) => ({ content: orbitGlyph(shape) }));
}

/** Small hub glyph pinned at the shared center — a generic 4-point sparkle. */
function defaultCenterGlyph(): DomphyElement<"svg"> {
  return {
    svg: [{ path: null, d: "M12 2c0 5.5 4.5 10 10 10-5.5 0-10 4.5-10 10 0-5.5-4.5-10-10-10 5.5 0 10-4.5 10-10z" }],
    viewBox: "0 0 24 24",
    fill: "currentColor",
    role: "presentation",
    ariaHidden: "true",
    style: { width: "60%", height: "60%" },
  } as DomphyElement<"svg">;
}

function isOrbitingCircleItem(entry: DomphyElement | OrbitingCircleItem): entry is OrbitingCircleItem {
  return typeof entry === "object" && entry !== null && "content" in entry;
}

/** Builds the shared `@keyframes` for one ring — same radius means the same
 * rule can be reused by every item on that ring (browser dedupes by name). */
function buildOrbitKeyframes(radius: number): { name: string; rules: Record<string, StyleObject> } {
  const rules = {
    "0%": { transform: `rotate(0deg) translateX(${radius}px) rotate(0deg)` },
    "100%": { transform: `rotate(360deg) translateX(${radius}px) rotate(-360deg)` },
  };
  return { name: `orbit-${hashString(JSON.stringify(rules))}`, rules };
}

function orbitItemElement(
  entry: DomphyElement | OrbitingCircleItem,
  index: number,
  count: number,
  iconSizeUnits: number,
  effectiveDuration: number,
  reverse: boolean,
  keyframeName: string,
  keyframeRules: Record<string, StyleObject>,
): DomphyElement<"div"> {
  const item = isOrbitingCircleItem(entry) ? entry : { content: entry };
  const delaySeconds = item.delay ?? (effectiveDuration / count) * index;

  // Upstream's orbiting item is a bare, transparent `rounded-full` flex box that
  // holds only the icon — no background, border, or shadow — so the icons read
  // as free-floating on the ring rather than as boxed chips. `color` stays so
  // our placeholder `currentColor` glyphs have a stroke color (upstream's real
  // brand icons carry their own color). No reduced-motion pause — upstream
  // orbits continuously.
  return {
    div: [item.content],
    _key: `orbit-item-${index}`,
    ariaHidden: "true",
    style: {
      position: "absolute",
      insetBlockStart: "50%",
      insetInlineStart: "50%",
      translate: "-50% -50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: themeSpacing(iconSizeUnits),
      height: themeSpacing(iconSizeUnits),
      borderRadius: "50%",
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      willChange: "transform",
      animationName: keyframeName,
      animationDuration: `${effectiveDuration}s`,
      animationTimingFunction: "linear",
      animationIterationCount: "infinite",
      animationDirection: reverse ? "reverse" : "normal",
      animationDelay: `${-delaySeconds}s`,
      [`@keyframes ${keyframeName}`]: keyframeRules,
    } as StyleObject,
  };
}

/** Faint guide circle showing the ring boundary — pure decoration, no text of its own. */
function orbitPathElement(radius: number): DomphyElement<"div"> {
  const element = {
    div: null,
    _key: "orbit-path",
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      insetBlockStart: "50%",
      insetInlineStart: "50%",
      translate: "-50% -50%",
      width: `${radius * 2}px`,
      height: `${radius * 2}px`,
      borderRadius: "50%",
      border: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      pointerEvents: "none",
    },
  };
  return element as DomphyElement<"div">;
}

function centerElement(content: DomphyElement, iconSizeUnits: number): DomphyElement<"div"> {
  return {
    div: [content],
    _key: "orbit-center",
    ariaHidden: "true",
    dataTone: "shift-16",
    style: {
      position: "absolute",
      insetBlockStart: "50%",
      insetInlineStart: "50%",
      translate: "-50% -50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: themeSpacing(iconSizeUnits * 1.7),
      height: themeSpacing(iconSizeUnits * 1.7),
      borderRadius: "50%",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      boxShadow: (listener: Listener) =>
        `0 ${themeSpacing(2)} ${themeSpacing(6)} ${themeColor(listener, "shift-4")}`,
      zIndex: 1,
    },
  };
}

/**
 * A decorative "hub and spoke" layout: icon chips continuously orbiting a
 * fixed center point at constant angular velocity, with an upright-glyph
 * counter-rotation trick and evenly staggered start delays. Purely visual —
 * runs automatically and continuously on mount (matching upstream, which has
 * no reduced-motion pause). Call with no arguments for a working demo — a hub
 * glyph with 6 icons orbiting it.
 */
function orbitingCircles(props: OrbitingCirclesProps = {}): DomphyElement<"div"> {
  const items = props.items ?? defaultItems();
  const center = props.center === undefined ? defaultCenterGlyph() : props.center;
  const iconSizeUnits = props.iconSizeUnits ?? DEFAULT_ICON_SIZE_UNITS;
  const radius = props.radius ?? DEFAULT_RADIUS;
  const duration = props.duration ?? DEFAULT_DURATION;
  const reverse = props.reverse ?? false;
  const speed = props.speed && props.speed > 0 ? props.speed : 1;
  const showPath = props.path ?? true;

  const effectiveDuration = duration / speed;
  const { name: keyframeName, rules: keyframeRules } = buildOrbitKeyframes(radius);

  const children: DomphyElement[] = [];
  if (showPath) children.push(orbitPathElement(radius));
  if (center) children.push(centerElement(center, iconSizeUnits));
  items.forEach((entry, index) => {
    children.push(
      orbitItemElement(entry, index, items.length, iconSizeUnits, effectiveDuration, reverse, keyframeName, keyframeRules),
    );
  });

  return {
    div: children,
    role: "img",
    ariaLabel: "Orbiting icons around a central hub",
    style: {
      position: "relative",
      width: `${radius * 2}px`,
      height: `${radius * 2}px`,
      maxWidth: "100%",
      padding: themeSpacing(iconSizeUnits),
      marginInline: "auto",
      overflow: "hidden",
      boxSizing: "content-box",
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { orbitingCircles };
