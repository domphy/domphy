import type { PartialElement, State } from "@domphy/core";

/**
 * One keyframe. Shorthands `x`/`y` (px), `scale`, `rotate` (deg) compose into a
 * single `transform`; any other key is a raw CSS property (e.g. `opacity`,
 * `backgroundColor`).
 */
export type MotionKeyframe = {
  x?: number | string;
  y?: number | string;
  scale?: number | string;
  rotate?: number | string;
} & Record<string, string | number>;

export interface MotionProps {
  /** Starting keyframe applied before the enter animation. */
  initial?: MotionKeyframe;
  /** Target keyframe. Pass a `State` to re-animate whenever it changes. */
  animate?: MotionKeyframe | State<MotionKeyframe>;
  /** Keyframe animated to before the element is removed. */
  exit?: MotionKeyframe;
  transition?: {
    /** ms, default 300. */
    duration?: number;
    /** ms, default 0. */
    delay?: number;
    /** CSS easing, default "ease". */
    easing?: string;
    iterations?: number;
  };
}

const isState = (value: unknown): value is State<MotionKeyframe> =>
  !!value &&
  typeof (value as State<MotionKeyframe>).get === "function" &&
  (value as { _isState?: boolean })._isState === true;

const toStyles = (frame: MotionKeyframe): Keyframe => {
  const out: Record<string, string | number> = {};
  const transforms: string[] = [];
  for (const key in frame) {
    const value = frame[key];
    if (key === "x") {
      transforms.push(
        `translateX(${typeof value === "number" ? `${value}px` : value})`,
      );
    } else if (key === "y") {
      transforms.push(
        `translateY(${typeof value === "number" ? `${value}px` : value})`,
      );
    } else if (key === "scale") {
      transforms.push(`scale(${value})`);
    } else if (key === "rotate") {
      transforms.push(
        `rotate(${typeof value === "number" ? `${value}deg` : value})`,
      );
    } else {
      out[key] = value;
    }
  }
  if (transforms.length) out.transform = transforms.join(" ");
  return out as Keyframe;
};

/**
 * Animation primitive driven by the Web Animations API. Runs an enter
 * animation on mount (`initial` -> `animate`), re-animates whenever `animate`
 * is a `State` that changes, and plays the `exit` keyframe before removal.
 * Has no host-tag restriction; apply to any element you want to animate.
 *
 * @param props - Optional configuration (see {@link MotionProps}).
 * @param props.initial - Starting keyframe applied before the enter animation.
 * @param props.animate - Target keyframe, or a `State` to re-animate on change.
 * @param props.exit - Keyframe animated to before the element is removed.
 * @param props.transition - Timing options.
 * @param props.transition.duration - Duration in ms. Defaults to `300`.
 * @param props.transition.delay - Delay in ms. Defaults to `0`.
 * @param props.transition.easing - CSS easing. Defaults to `"ease"`.
 * @param props.transition.iterations - Number of iterations. Defaults to `1`.
 * @example { div: "Hello", $: [motion({ initial: { opacity: 0 }, animate: { opacity: 1 } })] }
 */
function motion(props: MotionProps = {}): PartialElement {
  const { initial, animate, exit, transition = {} } = props;
  const options: KeyframeAnimationOptions = {
    duration: transition.duration ?? 300,
    delay: transition.delay ?? 0,
    easing: transition.easing ?? "ease",
    iterations: transition.iterations ?? 1,
    fill: "both",
  };

  return {
    _onMount: (node) => {
      const el = node.domElement as HTMLElement | null;
      if (!el || typeof el.animate !== "function") return;
      const target = isState(animate) ? animate.get() : animate;
      if (target) {
        el.animate(
          initial ? [toStyles(initial), toStyles(target)] : [toStyles(target)],
          options,
        );
      } else if (initial) {
        Object.assign(el.style, toStyles(initial));
      }
      if (isState(animate)) {
        const release = animate.addListener((next: MotionKeyframe) => {
          el.animate([toStyles(next)], options);
        });
        node.setMetadata("motionRelease", release);
      }
    },
    _onBeforeRemove: (node, done) => {
      const el = node.domElement as HTMLElement | null;
      if (!el || !exit || typeof el.animate !== "function") return done();
      el.animate([toStyles(exit)], options).finished.then(done, done);
    },
    _onRemove: (node) => {
      const release = node.getMetadata("motionRelease") as
        | (() => void)
        | undefined;
      release?.();
    },
  };
}

export { motion };
