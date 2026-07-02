// Magic UI "Animated Theme Toggler" — clean-room reimplementation.
//
// A small icon button that flips between light/dark theme while a shape
// (a circle, by default) wipes outward from the button — or from the
// viewport center — to reveal the new color scheme. Implemented with the
// native View Transitions API: `document.startViewTransition()` snapshots
// the before/after DOM states for us, and the reveal itself is a plain Web
// Animations API `clip-path` animation applied to the browser-managed
// `::view-transition-new(root)` pseudo-element — no manual before/after
// screenshot cloning is needed. Browsers without View Transitions support
// fall back to an instant, unanimated theme swap, per spec.
//
// The component itself is theme-agnostic: it does not own a global
// light/dark switch. It reports the toggled value through `theme` (pass a
// `State` to wire it straight into an external store) and/or the
// `onThemeChange` callback, and it is the caller's responsibility to react to
// that (e.g. flip a `data-color-scheme` attribute on `<html>`) inside the
// `document.startViewTransition()` update — which is exactly what happens
// here since `onThemeChange`/`theme.set()` are invoked from that callback.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream Magic UI source was viewed or copied.

import type {
  DomphyElement,
  ElementNode,
  Listener,
  StyleObject,
  ValueOrState,
} from "@domphy/core";
import { toState } from "@domphy/core";
import { buttonGhost } from "@domphy/ui";
import { themeSpacing } from "@domphy/theme";

export type ThemeTogglerTheme = "light" | "dark";

export type ThemeWipeVariant =
  | "circle"
  | "square"
  | "triangle"
  | "diamond"
  | "rectangle"
  | "hexagon"
  | "star";

export interface AnimatedThemeTogglerProps {
  /** Controlled current theme. Pass a `State<"light"|"dark">` to wire this into
   * an external theme store — writes made by this component go straight
   * through to that same state. Defaults to an internal `"light"` state so
   * the component works as a standalone demo. */
  theme?: ValueOrState<ThemeTogglerTheme>;
  /** Called with the new theme value at the moment the swap happens (inside
   * the same callback that drives the wipe), for callers that prefer an
   * imperative external store (e.g. writing to `localStorage`) over passing
   * a `State`. */
  onThemeChange?: (nextTheme: ThemeTogglerTheme) => void;
  /** Shape the reveal wipes outward in. Defaults to `"circle"`. */
  variant?: ThemeWipeVariant;
  /** Wipe duration in ms. Defaults to `400`. */
  duration?: number;
  /** Where the wipe originates from: the button's own screen position, or
   * the viewport center. Defaults to `"button"`. */
  origin?: "button" | "center";
  /** Accessible label for the button. Defaults to `"Toggle theme"`. */
  ariaLabel?: string;
  /** Custom glyph shown in light mode (swapped for `darkIcon` in dark mode).
   * Defaults to a sun glyph. */
  lightIcon?: DomphyElement;
  /** Custom glyph shown in dark mode. Defaults to a crescent-moon glyph. */
  darkIcon?: DomphyElement;
  style?: StyleObject;
}

let themeTogglerInstanceCounter = 0;

/** Simple radiating-rays sun glyph, painted via `fill="currentColor"` /
 * `stroke="currentColor"` so it inherits the button's icon-color idiom
 * (same technique as this package's other decorative glyphs). */
function sunGlyph(): DomphyElement {
  return {
    svg: [
      { circle: null, cx: "12", cy: "12", r: "4.5" },
      {
        path: null,
        d: "M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
      },
    ],
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg",
    fill: "currentColor",
    role: "img",
    ariaHidden: "true",
  } as DomphyElement;
}

/** Crescent-moon glyph built from two plain circles combined through an SVG
 * `<mask>` (a full disc minus an offset disc) rather than reproducing any
 * specific icon library's hand-authored path data. */
function moonGlyph(maskId: string): DomphyElement {
  return {
    svg: [
      {
        defs: [
          {
            mask: [
              { circle: null, cx: "12", cy: "12", r: "8", fill: "white" },
              { circle: null, cx: "16.5", cy: "8.5", r: "7", fill: "black" },
            ],
            id: maskId,
          } as DomphyElement,
        ],
      } as DomphyElement,
      {
        circle: null,
        cx: "12",
        cy: "12",
        r: "8",
        fill: "currentColor",
        mask: `url(#${maskId})`,
      },
    ],
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg",
    role: "img",
    ariaHidden: "true",
  } as DomphyElement;
}

/** Regular-polygon vertex offsets (in px, relative to the wipe's origin
 * point) for a shape with `sides` equally-spaced vertices, sized so that
 * even a viewport corner sitting exactly on an edge midpoint (the worst
 * case for a regular polygon) is still covered — the standard
 * `radius = coverage / cos(pi / sides)` apothem bound. */
function regularPolygonOffsets(
  vertexAnglesDeg: number[],
  sides: number,
  coverageRadius: number,
  radiusMultiplier = 1,
): Array<[number, number]> {
  const radius = (coverageRadius / Math.cos(Math.PI / sides)) * radiusMultiplier;
  return vertexAnglesDeg.map((angleDeg) => {
    const angleRad = (angleDeg * Math.PI) / 180;
    return [Math.cos(angleRad) * radius, Math.sin(angleRad) * radius];
  });
}

function polygonKeyframePair(
  offsets: Array<[number, number]>,
  originX: number,
  originY: number,
): [string, string] {
  const collapsed = offsets.map(() => `${originX}px ${originY}px`).join(", ");
  const expanded = offsets
    .map(([dx, dy]) => `${originX + dx}px ${originY + dy}px`)
    .join(", ");
  return [`polygon(${collapsed})`, `polygon(${expanded})`];
}

/** Builds the `[from, to]` `clip-path` pair for the wipe's chosen shape,
 * guaranteed to fully cover the viewport by the end of the animation
 * regardless of where the origin point sits. */
function buildWipeClipPathKeyframes(
  variant: ThemeWipeVariant,
  originX: number,
  originY: number,
  viewportWidth: number,
  viewportHeight: number,
): [string, string] {
  const coverX = Math.max(originX, viewportWidth - originX);
  const coverY = Math.max(originY, viewportHeight - originY);
  const coverDiag = Math.hypot(coverX, coverY);

  if (variant === "circle") {
    return [
      `circle(0px at ${originX}px ${originY}px)`,
      `circle(${coverDiag}px at ${originX}px ${originY}px)`,
    ];
  }

  if (variant === "rectangle") {
    // A true axis-aligned rectangle: half-extents sized independently per
    // axis so it exactly reaches the farthest edge on each axis (no
    // apothem bound needed — the shape's own corners are the coverage
    // target here).
    const offsets: Array<[number, number]> = [
      [coverX, coverY],
      [-coverX, coverY],
      [-coverX, -coverY],
      [coverX, -coverY],
    ];
    return polygonKeyframePair(offsets, originX, originY);
  }

  if (variant === "star") {
    // Conservative bound: treat the star as if it were only its inner
    // pentagon (ignoring the extra reach of the outer points, which can
    // only add coverage, never remove it).
    const innerOffsets = regularPolygonOffsets(
      Array.from({ length: 5 }, (_, index) => -90 + index * 72 + 36),
      5,
      coverDiag,
    );
    const innerRadius = Math.hypot(innerOffsets[0][0], innerOffsets[0][1]);
    const outerRadius = innerRadius * 2;
    const starOffsets: Array<[number, number]> = Array.from({ length: 10 }, (_, index) => {
      const angleDeg = -90 + index * 36;
      const radius = index % 2 === 0 ? outerRadius : innerRadius;
      const angleRad = (angleDeg * Math.PI) / 180;
      return [Math.cos(angleRad) * radius, Math.sin(angleRad) * radius];
    });
    return polygonKeyframePair(starOffsets, originX, originY);
  }

  const offsets: Array<[number, number]> = (() => {
    switch (variant) {
      case "square":
        return regularPolygonOffsets([45, 135, 225, 315], 4, coverDiag);
      case "diamond":
        return regularPolygonOffsets([0, 90, 180, 270], 4, coverDiag);
      case "hexagon":
        return regularPolygonOffsets([0, 60, 120, 180, 240, 300], 6, coverDiag);
      case "triangle":
        return regularPolygonOffsets([-90, 30, 150], 3, coverDiag);
      default:
        return regularPolygonOffsets([45, 135, 225, 315], 4, coverDiag);
    }
  })();
  return polygonKeyframePair(offsets, originX, originY);
}

/**
 * A small icon button that flips between light/dark theme behind an
 * expanding geometric wipe (circle by default) originating from the button
 * itself or the screen center, using the native View Transitions API where
 * supported and falling back to an instant swap otherwise. Call with no
 * arguments for a working demo (an internally-managed `"light"` state).
 */
function animatedThemeToggler(
  props: AnimatedThemeTogglerProps = {},
): DomphyElement<"button"> {
  const {
    variant = "circle",
    duration = 400,
    origin = "button",
    ariaLabel = "Toggle theme",
  } = props;

  const theme = toState(props.theme ?? "light", "theme");
  const onThemeChange = props.onThemeChange;

  const instanceId = ++themeTogglerInstanceCounter;
  const moonMaskId = `domphy-theme-toggler-moon-mask-${instanceId}`;

  const lightIcon = props.lightIcon ?? sunGlyph();
  const darkIcon = props.darkIcon ?? moonGlyph(moonMaskId);

  let buttonElement: HTMLButtonElement | null = null;

  function handleToggle(): void {
    const nextTheme: ThemeTogglerTheme = theme.get() === "dark" ? "light" : "dark";

    const applyTheme = () => {
      theme.set(nextTheme);
      onThemeChange?.(nextTheme);
    };

    // Small icon bounce plays regardless of View Transitions support — it is
    // a cheap, local button-hover-style flourish, not the page-wide wipe.
    if (buttonElement && typeof buttonElement.animate === "function") {
      buttonElement.animate(
        [
          { transform: "scale(1) rotate(0deg)" },
          { transform: "scale(0.75) rotate(-25deg)" },
          { transform: "scale(1) rotate(0deg)" },
        ],
        { duration: Math.min(duration, 350), easing: "ease-out" },
      );
    }

    const supportsViewTransition =
      typeof document !== "undefined" &&
      typeof document.startViewTransition === "function" &&
      typeof document.documentElement.animate === "function" &&
      typeof window !== "undefined";

    if (!supportsViewTransition || !buttonElement) {
      // Graceful fallback: instant theme swap, no wipe animation.
      applyTheme();
      return;
    }

    const buttonRect = buttonElement.getBoundingClientRect();
    const originX =
      origin === "center" ? window.innerWidth / 2 : buttonRect.left + buttonRect.width / 2;
    const originY =
      origin === "center" ? window.innerHeight / 2 : buttonRect.top + buttonRect.height / 2;
    const [fromClipPath, toClipPath] = buildWipeClipPathKeyframes(
      variant,
      originX,
      originY,
      window.innerWidth,
      window.innerHeight,
    );

    const transition = document.startViewTransition(applyTheme);
    transition.ready
      .then(() => {
        document.documentElement.animate(
          [{ clipPath: fromClipPath }, { clipPath: toClipPath }],
          { duration, easing: "ease-out", pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(() => {
        // The transition was skipped/interrupted (e.g. a rapid re-click).
        // `applyTheme()` already ran synchronously inside
        // `startViewTransition`'s update callback, so the theme itself is
        // already correct even without the wipe animation playing.
      });
  }

  const iconStyle = (visibleWhen: ThemeTogglerTheme): StyleObject => ({
    position: "absolute",
    inset: 0,
    display: (listener: Listener) => (theme.get(listener) === visibleWhen ? "flex" : "none"),
    alignItems: "center",
    justifyContent: "center",
  });

  return {
    button: [
      {
        span: [lightIcon],
        ariaHidden: "true",
        style: iconStyle("light"),
      } as DomphyElement,
      {
        span: [darkIcon],
        ariaHidden: "true",
        style: iconStyle("dark"),
      } as DomphyElement,
    ],
    type: "button",
    ariaLabel,
    onClick: () => handleToggle(),
    $: [buttonGhost({ color: "neutral" })],
    _onMount: (node: ElementNode) => {
      buttonElement = node.domElement as HTMLButtonElement;
    },
    _onRemove: () => {
      buttonElement = null;
    },
    style: {
      position: "relative",
      width: themeSpacing(9),
      height: themeSpacing(9),
      ...(props.style ?? {}),
    },
  } as DomphyElement<"button">;
}

export { animatedThemeToggler };
