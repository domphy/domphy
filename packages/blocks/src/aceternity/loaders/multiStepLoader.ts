// Aceternity UI "Multi-Step Loader" — clean-room reimplementation.
//
// A full-screen overlay that walks through an ordered list of labeled steps,
// automatically advancing and marking each as done, for use behind
// long-running operations. Implemented purely from the block's public
// functional/visual spec — no upstream Aceternity source was viewed or
// copied.
//
// The overlay is always mounted (never conditionally added/removed from the
// tree); `loading` toggles its `opacity`/`pointerEvents`/`visibility`
// reactively, the same "always-present, CSS-toggled" approach `dialog.ts`
// uses for its own open/close fade (minus native `<dialog>` semantics, which
// this component doesn't need). `loading`/`value` are both accepted as
// `ValueOrState` and passed straight through `toState()`, which returns the
// SAME `State` reference when the caller already supplied one — so the
// built-in close button's `state.set(false)` is directly observable by a
// caller who wired a shared `State<boolean>` in, without any extra `onClose`
// plumbing (an `onClose` callback is offered too, for callers who passed a
// plain boolean and can't observe the internal state directly).
//
// Auto-advance is driven by `watch()` on the loading state (start/stop a
// `setInterval` as it flips), not a CSS animation loop — the active index is
// plain reactive `State<number>`, and every row's icon/text/opacity is
// recomputed from its own distance to that index. The step column's
// `translateY` is likewise a reactive function of the active index, giving
// the "list scrolls upward to keep the current step anchored" effect via a
// single CSS `transition` rather than a JS tween.
import type { DomphyElement, ElementNode, Listener, State, StyleObject, ValueOrState } from "@domphy/core";
import { toState, watch } from "@domphy/core";
import { strong } from "@domphy/ui";
import { themeColor, themeDensity, themeSize, themeSpacing } from "@domphy/theme";

export interface MultiStepLoaderStep {
  /** Label text describing this step. */
  text: string;
}

export interface MultiStepLoaderProps {
  /** Ordered steps walked through. Defaults to an 8-step placeholder sequence. */
  loadingStates?: MultiStepLoaderStep[];
  /** Controls whether the overlay is mounted/visible. Accepts a value or reactive state. Defaults to `false`. */
  loading?: ValueOrState<boolean>;
  /** Milliseconds between automatic step advances. Defaults to `2000`. */
  duration?: number;
  /** Restart from the first step after the last one. Defaults to `true`. */
  loop?: boolean;
  /** Manually controls the active step index, overriding the internal auto-advance timer, when provided. */
  value?: ValueOrState<number>;
  /** Called when the built-in close button is pressed (in addition to setting `loading` to `false`). */
  onClose?: () => void;
}

const DEFAULT_STEPS: MultiStepLoaderStep[] = [
  { text: "Buying a condo" },
  { text: "Travelling in a flight" },
  { text: "Meeting Tyler Durden" },
  { text: "He makes soap" },
  { text: "We goto a bar" },
  { text: "Start a fight" },
  { text: "We like it" },
  { text: "Welcome to Fight Club" },
];

// Approximate row height (icon + gap + text + block padding), in `themeSpacing`
// units — used only to compute the column's scroll-anchoring `translateY`.
const ROW_HEIGHT_UNITS = 11;

/** Outlined circular checkmark, used for every row — "filled" (passed/current)
 * vs "outline" (upcoming) is read from stroke-weight/color/opacity rather than
 * a second hardcoded fill color, so the icon never needs a literal color. */
function stepCheckGlyph(strokeWidth: string): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [
          { circle: null, cx: "12", cy: "12", r: "9" },
          { polyline: null, points: "8 12 11 15 16 9" },
        ],
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    ariaHidden: "true",
    style: { display: "inline-flex", flexShrink: "0", width: themeSpacing(6), height: themeSpacing(6) },
  };
}

/** Small square close ("X") button pinned to the overlay's top-right corner. */
function closeButton(onClose: () => void): DomphyElement<"button"> {
  return {
    button: [
      {
        svg: [
          { line: null, x1: "5", y1: "5", x2: "15", y2: "15" },
          { line: null, x1: "15", y1: "5", x2: "5", y2: "15" },
        ],
        viewBox: "0 0 20 20",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    type: "button",
    ariaLabel: "Close",
    style: {
      position: "absolute",
      top: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
      right: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: themeSpacing(8),
      height: themeSpacing(8),
      appearance: "none",
      cursor: "pointer",
      backgroundColor: "transparent",
      borderRadius: themeSpacing(1.5),
      border: (listener: Listener) => `1px solid ${themeColor(listener, "shift-6")}`,
      color: (listener: Listener) => themeColor(listener, "shift-14"),
    } as StyleObject,
    onClick: onClose,
  };
}

/** One step row: icon + label, both reactively styled from this row's distance
 * to the currently active index. */
function stepRow(step: MultiStepLoaderStep, index: number, activeIndex: State<number>): DomphyElement<"div"> {
  const relative = (listener: Listener): number => index - activeIndex.get(listener);

  const opacity = (listener: Listener): number => {
    const distance = relative(listener);
    if (distance <= 0) return 1;
    return Math.max(0, 1 - distance * 0.3);
  };

  const label = (listener: Listener): (string | DomphyElement)[] =>
    relative(listener) === 0
      ? [{ strong: step.text, $: [strong({ color: "neutral" })] } as DomphyElement<"strong">]
      : [step.text];

  const textColor = (listener: Listener): string => {
    const distance = relative(listener);
    if (distance < 0) return themeColor(listener, "shift-6"); // passed: muted gray
    if (distance === 0) return themeColor(listener, "shift-15"); // current: near-black
    return themeColor(listener, "shift-3"); // upcoming: light gray, fades via opacity
  };

  return {
    div: [
      { span: (listener: Listener) => [stepCheckGlyph(relative(listener) === 0 ? "2.5" : "1.5")], style: { display: "inline-flex" } },
      { span: label, style: { display: "inline-flex" } },
    ],
    _key: `multi-step-loader-row-${index}`,
    style: {
      display: "flex",
      alignItems: "center",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 0.75),
      fontSize: (listener: Listener) => themeSize(listener, "inherit"),
      color: textColor,
      opacity,
      transition: "opacity 300ms ease, color 300ms ease",
    } as StyleObject,
  };
}

/**
 * A full-screen frosted overlay that walks through `loadingStates` one at a
 * time, auto-advancing on a timer (or under manual `value` control) and
 * showing a dismiss button in the corner. Mounted whenever `loading` is
 * truthy. Call with no arguments for a working demo (mount it and flip
 * `loading` to `true` to see it advance through 8 placeholder steps).
 */
function multiStepLoader(props: MultiStepLoaderProps = {}): DomphyElement<"div"> {
  const steps = props.loadingStates && props.loadingStates.length > 0 ? props.loadingStates : DEFAULT_STEPS;
  const duration = props.duration ?? 2000;
  const loop = props.loop ?? true;
  const loadingState = toState(props.loading ?? false, "loading");
  const manuallyControlled = props.value !== undefined;
  const activeIndex = manuallyControlled ? toState(props.value as ValueOrState<number>, "activeIndex") : toState(0, "activeIndex");

  const close = () => {
    loadingState.set(false);
    props.onClose?.();
  };

  return {
    div: [
      closeButton(close),
      {
        div: [
          {
            div: steps.map((step, index) => stepRow(step, index, activeIndex)),
            style: {
              display: "flex",
              flexDirection: "column",
              transform: (listener: Listener) =>
                `translateY(calc(${-activeIndex.get(listener)} * ${themeSpacing(ROW_HEIGHT_UNITS)}))`,
              transition: "transform 500ms cubic-bezier(0.16, 1, 0.3, 1)",
            } as StyleObject,
          },
        ],
        style: {
          position: "relative",
          overflow: "hidden",
          maxHeight: themeSpacing(ROW_HEIGHT_UNITS * 5),
          maskImage: "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 15%, black 85%, transparent)",
        },
      },
    ],
    role: "status",
    ariaLabel: "Loading",
    dataTone: "shift-2",
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backdropFilter: "blur(6px)",
      backgroundColor: (listener: Listener) => `color-mix(in srgb, ${themeColor(listener, "inherit")} 65%, transparent)`,
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      opacity: (listener: Listener) => (loadingState.get(listener) ? 1 : 0),
      visibility: (listener: Listener) => (loadingState.get(listener) ? "visible" : "hidden"),
      pointerEvents: (listener: Listener) => (loadingState.get(listener) ? "auto" : "none"),
      transition: "opacity 300ms ease, visibility 300ms ease",
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (manuallyControlled) return;
      let timer: ReturnType<typeof setInterval> | null = null;

      const start = () => {
        if (timer) return;
        activeIndex.set(0);
        timer = setInterval(() => {
          const current = activeIndex.get();
          if (current >= steps.length - 1) {
            if (loop) {
              activeIndex.set(0);
            } else if (timer) {
              clearInterval(timer);
              timer = null;
            }
          } else {
            activeIndex.set(current + 1);
          }
        }, duration);
      };
      const stop = () => {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      };

      const disposeWatch = watch(loadingState, (isLoading) => (isLoading ? start() : stop()), { immediate: true });
      node.addHook("Remove", () => {
        stop();
        disposeWatch();
      });
    },
  };
}

export { multiStepLoader };
