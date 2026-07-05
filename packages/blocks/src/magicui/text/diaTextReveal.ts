// magicui "Dia Text Reveal" — verified directly against the real upstream
// source (registry/magicui/dia-text-reveal.tsx, MIT-licensed).
//
// An earlier version of this port got the core technique wrong: it kept the
// text FULLY VISIBLE at all times (a solid base layer) and merely stacked a
// decorative color-shine layer on top during the sweep — so a visitor who
// loaded the page after the one-shot sweep had already played (or even
// before it started) saw nothing but static, already-readable text the
// entire time, i.e. "doesn't do anything." Upstream's real technique is a
// genuine REVEAL: the text starts effectively invisible (a `color:
// transparent` span background-clipped to the glyphs, painted with a
// gradient whose stops are almost entirely `transparent`), and a multicolor
// band sweeps left-to-right — solid `textColor` appears only BEHIND the
// band as it passes (already-revealed letters), while everything AHEAD of
// the band stays transparent (not yet revealed). So text visibly
// materializes letter-by-letter as the band travels across it, not merely
// a shine over already-solid text. Ported the exact stop-building math
// (`buildGradient`) and the standard cubic ease-in-out timing curve
// (upstream's `sweepEase`, which is the textbook easeInOutCubic formula).
//
// Since the gradient must be recomputed at arbitrary intermediate band
// positions every frame (not just a start/end 2-keyframe transition), this
// is driven by a manual `requestAnimationFrame` loop writing directly to
// `element.style.backgroundImage` — the same "continuous per-frame
// recompute" idiom this package's `flickeringGrid.ts`/`particles.ts` use
// for effects CSS keyframes can't express. `themeColorToken()` resolves the
// gradient/text colors to literal hex once per trigger (the documented
// escape hatch for APIs needing a literal color string, same as
// `textHighlighter.ts`'s rough-notation integration) since a CSS
// `linear-gradient()` string has no way to reference a live `var()` inside
// a JS-computed value recomputed every frame.
//
// Can optionally cycle through a list of strings, sweeping each one in with
// a pause between, looping.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { type ThemeColor, themeColorToken } from "@domphy/theme";

export interface DiaTextRevealProps {
  /** Text to display, or a list of strings to cycle through (one sweep per item). Defaults to a demo phrase. */
  children?: string | string[];
  /** Gradient colors the sweeping band travels through, left to right. Defaults to five vivid theme roles. */
  colors?: ThemeColor[];
  /** Theme color the text rests at once the sweep has passed. Defaults to `"neutral"` (normal foreground text). */
  finalColor?: ThemeColor;
  /** Milliseconds the sweep itself takes to travel across the text. Defaults to `1500`. */
  duration?: number;
  /** Milliseconds to wait (after the trigger fires) before the first sweep starts. Defaults to `0`. */
  delay?: number;
  /** Starts the sweep automatically the first time the element scrolls into view. When `false`, the
   * sweep instead waits for a click (there is no external imperative trigger in this factory-function
   * API, so click is the manual-trigger substitute). Defaults to `true`. */
  autoStart?: boolean;
  /** When multiple `children` items are given, loop back to the first after the last instead of
   * stopping there; when a single string is given, keep re-sweeping it on `duration + pauseBetween`
   * cycles instead of sweeping only once. Defaults to `false`. */
  repeat?: boolean;
  /** Milliseconds paused (settled, solid color) between one item's sweep finishing and the next
   * starting. Defaults to `500`. */
  pauseBetween?: number;
  /** Reserves enough inline width for the longest item so cycling text doesn't shift surrounding
   * layout. Defaults to `false`. */
  reserveWidth?: boolean;
  /** Passthrough style merged onto the outer wrapper. */
  style?: StyleObject;
}

const DEFAULT_COLORS: ThemeColor[] = ["primary", "secondary", "info", "success", "warning"];

// Percentage-space band half-width and travel range, matching upstream
// exactly: the band starts fully off the left edge and ends fully off the
// right edge, so both the "not yet revealed" and "fully revealed" states
// are reached with room to spare.
const BAND_HALF = 17;
const SWEEP_START = -BAND_HALF;
const SWEEP_END = 100 + BAND_HALF;

// Upstream's `sweepEase` — the standard easeInOutCubic curve.
function sweepEase(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Builds the `linear-gradient()` string for one frame: solid `textColorHex`
 * behind the band (already revealed), the color band itself, transparent
 * ahead of the band (not yet revealed) — or, once the band has fully passed
 * (`bandStart >= 100`), a single solid color covering the whole text. */
function buildGradient(position: number, colorHexes: string[], textColorHex: string): string {
  const bandStart = position - BAND_HALF;
  const bandEnd = position + BAND_HALF;
  if (bandStart >= 100) return `linear-gradient(90deg, ${textColorHex}, ${textColorHex})`;

  const stops: string[] = [];
  if (bandStart > 0) stops.push(`${textColorHex} 0%`, `${textColorHex} ${bandStart.toFixed(2)}%`);

  const count = colorHexes.length;
  colorHexes.forEach((hex, index) => {
    const percent = count === 1 ? position : bandStart + (index / (count - 1)) * BAND_HALF * 2;
    stops.push(`${hex} ${percent.toFixed(2)}%`);
  });

  if (bandEnd < 100) stops.push(`transparent ${bandEnd.toFixed(2)}%`, "transparent 100%");
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

/**
 * Text that stays invisible (background-clipped to a mostly-transparent
 * gradient) until the first time it scrolls into view, at which point a
 * multicolor band sweeps across it once, revealing solid, readable text
 * behind the band as it travels — a "letters materializing" reveal, not a
 * shine over already-visible text. Optionally cycles through a list of
 * strings, sweeping each in turn. Call with no arguments for a working demo.
 */
function diaTextReveal(props: DiaTextRevealProps = {}): DomphyElement<"span"> {
  const items = (() => {
    const raw = props.children ?? "Reveal Yourself";
    const list = Array.isArray(raw) ? raw : [raw];
    return list.length > 0 ? list : ["Reveal Yourself"];
  })();
  const colors = props.colors ?? DEFAULT_COLORS;
  const finalColor = props.finalColor ?? "neutral";
  const duration = props.duration ?? 1500;
  const delay = props.delay ?? 0;
  const autoStart = props.autoStart ?? true;
  const repeat = props.repeat ?? false;
  const pauseBetween = props.pauseBetween ?? 500;
  const reserveWidth = props.reserveWidth ?? false;

  const longestItemLength = items.reduce((max, item) => Math.max(max, item.length), 0);
  const currentText = toState(items[0]);

  return {
    span: (listener) => currentText.get(listener),
    style: {
      position: "relative",
      display: "inline-block",
      whiteSpace: "nowrap",
      color: "transparent",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      backgroundSize: "100% 100%",
      ...(reserveWidth ? { minWidth: `${longestItemLength}ch` } : {}),
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const element = node.domElement as HTMLElement;

      const textColorHex = (() => {
        try {
          return themeColorToken(node, "shift-11", finalColor);
        } catch {
          return "currentColor";
        }
      })();
      const colorHexes = colors.map((color) => {
        try {
          return themeColorToken(node, "shift-8", color);
        } catch {
          return textColorHex;
        }
      });

      // Not yet revealed: paint the resting (pre-trigger) frame immediately,
      // rather than leaving the browser's own gradient-less default (which
      // would render as plain solid text, defeating the whole reveal).
      element.style.backgroundImage = buildGradient(SWEEP_START, colorHexes, textColorHex);

      const hasRaf = typeof requestAnimationFrame === "function";

      let itemIndex = 0;
      let hasStarted = false;
      let animationFrameId: number | null = null;
      let pendingTimeout: ReturnType<typeof setTimeout> | null = null;

      // Cycling/repeat is plain setTimeout sequencing and doesn't depend on
      // rAF at all — only the smooth per-frame sweep does. A runtime with no
      // rAF (e.g. a non-browser test runtime) still cycles/repeats on
      // schedule, it just jumps straight to each item's fully-revealed frame
      // instead of animating the reveal.
      const onSweepComplete = () => {
        animationFrameId = null;
        const isLastItem = itemIndex === items.length - 1;
        if (isLastItem && !repeat) return;
        pendingTimeout = setTimeout(() => {
          pendingTimeout = null;
          itemIndex = (itemIndex + 1) % items.length;
          currentText.set(items[itemIndex]);
          element.style.backgroundImage = buildGradient(SWEEP_START, colorHexes, textColorHex);
          runSweep();
        }, pauseBetween);
      };

      const runSweep = () => {
        if (!hasRaf) {
          element.style.backgroundImage = buildGradient(SWEEP_END, colorHexes, textColorHex);
          onSweepComplete();
          return;
        }
        // The first frame's own timestamp is the start reference — NOT a
        // separately-called `performance.now()` — so elapsed-time math never
        // straddles two different clock sources (matters under mocked timers,
        // where `requestAnimationFrame`'s callback clock may not track real
        // high-resolution time).
        let startTime: number | null = null;
        const step = (now: number) => {
          if (startTime === null) startTime = now;
          const elapsed = now - startTime;
          const t = Math.min(1, duration <= 0 ? 1 : elapsed / duration);
          const position = SWEEP_START + sweepEase(t) * (SWEEP_END - SWEEP_START);
          element.style.backgroundImage = buildGradient(position, colorHexes, textColorHex);
          if (t < 1) {
            animationFrameId = requestAnimationFrame(step);
            return;
          }
          onSweepComplete();
        };
        animationFrameId = requestAnimationFrame(step);
      };

      const beginSequence = () => {
        if (hasStarted) return;
        hasStarted = true;
        if (delay > 0) {
          pendingTimeout = setTimeout(() => {
            pendingTimeout = null;
            runSweep();
          }, delay);
        } else {
          runSweep();
        }
      };

      let intersectionObserver: IntersectionObserver | null = null;
      let handleClick: (() => void) | null = null;

      if (autoStart) {
        if (typeof IntersectionObserver !== "function") {
          // No IntersectionObserver support (e.g. a non-browser test runtime)
          // — fail open and play immediately rather than never playing.
          beginSequence();
        } else {
          intersectionObserver = new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                beginSequence();
                intersectionObserver?.disconnect();
                intersectionObserver = null;
              }
            },
            { threshold: 0.1 },
          );
          intersectionObserver.observe(element);
        }
      } else {
        handleClick = () => beginSequence();
        element.style.cursor = "pointer";
        element.addEventListener("click", handleClick);
      }

      node.addHook("Remove", () => {
        if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
        if (pendingTimeout !== null) clearTimeout(pendingTimeout);
        intersectionObserver?.disconnect();
        if (handleClick) element.removeEventListener("click", handleClick);
      });
    },
  } as DomphyElement<"span">;
}

export { diaTextReveal };
