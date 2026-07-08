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
// On toggle the component flips the `.dark` class on `<html>` itself (inside
// the `document.startViewTransition()` update), which is the page-wide change
// the wipe reveals. It also reports the new value through `theme` (pass a
// `State` to two-way-bind an external store) and the `onThemeChange` callback.
// In uncontrolled mode (no `theme` prop) it additionally persists the choice
// to `localStorage("theme")` and mirrors external `.dark` changes back into
// its icon via a `MutationObserver` — matching the upstream component.
//
// The View-Transition orchestration and clip-path geometry are ported to
// match Magic UI's MIT-licensed upstream (animated-theme-toggler.tsx) for
// visual fidelity; the icon glyphs are this package's own hand-authored SVGs.

import type {
  DomphyElement,
  ElementNode,
  Listener,
  StyleObject,
  ValueOrState,
} from "@domphy/core";
import { flushSync, toState } from "@domphy/core";
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
  /** When `true`, the wipe expands from the viewport center instead of the
   * button's own screen position. Defaults to `false`. */
  fromCenter?: boolean;
  /** Accessible label for the button. Defaults to `"Toggle theme"`. */
  ariaLabel?: string;
  /** Custom glyph shown in light mode (swapped for `darkIcon` in dark mode).
   * Defaults to a crescent-moon glyph. */
  lightIcon?: DomphyElement;
  /** Custom glyph shown in dark mode. Defaults to a sun glyph. */
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

/** Repeats the origin point `vertexCount` times to build the fully-collapsed
 * (zero-area) polygon the wipe grows from. Ported from Magic UI upstream. */
function polygonCollapsed(cx: number, cy: number, vertexCount: number): string {
  const pairs = Array.from({ length: vertexCount }, () => `${cx}px ${cy}px`).join(", ");
  return `polygon(${pairs})`;
}

/** Builds the `[from, to]` `clip-path` pair for the wipe's chosen shape.
 * Geometry ported verbatim from Magic UI's MIT-licensed upstream
 * (`getThemeTransitionClipPaths`) so the revealed shape matches exactly. */
function getThemeTransitionClipPaths(
  variant: ThemeWipeVariant,
  cx: number,
  cy: number,
  maxRadius: number,
  viewportWidth: number,
  viewportHeight: number,
): [string, string] {
  switch (variant) {
    case "circle":
      return [
        `circle(0px at ${cx}px ${cy}px)`,
        `circle(${maxRadius}px at ${cx}px ${cy}px)`,
      ];
    case "square": {
      const halfWidth = Math.max(cx, viewportWidth - cx);
      const halfHeight = Math.max(cy, viewportHeight - cy);
      const halfSide = Math.max(halfWidth, halfHeight) * 1.05;
      const end = [
        `${cx - halfSide}px ${cy - halfSide}px`,
        `${cx + halfSide}px ${cy - halfSide}px`,
        `${cx + halfSide}px ${cy + halfSide}px`,
        `${cx - halfSide}px ${cy + halfSide}px`,
      ].join(", ");
      return [polygonCollapsed(cx, cy, 4), `polygon(${end})`];
    }
    case "triangle": {
      const scale = maxRadius * 2.2;
      const dx = (Math.sqrt(3) / 2) * scale;
      const verts = [
        `${cx}px ${cy - scale}px`,
        `${cx + dx}px ${cy + 0.5 * scale}px`,
        `${cx - dx}px ${cy + 0.5 * scale}px`,
      ].join(", ");
      return [polygonCollapsed(cx, cy, 3), `polygon(${verts})`];
    }
    case "diamond": {
      // Slightly larger than the circle radius so axis-aligned coverage matches.
      const radius = maxRadius * Math.SQRT2;
      const end = [
        `${cx}px ${cy - radius}px`,
        `${cx + radius}px ${cy}px`,
        `${cx}px ${cy + radius}px`,
        `${cx - radius}px ${cy}px`,
      ].join(", ");
      return [polygonCollapsed(cx, cy, 4), `polygon(${end})`];
    }
    case "hexagon": {
      const radius = maxRadius * Math.SQRT2;
      const verts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 3;
        verts.push(`${cx + radius * Math.cos(angle)}px ${cy + radius * Math.sin(angle)}px`);
      }
      return [polygonCollapsed(cx, cy, 6), `polygon(${verts.join(", ")})`];
    }
    case "rectangle": {
      const halfWidth = Math.max(cx, viewportWidth - cx);
      const halfHeight = Math.max(cy, viewportHeight - cy);
      const end = [
        `${cx - halfWidth}px ${cy - halfHeight}px`,
        `${cx + halfWidth}px ${cy - halfHeight}px`,
        `${cx + halfWidth}px ${cy + halfHeight}px`,
        `${cx - halfWidth}px ${cy + halfHeight}px`,
      ].join(", ");
      return [polygonCollapsed(cx, cy, 4), `polygon(${end})`];
    }
    case "star": {
      // Small overscan so the last frames never leave a 1px seam before the
      // transition group ends.
      const radius = maxRadius * Math.SQRT2 * 1.03;
      const innerRatio = 0.42;
      const starPolygon = (r: number) => {
        const verts: string[] = [];
        for (let i = 0; i < 5; i++) {
          const outerAngle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
          verts.push(
            `${cx + r * Math.cos(outerAngle)}px ${cy + r * Math.sin(outerAngle)}px`,
          );
          const innerAngle = outerAngle + Math.PI / 5;
          verts.push(
            `${cx + r * innerRatio * Math.cos(innerAngle)}px ${cy + r * innerRatio * Math.sin(innerAngle)}px`,
          );
        }
        return `polygon(${verts.join(", ")})`;
      };
      const startRadius = Math.max(2, radius * 0.025);
      return [starPolygon(startRadius), starPolygon(radius)];
    }
    default:
      return [
        `circle(0px at ${cx}px ${cy}px)`,
        `circle(${maxRadius}px at ${cx}px ${cy}px)`,
      ];
  }
}

const THEME_TOGGLER_GLOBAL_CSS_ID = "domphy-animated-theme-toggler-vt-css";

/** Injects (once) the companion global CSS that upstream ships in the app's
 * `globals.css`. Without it: the browser's built-in root cross-fade plays on
 * top of the clip-path wipe (turning a clean wipe into a fade+clip); the
 * `::view-transition-group(root)` runs at its default duration instead of the
 * configured one; and Firefox paints the new theme unclipped for a frame
 * before the JS animation starts. The duration/clip rules are scoped to
 * `html[data-magicui-theme-vt="active"]` so unrelated root view transitions
 * are unaffected. Injected just before the first real View Transition, so
 * jsdom / SSR never touch it. */
function ensureThemeTogglerGlobalCss(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(THEME_TOGGLER_GLOBAL_CSS_ID)) return;
  const style = document.createElement("style");
  style.id = THEME_TOGGLER_GLOBAL_CSS_ID;
  style.textContent =
    "::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}" +
    'html[data-magicui-theme-vt="active"]::view-transition-group(root){animation-duration:var(--magicui-theme-toggle-vt-duration)}' +
    'html[data-magicui-theme-vt="active"]::view-transition-new(root){clip-path:var(--magicui-theme-vt-clip-from)}';
  document.head.appendChild(style);
}

/**
 * A small icon button that flips between light/dark theme behind an
 * expanding geometric wipe (circle by default) originating from the button
 * itself or the screen center, using the native View Transitions API where
 * supported and falling back to an instant swap otherwise. Call with no
 * arguments for a working demo. In uncontrolled mode (no `theme` prop) it
 * owns the page's `.dark` class, persists to `localStorage`, and mirrors
 * external `.dark` changes back into its icon via a `MutationObserver` —
 * matching the upstream component's default behavior.
 */
function animatedThemeToggler(
  props: AnimatedThemeTogglerProps = {},
): DomphyElement<"button"> {
  const {
    variant = "circle",
    duration = 400,
    fromCenter = false,
    ariaLabel = "Toggle theme",
  } = props;

  const isControlled = props.theme !== undefined;
  const theme = toState(props.theme ?? "light", "theme");
  const onThemeChange = props.onThemeChange;

  const instanceId = ++themeTogglerInstanceCounter;
  const moonMaskId = `domphy-theme-toggler-moon-mask-${instanceId}`;

  const lightIcon = props.lightIcon ?? moonGlyph(moonMaskId);
  const darkIcon = props.darkIcon ?? sunGlyph();

  let buttonElement: HTMLButtonElement | null = null;
  let themeObserver: MutationObserver | null = null;

  function handleToggle(): void {
    const nextTheme: ThemeTogglerTheme = theme.get() === "dark" ? "light" : "dark";

    const applyTheme = () => {
      // Drive the whole page: flip the `.dark` class on <html> itself so the
      // View Transition snapshots — and the wipe reveals — a real page-wide
      // theme change, not merely this button's icon.
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", nextTheme === "dark");
      }
      theme.set(nextTheme);
      onThemeChange?.(nextTheme);
      // Uncontrolled mode owns persistence; controlled callers own their store.
      if (!isControlled && typeof localStorage !== "undefined") {
        localStorage.setItem("theme", nextTheme);
      }
      // Apply the reactive icon swap synchronously so the
      // ::view-transition-new(root) snapshot captures the new icon, not the old.
      flushSync();
    };

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

    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    let originX: number;
    let originY: number;
    if (fromCenter) {
      originX = viewportWidth / 2;
      originY = viewportHeight / 2;
    } else {
      const rect = buttonElement.getBoundingClientRect();
      originX = rect.left + rect.width / 2;
      originY = rect.top + rect.height / 2;
    }
    const maxRadius = Math.hypot(
      Math.max(originX, viewportWidth - originX),
      Math.max(originY, viewportHeight - originY),
    );
    const [fromClipPath, toClipPath] = getThemeTransitionClipPaths(
      variant,
      originX,
      originY,
      maxRadius,
      viewportWidth,
      viewportHeight,
    );

    // Companion CSS must be present before the transition's pseudo-elements
    // are created so its rules apply to the very first composited frame.
    ensureThemeTogglerGlobalCss();

    const root = document.documentElement;
    root.setAttribute("data-magicui-theme-vt", "active");
    // Sync the ::view-transition-group(root) animation-duration to `duration`.
    root.style.setProperty("--magicui-theme-toggle-vt-duration", `${duration}ms`);
    // Pin the collapsed clip so Firefox does not paint the new theme unclipped
    // between the snapshot and the ready.then() JS animation starting.
    root.style.setProperty("--magicui-theme-vt-clip-from", fromClipPath);
    const cleanup = () => {
      root.removeAttribute("data-magicui-theme-vt");
      root.style.removeProperty("--magicui-theme-toggle-vt-duration");
      root.style.removeProperty("--magicui-theme-vt-clip-from");
    };

    const transition = document.startViewTransition(applyTheme);

    // Clean up the flag/vars once the transition finishes (or is skipped).
    if (typeof transition?.finished?.finally === "function") {
      transition.finished.finally(cleanup);
    } else {
      cleanup();
    }

    transition.ready
      .then(() => {
        document.documentElement.animate(
          [{ clipPath: fromClipPath }, { clipPath: toClipPath }],
          {
            duration,
            easing: variant === "star" ? "linear" : "ease-in-out",
            // Hold the final expanded clip so the last wipe frame is retained.
            fill: "forwards",
            pseudoElement: "::view-transition-new(root)",
          },
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
      // Uncontrolled mode: reflect the page's current `.dark` class into the
      // icon, and keep it in sync with external theme switches (another
      // toggle, a system-preference script, etc.) via a MutationObserver —
      // exactly as the upstream component does in its `useEffect`.
      if (
        !isControlled &&
        typeof document !== "undefined" &&
        typeof MutationObserver !== "undefined"
      ) {
        const syncFromDocument = () => {
          theme.set(document.documentElement.classList.contains("dark") ? "dark" : "light");
        };
        syncFromDocument();
        themeObserver = new MutationObserver(() => {
          // Ignore stray callbacks after the button has left the DOM.
          if (buttonElement && !buttonElement.isConnected) return;
          syncFromDocument();
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        });
      }
    },
    _onRemove: () => {
      buttonElement = null;
      themeObserver?.disconnect();
      themeObserver = null;
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
