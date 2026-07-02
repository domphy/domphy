// magicui "Scroll Based Velocity" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied).
// One or more full-width rows of repeated text, each auto-scrolling
// sideways at a constant base speed. Scrolling the page adds a smoothed,
// decaying velocity contribution on top of the base speed (so rows visibly
// speed up — or momentarily reverse — while the page scrolls) plus a small
// skew proportional to that velocity for a sense of inertia. Rows pause
// while off-screen or while the tab is hidden, and the whole effect is
// skipped under `prefers-reduced-motion`.

import type {
  DomphyElement,
  ElementNode,
  Listener,
  StyleObject,
} from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";
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
  /** Multiplies/decays with page scroll speed to accelerate, skew, and (transiently) reverse rows. Defaults to true. */
  scrollReactive?: boolean;
  /** How many times each row's content is duplicated inside its track. Minimum 3. Defaults to 6. */
  repeat?: number;
  /** Gap between repeated copies, in `themeSpacing` units. Defaults to 8. */
  gap?: number;
  /** Gap between rows, in `themeSpacing` units. Defaults to 6. */
  rowGap?: number;
  /** Edge fade width, in `themeSpacing` units. Defaults to 24. */
  fadeWidth?: number;
  /** Theme color the edge fades blend into. Defaults to "neutral". */
  fadeColor?: ThemeColor;
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

const DEFAULT_PHRASES = [
  "BUILD SOMETHING GREAT • ",
  "SHIP FAST, SHIP OFTEN • ",
];

// Tuning constants for the JS-driven motion loop. Not theme values — these
// scale a physics simulation, not layout — so they stay as plain numbers.
const BASE_SPEED_SCALE = 24; // px/second per unit of `baseVelocity`
const VELOCITY_MULTIPLIER = 6; // px/second of extra speed per px/frame of scroll delta
const SKEW_MULTIPLIER = 0.6; // degrees of skew per px/frame of scroll delta
const MAX_SKEW_DEGREES = 12;
const MAX_DELTA_SECONDS = 1 / 20; // clamp so a stalled tab doesn't jump the loop on resume

interface RowRuntime {
  direction: "left" | "right";
  trackElement: HTMLElement | null;
  resizeObserver: ResizeObserver | null;
  groupWidth: number;
  positionPx: number;
}

/** Default repeating unit for string content: large, bold, uppercase-style display text. */
function defaultTextNode(text: string): DomphyElement {
  return { strong: text, $: [strong({ color: "neutral" })] } as DomphyElement;
}

/** Decorative edge-fade overlay — pure gradient, no text content. */
function edgeFade(
  edge: "start" | "end",
  widthUnits: number,
  fadeColor: ThemeColor,
): DomphyElement<"div"> {
  const toDirection = edge === "start" ? "to right" : "to left";
  const element = {
    div: null,
    ariaHidden: "true",
    // Decorative gradient scrim with no text of its own — exempt from the
    // missing-color contract.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      insetBlockStart: 0,
      insetBlockEnd: 0,
      insetInlineStart: edge === "start" ? 0 : undefined,
      insetInlineEnd: edge === "end" ? 0 : undefined,
      width: themeSpacing(widthUnits),
      pointerEvents: "none",
      zIndex: 1,
      background: (listener: Listener) =>
        `linear-gradient(${toDirection}, ${themeColor(listener, "inherit", fadeColor)}, transparent)`,
    },
  };
  return element as DomphyElement<"div">;
}

function rowElement(
  row: ScrollVelocityRow,
  runtime: RowRuntime,
  index: number,
  repeatCount: number,
  gapUnits: number,
  fadeWidthUnits: number,
  fadeColor: ThemeColor,
): DomphyElement<"div"> {
  const content =
    row.content && typeof row.content !== "string"
      ? row.content
      : defaultTextNode(
          typeof row.content === "string"
            ? row.content
            : DEFAULT_PHRASES[index % DEFAULT_PHRASES.length],
        );

  const trackChildren: DomphyElement[] = Array.from(
    { length: repeatCount },
    (_unused, copyIndex) => ({
      ...content,
      _key: `copy-${copyIndex}`,
      // Only the first copy is real content — the rest exist purely to make
      // the loop seamless and should not be announced twice.
      ariaHidden: copyIndex === 0 ? undefined : "true",
    }),
  ) as DomphyElement[];

  const track: DomphyElement<"div"> = {
    div: trackChildren,
    dataSize: "increase-6",
    _key: "track",
    style: {
      display: "flex",
      alignItems: "center",
      flexShrink: 0,
      gap: themeSpacing(gapUnits),
      width: "max-content",
      willChange: "transform",
    },
    _onMount: (node: ElementNode) => {
      const element = node.domElement as HTMLElement;
      runtime.trackElement = element;
      const measure = () => {
        runtime.groupWidth = element.scrollWidth / repeatCount;
      };
      measure();
      if (typeof ResizeObserver !== "undefined") {
        runtime.resizeObserver = new ResizeObserver(measure);
        runtime.resizeObserver.observe(element);
      }
    },
    _onRemove: () => {
      runtime.resizeObserver?.disconnect();
      runtime.resizeObserver = null;
      runtime.trackElement = null;
    },
  };

  return {
    div: [
      track,
      edgeFade("start", fadeWidthUnits, fadeColor),
      edgeFade("end", fadeWidthUnits, fadeColor),
    ],
    _key: `row-${index}`,
    style: { position: "relative", overflow: "hidden", width: "100%" },
  };
}

/**
 * One or more edge-to-edge marquee rows whose scroll speed and slight skew
 * respond to how fast the user scrolls the page, decaying back to a
 * constant base speed at rest. Call with no arguments for a working demo —
 * two rows of display text drifting in opposite directions.
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
  const repeatCount = Math.max(3, Math.round(props.repeat ?? 6));
  const gapUnits = props.gap ?? 8;
  const rowGapUnits = props.rowGap ?? 6;
  const fadeWidthUnits = props.fadeWidth ?? 24;
  const fadeColor = props.fadeColor ?? "neutral";

  const runtimes: RowRuntime[] = rows.map((row, index) => ({
    direction: row.direction ?? (index % 2 === 0 ? "left" : "right"),
    trackElement: null,
    resizeObserver: null,
    groupWidth: 0,
    positionPx: 0,
  }));

  return {
    div: rows.map((row, index) =>
      rowElement(
        row,
        runtimes[index],
        index,
        repeatCount,
        gapUnits,
        fadeWidthUnits,
        fadeColor,
      ),
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
      const prefersReducedMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) return;

      let isTabVisible = document.visibilityState !== "hidden";
      let isInViewport = true;
      let lastTimestamp: number | null = null;
      let lastScrollY = window.scrollY;
      let smoothedScrollVelocity = 0;
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
        // Exponential moving average: tracks fresh scroll deltas quickly,
        // decays smoothly back to zero once scrolling stops.
        smoothedScrollVelocity += (scrollDelta - smoothedScrollVelocity) * 0.2;

        if (isTabVisible && isInViewport) {
          for (const runtime of runtimes) {
            if (!runtime.trackElement || runtime.groupWidth <= 0) continue;

            const directionSign = runtime.direction === "right" ? 1 : -1;
            const basePxPerSecond = baseVelocity * BASE_SPEED_SCALE;
            const scrollContribution = scrollReactive
              ? smoothedScrollVelocity * VELOCITY_MULTIPLIER
              : 0;
            // Both terms carry the row's own direction sign, so scrolling
            // down speeds every row up in its own configured direction —
            // and a fast opposite-direction scroll can momentarily
            // overpower the base term and reverse the row before it settles.
            const totalPxPerSecond =
              directionSign * (basePxPerSecond + scrollContribution);
            runtime.positionPx += totalPxPerSecond * deltaSeconds;

            const wrapped =
              ((runtime.positionPx % runtime.groupWidth) + runtime.groupWidth) %
              runtime.groupWidth;
            const translateX = directionSign < 0 ? -wrapped : wrapped;
            const skewDegrees = scrollReactive
              ? Math.max(
                  -MAX_SKEW_DEGREES,
                  Math.min(
                    MAX_SKEW_DEGREES,
                    smoothedScrollVelocity * SKEW_MULTIPLIER,
                  ),
                )
              : 0;
            runtime.trackElement.style.transform = `translateX(${translateX}px) skewX(${skewDegrees}deg)`;
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
        intersectionObserver?.disconnect();
      });
    },
  };
}

export { scrollBasedVelocity };
