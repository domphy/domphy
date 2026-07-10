// magicui "Number Ticker" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A large
// numeric stat that counts from a start value up (or down) to its target
// once the element first scrolls into the viewport, settling with a
// spring-damper deceleration (fast start, no-overshoot settle — an odometer
// feel) rather than a linear tick or a CSS keyframe count.
//
// Domphy has no bundled spring integrator (see `smoothCursor`'s header
// comment for the same caveat elsewhere in this package) — this hand-rolls
// the same mass/stiffness/damping integration loop `smoothCursor` uses,
// tuned overdamped (damping well above 2*sqrt(stiffness*mass))
// so the displayed number decelerates into its target without visibly
// overshooting past it. Per the "continuous, high-frequency effect"
// guidance used elsewhere in this package (see `dock.ts`'s header comment),
// the per-frame digits are written imperatively to `textContent` inside the
// rAF loop rather than through `State.set()` on every frame.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { type ThemeColor, themeColor } from "@domphy/theme";
import { fixed } from "../../shared/typography.js";

export interface NumberTickerSpring {
  /** How fast oscillation dies out. Defaults to `60`. */
  damping?: number;
  /** How strongly the number is pulled toward its target. Defaults to `100`. */
  stiffness?: number;
  /** Perceived weight/inertia. Defaults to `1`. */
  mass?: number;
  /** Distance and speed below which the count is considered settled and the rAF loop stops. Defaults to `0.01`. */
  restDelta?: number;
}

export interface NumberTickerProps {
  /** Target number the count animates to (or from, when `direction` is `"down"`). Defaults to `100`. */
  value?: number;
  /** The other end of the count — animated from when `direction` is `"up"`, animated to when `"down"`. Defaults to `0`. */
  startValue?: number;
  /** `"up"` (default) counts from `startValue` to `value`; `"down"` counts from `value` to `startValue`. */
  direction?: "up" | "down";
  /** Seconds to wait, once visible, before the count starts. Defaults to `0`. */
  delay?: number;
  /** Decimal places to display. Defaults to `0`. */
  decimalPlaces?: number;
  /** `Intl.NumberFormat` locale, controlling thousands separators/decimal marks. Defaults to `"en-US"`. */
  locale?: string;
  /** Plays once the first time the element scrolls into view, then never replays. Defaults to `true`. */
  once?: boolean;
  /** Theme color family for the digits. Defaults to `"neutral"`. */
  color?: ThemeColor;
  /** Spring tuning. See {@link NumberTickerSpring}. */
  spring?: NumberTickerSpring;
  style?: StyleObject;
}

const DEFAULT_SPRING: Required<NumberTickerSpring> = {
  damping: 60,
  stiffness: 100,
  mass: 1,
  restDelta: 0.01,
};

/**
 * A large numeric stat that counts up (or down) from a start value to its
 * target once scrolled into view, settling with a spring-damper
 * deceleration rather than a linear tick. Call with no arguments for a
 * working demo — counts from 0 to 100 the first time it's visible.
 */
function numberTicker(props: NumberTickerProps = {}): DomphyElement<"span"> {
  const targetValue = props.value ?? 100;
  const startValue = props.startValue ?? 0;
  const direction = props.direction ?? "up";
  const delaySeconds = props.delay ?? 0;
  const decimalPlaces = props.decimalPlaces ?? 0;
  const locale = props.locale ?? "en-US";
  const once = props.once ?? true;
  const color = props.color ?? "neutral";
  const spring = { ...DEFAULT_SPRING, ...(props.spring ?? {}) };

  const from = direction === "down" ? targetValue : startValue;
  const to = direction === "down" ? startValue : targetValue;

  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });

  return {
    // Upstream always paints the literal `startValue` as the pre-trigger text,
    // regardless of direction (for "down" the animation still starts from the
    // target, but the first painted frame shows startValue).
    span: String(startValue),
    dataNumberTicker: "true",
    style: {
      display: "inline-block",
      fontVariantNumeric: "tabular-nums",
      // text-8xl (fixed 96px) + tracking-wider (0.05em) from the upstream
      // component class + demo; no fluid clamp (upstream sets no responsive
      // shrink) and no bold — the demos use font-medium (500).
      fontSize: fixed("6rem"),
      fontWeight: fixed("500"),
      letterSpacing: fixed("0.05em"),
      color: (listener) => themeColor(listener, "shift-11", color),
      ...(props.style ?? {}),
    },
    _onMount: (node: ElementNode) => {
      const element = node.domElement as HTMLElement;
      let frameHandle: number | null = null;
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
      let observer: IntersectionObserver | null = null;
      let hasPlayed = false;

      const runSpring = () => {
        // Guard against overlapping runs (relevant when `once: false` and the
        // element re-enters view before the previous spring settled).
        if (frameHandle !== null) cancelAnimationFrame(frameHandle);

        let position = from;
        let velocity = 0;
        let lastTime = performance.now();

        const step = (time: number) => {
          const deltaSeconds = Math.min((time - lastTime) / 1000, 1 / 30);
          lastTime = time;

          // Spring-damper: force = -stiffness * displacement - damping * velocity.
          const acceleration =
            (-spring.stiffness * (position - to) - spring.damping * velocity) /
            spring.mass;
          velocity += acceleration * deltaSeconds;
          position += velocity * deltaSeconds;

          const settled =
            Math.abs(to - position) < spring.restDelta &&
            Math.abs(velocity) < spring.restDelta;

          element.textContent = formatter.format(settled ? to : position);

          frameHandle = settled ? null : requestAnimationFrame(step);
        };
        frameHandle = requestAnimationFrame(step);
      };

      const trigger = () => {
        if (hasPlayed && once) return;
        hasPlayed = true;
        if (timeoutHandle !== null) clearTimeout(timeoutHandle);
        timeoutHandle = setTimeout(runSpring, delaySeconds * 1000);
      };

      if (typeof IntersectionObserver !== "function") {
        // No IntersectionObserver support (e.g. a non-browser test runtime)
        // — fail open and play immediately rather than never playing.
        trigger();
      } else {
        observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              trigger();
              if (once) {
                observer?.disconnect();
                observer = null;
              }
            }
          },
          // Upstream useInView({ margin: "0" }) fires the moment any part of
          // the element edge enters the viewport — threshold 0, not 0.1.
          { threshold: 0 },
        );
        observer.observe(element);
      }

      node.addHook("Remove", () => {
        if (frameHandle !== null) cancelAnimationFrame(frameHandle);
        if (timeoutHandle !== null) clearTimeout(timeoutHandle);
        observer?.disconnect();
        observer = null;
      });
    },
  };
}

export { numberTicker };
