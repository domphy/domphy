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
import { behavior } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeLetterSpacing,
  themeSize,
  themeWeight,
} from "@domphy/theme";
import { prefersReducedMotion } from "../reducedMotion.js";

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
      // component class + demo, made fluid: @domphy/theme's type scale has 8
      // fixed steps topping out at --fontSize-7 = 3.0625rem (49px)
      // (packages/theme/src/size.ts, `Math.min(7, ...)`), 96% short of
      // upstream's fixed 6rem (96px) hero size — and a fixed 96px is also
      // too large on a narrow viewport regardless. clamp() floors at the
      // theme's own top step (still theme-owned — follows a custom type
      // scale or dark-mode token edits) and grows to upstream's 6rem cap as
      // the viewport widens. Slope/intercept via the same Utopia-style
      // px-at-16px/em formula `themeFluidSpacing()` uses (packages/theme/src/theme.ts),
      // hand-solved here because the min bound is a var() token, not a
      // themeFluidSpacing() numeric U-unit: MEASURED interpolating 49px at
      // 320px viewport to 96px at 1280px viewport → slope (96-49)/(1280-320)*100
      // = 4.8958vw, intercept (49 - 4.8958*320/100)/16 = 2.0833em. No bold —
      // the demos use font-medium (500). Upstream paints `text-black`, so
      // the tone sits at the dark edge of the ramp.
      fontSize: (l) =>
        `clamp(${themeSize(l, "increase-7")}, 2.0833em + 4.8958vw, 6rem)`,
      fontWeight: themeWeight("medium"),
      letterSpacing: themeLetterSpacing("wider"),
      color: (listener) => themeColor(listener, "shift-14", color),
      ...(props.style ?? {}),
    },
    ...behavior<{
      from: number;
      to: number;
      delaySeconds: number;
      once: boolean;
      spring: Required<NumberTickerSpring>;
      formatter: Intl.NumberFormat;
    }>("magicui-number-ticker", attachNumberTicker, {
      from,
      to,
      delaySeconds,
      once,
      spring,
      formatter,
    }),
  } as DomphyElement<"span">;
}

function attachNumberTicker(
  node: ElementNode,
  initialProps: {
    from: number;
    to: number;
    delaySeconds: number;
    once: boolean;
    spring: Required<NumberTickerSpring>;
    formatter: Intl.NumberFormat;
  },
) {
  let props = initialProps;
  const element = node.domElement as HTMLElement;
  let frameHandle: number | null = null;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  let observer: IntersectionObserver | null = null;
  let hasPlayed = false;

  const runSpring = () => {
    if (frameHandle !== null) cancelAnimationFrame(frameHandle);

    // WCAG 2.3.3: the count-up is a decorative transition between two states.
    // Under reduce the destination value is presented directly — the number
    // is the content, so it must still appear, it just doesn't animate there.
    if (prefersReducedMotion()) {
      element.textContent = props.formatter.format(props.to);
      frameHandle = null;
      return;
    }

    let position = props.from;
    let velocity = 0;
    let lastTime = performance.now();

    const step = (time: number) => {
      const deltaSeconds = Math.min((time - lastTime) / 1000, 1 / 30);
      lastTime = time;

      const acceleration =
        (-props.spring.stiffness * (position - props.to) -
          props.spring.damping * velocity) /
        props.spring.mass;
      velocity += acceleration * deltaSeconds;
      position += velocity * deltaSeconds;

      const settled =
        Math.abs(props.to - position) < props.spring.restDelta &&
        Math.abs(velocity) < props.spring.restDelta;

      element.textContent = props.formatter.format(
        settled ? props.to : position,
      );

      frameHandle = settled ? null : requestAnimationFrame(step);
    };
    frameHandle = requestAnimationFrame(step);
  };

  const trigger = () => {
    if (hasPlayed && props.once) return;
    hasPlayed = true;
    if (timeoutHandle !== null) clearTimeout(timeoutHandle);
    timeoutHandle = setTimeout(runSpring, props.delaySeconds * 1000);
  };

  if (typeof IntersectionObserver !== "function") {
    trigger();
  } else {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          trigger();
          if (props.once) {
            observer?.disconnect();
            observer = null;
          }
        }
      },
      { threshold: 0 },
    );
    observer.observe(element);
  }

  return {
    update(next: typeof initialProps) {
      props = next;
    },
    destroy() {
      if (frameHandle !== null) cancelAnimationFrame(frameHandle);
      if (timeoutHandle !== null) clearTimeout(timeoutHandle);
      observer?.disconnect();
      observer = null;
    },
  };
}

export { numberTicker };
