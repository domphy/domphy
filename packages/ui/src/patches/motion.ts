import {
  type BehaviorInstance,
  behavior,
  type PartialElement,
  type State,
} from "@domphy/core";

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

type MotionInstance = BehaviorInstance<MotionProps> & {
  play: (props: MotionProps, mode: "enter" | "update") => void;
  getExit: () => MotionKeyframe | undefined;
  getTransition: () => MotionProps["transition"];
};

const isMotionState = (value: unknown): value is State<MotionKeyframe> =>
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

function toOptions(
  transition: MotionProps["transition"] = {},
): KeyframeAnimationOptions {
  return {
    duration: transition.duration ?? 300,
    delay: transition.delay ?? 0,
    easing: transition.easing ?? "ease",
    iterations: transition.iterations ?? 1,
    fill: "both",
  };
}

/**
 * Animation primitive driven by the Web Animations API. Runs an enter
 * animation on mount (`initial` -> `animate`), re-animates whenever `animate`
 * is a `State` that changes, and plays the `exit` keyframe before removal.
 * Has no host-tag restriction; apply to any element you want to animate.
 *
 * Later generations route a fresh `animate`/`exit`/`transition` into the same
 * `behavior()` instance via `update()`, so a reused node is not stuck on
 * generation-1 keyframes.
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
function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== "function") return false;
  try {
    return matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function attachMotion(
  node: { domElement?: HTMLElement | null },
  initial: MotionProps,
): MotionInstance {
  const el = node.domElement as HTMLElement | null;
  let current = initial;
  let release: (() => void) | undefined;

  const bindAnimate = (animate: MotionProps["animate"]) => {
    release?.();
    release = undefined;
    if (!el || !isMotionState(animate)) return;
    release = animate.addListener((next: MotionKeyframe) => {
      if (prefersReducedMotion()) {
        Object.assign(el.style, toStyles(next));
      } else if (typeof el.animate === "function") {
        el.animate([toStyles(next)], toOptions(current.transition));
      }
    });
  };

  const play = (props: MotionProps, mode: "enter" | "update") => {
    if (!el) return;
    const target = isMotionState(props.animate)
      ? props.animate.get()
      : props.animate;
    if (prefersReducedMotion()) {
      if (target) Object.assign(el.style, toStyles(target));
      else if (mode === "enter" && props.initial) {
        Object.assign(el.style, toStyles(props.initial));
      }
      return;
    }
    if (typeof el.animate !== "function") return;
    if (target) {
      const frames =
        mode === "enter" && props.initial
          ? [toStyles(props.initial), toStyles(target)]
          : [toStyles(target)];
      el.animate(frames, toOptions(props.transition));
    } else if (mode === "enter" && props.initial) {
      Object.assign(el.style, toStyles(props.initial));
    }
  };

  play(initial, "enter");
  bindAnimate(initial.animate);

  return {
    play,
    getExit: () => current.exit,
    getTransition: () => current.transition,
    update(next) {
      current = next;
      play(next, "update");
      bindAnimate(next.animate);
    },
    destroy() {
      release?.();
    },
  };
}

function motion(props: MotionProps = {}): PartialElement {
  return {
    ...behavior<MotionProps>(
      "motion",
      (node, next) => attachMotion(node, next),
      props,
    ),
    _onBeforeRemove: (node, done) => {
      const el = node.domElement as HTMLElement | null;
      const inst = node.getBehavior<MotionInstance>("motion");
      const exit = inst?.getExit() ?? props.exit;
      if (!el || !exit || typeof el.animate !== "function") return done();
      if (prefersReducedMotion()) {
        Object.assign(el.style, toStyles(exit));
        return done();
      }
      el.animate(
        [toStyles(exit)],
        toOptions(inst?.getTransition() ?? props.transition),
      ).finished.then(done, done);
    },
  };
}

export { motion };
