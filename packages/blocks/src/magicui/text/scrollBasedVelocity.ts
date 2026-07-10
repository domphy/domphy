// magicui "Scroll Based Velocity" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied).
// One or more full-width rows of repeated text, each auto-scrolling
// sideways at a constant base speed. Scrolling the page multiplies the base
// speed by a bounded factor (1x–6x, proportional to smoothed scroll velocity)
// and latches each row's direction to the sign of the scroll: scrolling one
// way runs a row in its base direction, scrolling the other way reverses it
// and the reversal persists until the user scrolls back. The number of
// duplicated copies is computed from the container/content widths so the
// track always fills the viewport. Under `prefers-reduced-motion` the base
// marquee keeps running, but the scroll-driven acceleration is switched off
// (speed multiplier forced to 1). Rows pause while off-screen or while the
// tab is hidden. Text is not selectable while scrolling.

import type {
  DomphyElement,
  ElementNode,
  State,
  StyleObject,
} from "@domphy/core";
import { toState } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { strong } from "@domphy/ui";

export interface ScrollVelocityRow {
  /** Text or arbitrary node repeated along the row. Strings get the default large/bold treatment; nodes render as-is. */
  content?: string | DomphyElement;
  /** Base scroll direction for this row. Defaults to alternating ("left" on even rows, "right" on odd). */
  direction?: "left" | "right";
}

export interface ScrollBasedVelocityProps {
  /** Explicit row list. Overrides `rowCount` when provided. */
  rows?: ScrollVelocityRow[];
  /** Number of default demo rows to render when `rows` is omitted. Defaults to 2. */
  rowCount?: number;
  /** Base scroll speed. Roughly "percent of one content copy's width per second". Defaults to 5. */
  baseVelocity?: number;
  /** Multiplies the base speed with page scroll velocity and latches row direction to the scroll sign. Defaults to true. */
  scrollReactive?: boolean;
  /** Gap between repeated copies, in `themeSpacing` units. Defaults to 8. */
  gap?: number;
  /** Gap between rows, in `themeSpacing` units. Defaults to 6. */
  rowGap?: number;
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

const DEFAULT_PHRASES = [
  "BUILD SOMETHING GREAT • ",
  "SHIP FAST, SHIP OFTEN • ",
];

// Tuning constants for the JS-driven motion loop. Not theme values — these
// scale a physics simulation, not layout — so they stay as plain numbers.
const MAX_DELTA_SECONDS = 1 / 20; // clamp so a stalled tab doesn't jump the loop on resume
// Spring smoothing of raw scroll velocity (mass 1, overdamped — no overshoot),
// matching the damping/stiffness used to smooth the scroll velocity upstream.
const SPRING_STIFFNESS = 400;
const SPRING_DAMPING = 50;
// Scroll velocity (px/s) that maps to the maximum acceleration factor of 5.
const VELOCITY_AT_MAX_FACTOR = 1000;
const MAX_VELOCITY_FACTOR = 5;

interface RowRuntime {
  /** Fixed base direction as a sign: +1 = scrolls left, -1 = scrolls right. */
  baseDirection: number;
  /** Latched current direction: base * sign(scroll), persists after scrolling stops. */
  currentDirection: number;
  trackElement: HTMLElement | null;
  containerElement: HTMLElement | null;
  resizeObserver: ResizeObserver | null;
  /** Distance between the start of one copy and the next (block width + gap). */
  unitWidth: number;
  /** Position accumulator; the track is translated by -wrap(0, unitWidth, baseX). */
  baseX: number;
  /** Reactive copy count so the track can re-fill the viewport when it resizes. */
  copies: State<number>;
}

/** Modulo that always lands in [min, max) even for negative values. */
function wrap(min: number, max: number, value: number): number {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

/** Default repeating unit for string content: large, bold, uppercase-style display text. */
function defaultTextNode(text: string): DomphyElement {
  return { strong: text, $: [strong({ color: "neutral" })] } as DomphyElement;
}

function rowElement(
  row: ScrollVelocityRow,
  runtime: RowRuntime,
  index: number,
  gapUnits: number,
): DomphyElement<"div"> {
  const content =
    row.content && typeof row.content !== "string"
      ? row.content
      : defaultTextNode(
          typeof row.content === "string"
            ? row.content
            : DEFAULT_PHRASES[index % DEFAULT_PHRASES.length],
        );

  const track: DomphyElement<"div"> = {
    // Copy count is reactive: it starts at a viewport-agnostic minimum and is
    // recomputed from measured container/content widths on mount and resize.
    div: (listener) =>
      Array.from(
        { length: runtime.copies.get(listener) },
        (_unused, copyIndex) => ({
          div: [{ ...content }],
          _key: `copy-${copyIndex}`,
          // Only the first copy is real content — the rest exist purely to make
          // the loop seamless and should not be announced twice.
          ariaHidden: copyIndex === 0 ? undefined : "true",
          style: {
            display: "inline-flex",
            alignItems: "center",
            flexShrink: 0,
            whiteSpace: "nowrap",
          },
        }),
      ) as DomphyElement[],
    dataSize: "increase-6",
    _key: "track",
    style: {
      display: "flex",
      alignItems: "center",
      width: "max-content",
      gap: themeSpacing(gapUnits),
      willChange: "transform",
      // Text should not be selectable while the row scrolls.
      userSelect: "none",
    },
    _onMount: (node: ElementNode) => {
      const element = node.domElement as HTMLElement;
      runtime.trackElement = element;
      runtime.containerElement = element.parentElement;
      const measure = () => {
        const first = element.children[0] as HTMLElement | undefined;
        const second = element.children[1] as HTMLElement | undefined;
        if (!first) return;
        // Pitch = distance from one copy's start to the next (block + gap), so
        // the seam stays exact regardless of the inter-copy gap.
        runtime.unitWidth = second
          ? second.offsetLeft - first.offsetLeft
          : first.scrollWidth;
        const containerWidth = runtime.containerElement?.offsetWidth ?? 0;
        const nextCopies =
          runtime.unitWidth > 0
            ? Math.max(3, Math.ceil(containerWidth / runtime.unitWidth) + 2)
            : 3;
        if (nextCopies !== runtime.copies.get()) runtime.copies.set(nextCopies);
      };
      measure();
      if (typeof ResizeObserver !== "undefined") {
        runtime.resizeObserver = new ResizeObserver(measure);
        runtime.resizeObserver.observe(element);
        if (runtime.containerElement)
          runtime.resizeObserver.observe(runtime.containerElement);
      }
    },
    _onRemove: () => {
      runtime.resizeObserver?.disconnect();
      runtime.resizeObserver = null;
      runtime.trackElement = null;
      runtime.containerElement = null;
    },
  };

  return {
    div: [track],
    _key: `row-${index}`,
    style: {
      width: "100%",
      overflow: "hidden",
      whiteSpace: "nowrap",
    },
  };
}

/**
 * One or more edge-to-edge marquee rows whose scroll speed responds to how
 * fast the user scrolls the page (a bounded 1x–6x multiplier) and whose
 * direction latches to the scroll sign. Call with no arguments for a working
 * demo — two rows of display text drifting in opposite directions.
 */
function scrollBasedVelocity(
  props: ScrollBasedVelocityProps = {},
): DomphyElement<"div"> {
  const rowCount = Math.max(1, Math.round(props.rowCount ?? 2));
  const rows: ScrollVelocityRow[] =
    props.rows ??
    Array.from({ length: rowCount }, (_unused, index) => ({
      direction: index % 2 === 0 ? "left" : ("right" as const),
    }));
  const baseVelocity = props.baseVelocity ?? 5;
  const scrollReactive = props.scrollReactive ?? true;
  const gapUnits = props.gap ?? 8;
  const rowGapUnits = props.rowGap ?? 6;

  const runtimes: RowRuntime[] = rows.map((row, index) => {
    // "left" scrolls the content leftward (baseX grows, translate goes
    // negative); "right" is the mirror.
    const baseDirection =
      (row.direction ?? (index % 2 === 0 ? "left" : "right")) === "right"
        ? -1
        : 1;
    return {
      baseDirection,
      currentDirection: baseDirection,
      trackElement: null,
      containerElement: null,
      resizeObserver: null,
      unitWidth: 0,
      baseX: 0,
      copies: toState(3),
    };
  });

  return {
    div: rows.map((row, index) =>
      rowElement(row, runtimes[index], index, gapUnits),
    ),
    style: {
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(rowGapUnits),
      overflow: "hidden",
      width: "100%",
      ...(props.style ?? {}),
    },
    _onMount: (node: ElementNode) => {
      if (
        typeof window === "undefined" ||
        typeof window.requestAnimationFrame !== "function"
      )
        return;

      const reducedMotionQuery =
        typeof window.matchMedia === "function"
          ? window.matchMedia("(prefers-reduced-motion: reduce)")
          : null;
      let prefersReducedMotion = reducedMotionQuery?.matches ?? false;
      const handleReducedMotionChange = () => {
        prefersReducedMotion = reducedMotionQuery?.matches ?? false;
      };
      reducedMotionQuery?.addEventListener?.(
        "change",
        handleReducedMotionChange,
      );

      let isTabVisible = document.visibilityState !== "hidden";
      let isInViewport = true;
      let lastTimestamp: number | null = null;
      let lastScrollY = window.scrollY;
      // Spring state smoothing the raw scroll velocity (px/s).
      let smoothedVelocity = 0;
      let springVelocity = 0;
      let animationFrameId: number | null = null;

      const handleVisibilityChange = () => {
        isTabVisible = document.visibilityState !== "hidden";
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);

      let intersectionObserver: IntersectionObserver | null = null;
      if (typeof IntersectionObserver !== "undefined") {
        intersectionObserver = new IntersectionObserver((entries) => {
          const entry = entries[0];
          if (entry) isInViewport = entry.isIntersecting;
        });
        intersectionObserver.observe(node.domElement as HTMLElement);
      }

      const tick = (timestamp: number) => {
        // Belt-and-suspenders: bail without rescheduling once the container
        // is no longer in the document, even if the IntersectionObserver
        // above never fires (e.g. unsupported in a test runtime, or the
        // framework's own "Remove" hook didn't run because of a raw DOM
        // wipe) — otherwise this loop runs forever.
        if (!(node.domElement as HTMLElement).isConnected) return;
        if (lastTimestamp === null) lastTimestamp = timestamp;
        const deltaSeconds = Math.min(
          (timestamp - lastTimestamp) / 1000,
          MAX_DELTA_SECONDS,
        );
        lastTimestamp = timestamp;

        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - lastScrollY;
        lastScrollY = currentScrollY;
        const rawVelocity = deltaSeconds > 0 ? scrollDelta / deltaSeconds : 0;
        // Overdamped spring: tracks fresh scroll velocity, settles smoothly
        // back to zero once scrolling stops (semi-implicit Euler).
        const acceleration =
          -SPRING_STIFFNESS * (smoothedVelocity - rawVelocity) -
          SPRING_DAMPING * springVelocity;
        springVelocity += acceleration * deltaSeconds;
        smoothedVelocity += springVelocity * deltaSeconds;

        // velocityFactor: signed, bounded to [-5, 5]. Disabled entirely when
        // the row is not scroll-reactive.
        const velocityFactor = scrollReactive
          ? (smoothedVelocity < 0 ? -1 : 1) *
            Math.min(
              MAX_VELOCITY_FACTOR,
              (Math.abs(smoothedVelocity) / VELOCITY_AT_MAX_FACTOR) *
                MAX_VELOCITY_FACTOR,
            )
          : 0;
        const absVelocityFactor = Math.min(
          MAX_VELOCITY_FACTOR,
          Math.abs(velocityFactor),
        );
        // Bounded multiplicative speed-up (1x at rest → up to 6x). Reduced
        // motion keeps the base marquee running but drops the acceleration.
        const speedMultiplier = prefersReducedMotion
          ? 1
          : 1 + absVelocityFactor;

        if (isTabVisible && isInViewport) {
          for (const runtime of runtimes) {
            // Latch direction to the scroll sign once the scroll is decisive;
            // the reversal persists after scrolling stops until the user
            // scrolls the other way.
            if (absVelocityFactor > 0.1) {
              const scrollSign = velocityFactor >= 0 ? 1 : -1;
              runtime.currentDirection = runtime.baseDirection * scrollSign;
            }

            if (!runtime.trackElement || runtime.unitWidth <= 0) continue;

            const pixelsPerSecond = (runtime.unitWidth * baseVelocity) / 100;
            runtime.baseX +=
              runtime.currentDirection *
              pixelsPerSecond *
              speedMultiplier *
              deltaSeconds;

            const translateX = -wrap(0, runtime.unitWidth, runtime.baseX);
            runtime.trackElement.style.transform = `translateX(${translateX}px)`;
          }
        }

        animationFrameId = window.requestAnimationFrame(tick);
      };
      animationFrameId = window.requestAnimationFrame(tick);

      node.addHook("Remove", () => {
        if (animationFrameId !== null)
          window.cancelAnimationFrame(animationFrameId);
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
        reducedMotionQuery?.removeEventListener?.(
          "change",
          handleReducedMotionChange,
        );
        intersectionObserver?.disconnect();
      });
    },
  };
}

export { scrollBasedVelocity };
