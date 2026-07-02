// magicui "Dia Text Reveal" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). Plain
// text that rests in a solid final color, but the first time it scrolls
// into view a multicolor gradient band sweeps across it once — clipped to
// the glyph shapes via `background-clip: text` — like a brief foil-shine
// passing over metallic text, before the layer fades out to reveal the
// plain solid color underneath, permanently. Can optionally cycle through a
// list of strings, sweeping each one in with a pause between, looping.
//
// Two stacked copies of the same text (the well-established "twin-layer"
// technique already used by sibling text blocks in this file, e.g.
// `sparklesText`): a plain solid-color base layer that is always the
// visible resting state, and a gradient-clipped sweep layer stacked exactly
// on top whose opacity and CSS `animation` are both bound to a reactive
// "is sweeping" flag — so the sweep only exists (visually and
// computationally) while actually playing, then disappears to reveal the
// base layer beneath. Trigger timing (view-entry delay, sweep duration,
// inter-item pause, looping) is plain JS `setTimeout` sequencing, not a
// fixed CSS timeline.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { hashString, toState } from "@domphy/core";
import { type ThemeColor, themeColor } from "@domphy/theme";

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

let diaTextRevealInstanceCounter = 0;

/**
 * Text that rests in a solid final color but is swept once by a moving
 * multicolor gradient band the first time it scrolls into view — a brief
 * foil-shine "light sweep" — before settling. Optionally cycles through a
 * list of strings, sweeping each in turn. Call with no arguments for a
 * working demo.
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

  const instanceId = ++diaTextRevealInstanceCounter;
  const keyframes = { "0%": { backgroundPosition: "0% 0" }, "100%": { backgroundPosition: "300% 0" } };
  const animationName = `dia-text-reveal-sweep-${hashString(JSON.stringify({ instanceId, duration }))}`;

  const currentText = toState(items[0]);
  const isSweeping = toState(false);

  const longestItemLength = items.reduce((max, item) => Math.max(max, item.length), 0);

  const gradientTextLayer: DomphyElement<"span"> = {
    span: (listener: Listener) => currentText.get(listener),
    ariaHidden: "true",
    style: {
      position: "absolute",
      insetBlockStart: 0,
      insetInlineStart: 0,
      whiteSpace: "nowrap",
      opacity: (listener: Listener) => (isSweeping.get(listener) ? 1 : 0),
      backgroundImage: (listener: Listener) =>
        `linear-gradient(90deg, ${colors.map((color) => themeColor(listener, "shift-8", color)).join(", ")})`,
      backgroundSize: "300% 100%",
      backgroundRepeat: "no-repeat",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      color: "transparent",
      transition: "opacity 150ms ease",
      animation: (listener: Listener) =>
        isSweeping.get(listener) ? `${animationName} ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) 1 both` : "none",
      [`@keyframes ${animationName}`]: keyframes,
    } as StyleObject,
  };

  const baseTextLayer: DomphyElement<"span"> = {
    span: (listener: Listener) => currentText.get(listener),
    style: {
      position: "relative",
      whiteSpace: "nowrap",
      color: (listener: Listener) => themeColor(listener, "shift-11", finalColor),
    },
  };

  return {
    span: [baseTextLayer, gradientTextLayer],
    style: {
      position: "relative",
      display: "inline-block",
      ...(reserveWidth ? { minWidth: `${longestItemLength}ch` } : {}),
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const element = node.domElement as HTMLElement;
      // Bare (non `window.`-qualified) timer functions: with both DOM and
      // Node ambient globals in scope, `window.setTimeout`'s return type
      // resolves inconsistently against `ReturnType<typeof window.setTimeout>`
      // depending on call-site vs type-query context — the bare globals
      // resolve to a single consistent type instead (same fix already
      // applied to `sparklesText` elsewhere in this package).
      const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();
      let itemIndex = 0;
      let hasStarted = false;

      const runSweep = () => {
        isSweeping.set(true);
        const sweepTimeout = setTimeout(() => {
          pendingTimeouts.delete(sweepTimeout);
          isSweeping.set(false);
          const isLastItem = itemIndex === items.length - 1;
          if (isLastItem && !repeat) return;
          const pauseTimeout = setTimeout(() => {
            pendingTimeouts.delete(pauseTimeout);
            itemIndex = (itemIndex + 1) % items.length;
            currentText.set(items[itemIndex]);
            runSweep();
          }, pauseBetween);
          pendingTimeouts.add(pauseTimeout);
        }, duration);
        pendingTimeouts.add(sweepTimeout);
      };

      const beginSequence = () => {
        if (hasStarted) return;
        hasStarted = true;
        const startTimeout = setTimeout(runSweep, delay);
        pendingTimeouts.add(startTimeout);
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
            { threshold: 0.2 },
          );
          intersectionObserver.observe(element);
        }
      } else {
        handleClick = () => beginSequence();
        element.style.cursor = "pointer";
        element.addEventListener("click", handleClick);
      }

      node.addHook("Remove", () => {
        for (const timeout of pendingTimeouts) clearTimeout(timeout);
        pendingTimeouts.clear();
        intersectionObserver?.disconnect();
        if (handleClick) element.removeEventListener("click", handleClick);
      });
    },
  } as DomphyElement<"span">;
}

export { diaTextReveal };
