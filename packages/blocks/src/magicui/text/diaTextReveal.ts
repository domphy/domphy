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
// Can optionally cycle through a list of strings (`repeat`), sweeping each in
// with a pause between and animating the wrapper's width to each item's
// measured pixel width as it rotates; and can replay on every scroll-back
// (`once: false`) rather than only the first time it enters view.

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
  /** When multiple `children` items are given, cycle through them (advancing one per sweep, looping
   * back to the first after the last); when a single string is given, keep re-sweeping it. When
   * `false`, sweep only the first item once and stop — the list is not walked. Defaults to `false`. */
  repeat?: boolean;
  /** Milliseconds paused (settled, solid color) between one item's sweep finishing and the next
   * starting. Defaults to `500`. */
  pauseBetween?: number;
  /** Replays the sweep every time the element re-enters the viewport (only applies when `autoStart`
   * is on). When `true`, the sweep plays a single time on first entry. Defaults to `true`. */
  once?: boolean;
  /** Reserves the widest item's measured pixel width (applied as `width`) so cycling text doesn't
   * shift surrounding layout. When `false` and multiple items are given, the width instead animates
   * smoothly to each item's measured width as it rotates. Defaults to `false`. */
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

/** Measures each string's rendered pixel width by cloning the span into the
 * same layout context (upstream's `measureWidths` ghost-clone), so cycling
 * text can reserve or animate to a real pixel width instead of a raw
 * character count that diverges under proportional fonts. */
function measureWidths(element: HTMLElement, texts: string[]): number[] {
  const parent = element.parentElement;
  if (!parent) return [];
  const ghost = element.cloneNode(false) as HTMLElement;
  Object.assign(ghost.style, {
    position: "absolute",
    visibility: "hidden",
    pointerEvents: "none",
    width: "auto",
    whiteSpace: "nowrap",
  });
  parent.appendChild(ghost);
  const widths = texts.map((text) => {
    ghost.textContent = text;
    return ghost.getBoundingClientRect().width;
  });
  ghost.remove();
  return widths;
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
  const once = props.once ?? true;
  const reserveWidth = props.reserveWidth ?? false;

  const isMulti = items.length > 1;
  const currentText = toState(items[0]);

  return {
    span: (listener) => currentText.get(listener),
    style: {
      position: "relative",
      verticalAlign: "bottom",
      lineHeight: "100%",
      transform: "translateY(-2px)",
      color: "transparent",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      backgroundSize: "100% 100%",
      // Multi-item wrapper clips during the width transition (upstream's
      // `overflow: hidden`); the concrete pixel width is measured and applied
      // in `_onMount`, not reserved here as a character count.
      ...(isMulti ? { display: "inline-block", overflow: "hidden", whiteSpace: "nowrap" } : {}),
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

      // Measure each item's rendered pixel width (only meaningful when cycling
      // multiple strings). With `reserveWidth` the wrapper is pinned to the
      // widest item; otherwise its width animates to each item's width as the
      // list rotates — matching upstream's `measureWidths` + `animate({width})`.
      const widths = isMulti ? measureWidths(element, items) : [];
      if (isMulti && widths.length > 0) {
        if (reserveWidth) {
          element.style.width = `${Math.max(...widths)}px`;
        } else {
          element.style.transition = "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
          element.style.width = `${widths[0]}px`;
        }
      }
      const applyItemWidth = (index: number) => {
        if (isMulti && !reserveWidth && widths[index] != null) {
          element.style.width = `${widths[index]}px`;
        }
      };

      const prefersReducedMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) {
        element.style.backgroundImage = buildGradient(SWEEP_END, colorHexes, textColorHex);
        return;
      }

      // Not yet revealed: paint the resting (pre-trigger) frame immediately,
      // rather than leaving the browser's own gradient-less default (which
      // would render as plain solid text, defeating the whole reveal).
      element.style.backgroundImage = buildGradient(SWEEP_START, colorHexes, textColorHex);

      const hasRaf = typeof requestAnimationFrame === "function";

      let itemIndex = 0;
      let hasStarted = false;
      let animationFrameId: number | null = null;
      let pendingTimeout: ReturnType<typeof setTimeout> | null = null;

      const stop = () => {
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        if (pendingTimeout !== null) {
          clearTimeout(pendingTimeout);
          pendingTimeout = null;
        }
      };

      // Cycling/repeat is plain setTimeout sequencing and doesn't depend on
      // rAF at all — only the smooth per-frame sweep does. A runtime with no
      // rAF (e.g. a non-browser test runtime) still cycles/repeats on
      // schedule, it just jumps straight to each item's fully-revealed frame
      // instead of animating the reveal.
      //
      // Upstream advances only when `repeat` is on (a multi list cycling, or a
      // single string re-sweeping); with `repeat` off it sweeps exactly the
      // first item once and stops — it never walks the list.
      const onSweepComplete = () => {
        animationFrameId = null;
        if (!repeat) return;
        pendingTimeout = setTimeout(() => {
          pendingTimeout = null;
          itemIndex = (itemIndex + 1) % items.length;
          currentText.set(items[itemIndex]);
          applyItemWidth(itemIndex);
          play();
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

      // One play pass: reset to the resting (invisible) frame immediately, wait
      // `delay`, then sweep. `delay` precedes every pass — the first sweep, each
      // repeat cycle, and each scroll-back replay — matching upstream's
      // `animate(..., { delay })` being re-supplied on every `playRef` call.
      const play = () => {
        element.style.backgroundImage = buildGradient(SWEEP_START, colorHexes, textColorHex);
        if (delay > 0) {
          pendingTimeout = setTimeout(() => {
            pendingTimeout = null;
            runSweep();
          }, delay);
        } else {
          runSweep();
        }
      };

      const startOnce = () => {
        if (hasStarted) return;
        hasStarted = true;
        play();
      };

      let intersectionObserver: IntersectionObserver | null = null;
      let handleClick: (() => void) | null = null;

      if (autoStart) {
        if (typeof IntersectionObserver !== "function") {
          // No IntersectionObserver support (e.g. a non-browser test runtime)
          // — fail open and play immediately rather than never playing.
          startOnce();
        } else {
          intersectionObserver = new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (entry.isIntersecting) {
                  if (once) {
                    startOnce();
                    intersectionObserver?.disconnect();
                    intersectionObserver = null;
                  } else {
                    // Replay on every re-entry: halt any in-flight pass and
                    // sweep again from the start, keeping the current item.
                    stop();
                    play();
                  }
                } else if (!once) {
                  // Left the viewport: stop the in-flight sweep so the next
                  // re-entry restarts cleanly (upstream's effect-cleanup stop).
                  stop();
                }
              }
            },
            { threshold: 0.1 },
          );
          intersectionObserver.observe(element);
        }
      } else {
        handleClick = () => startOnce();
        element.style.cursor = "pointer";
        element.addEventListener("click", handleClick);
      }

      node.addHook("Remove", () => {
        stop();
        intersectionObserver?.disconnect();
        if (handleClick) element.removeEventListener("click", handleClick);
      });
    },
  } as DomphyElement<"span">;
}

export { diaTextReveal };
