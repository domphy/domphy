// Aceternity UI "Google Gemini Effect" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// hero-section centerpiece: a cluster of wavy, multi-colored SVG ribbons that
// "draw themselves in" as the section scrolls through the viewport, evoking
// the Google Gemini brand animation.
//
// Classic SVG stroke-draw technique: every ribbon gets `stroke-dasharray`
// equal to its own total length and a `stroke-dashoffset` that interpolates
// from "fully hidden" (offset = length) to "fully shown" (offset = 0) as a
// reactive draw-progress value changes — the browser tweens the dash offset
// continuously, no per-frame canvas work needed.
//
// Path geometry is generated analytically (Catmull-Rom spline through a
// handful of sine-perturbed anchor points, converted to cubic Bezier
// segments) rather than hand-authored `d` strings, so both the path data and
// its exact arc length are computed with plain math at build time — no DOM
// measurement (`SVGPathElement.getTotalLength()`), which keeps the default
// demo deterministic under jsdom (no real layout/geometry engine) as well as
// in a real browser. Callers who supply their own custom `d` string instead
// fall back to `getTotalLength()` at mount time (guarded, with a heuristic
// estimate when unavailable) since arbitrary path data can't be measured
// analytically without parsing full SVG path grammar.
//
// Per-path draw progress is fully caller-controllable: pass `progress[index]`
// (a plain number or a `State<number>`) to drive that ribbon directly from
// the host page's own scroll/IntersectionObserver logic. Any path without an
// explicit override instead tracks the section's own scroll-through
// fraction internally (a `scroll`/`resize` listener wired in `_onMount`,
// rAF-lerped toward the raw target the same way this package's
// `scrollProgress` smooths its fill), remapped through a small per-path
// `[start, end]` sub-range of that fraction so ribbons complete their draw
// at staggered moments instead of all finishing in lockstep.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { hashString, toState, type ValueOrState } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

interface Point {
  x: number;
  y: number;
}

interface CubicSegment {
  p0: Point;
  c1: Point;
  c2: Point;
  p1: Point;
}

export interface GoogleGeminiPathSpec {
  /** SVG path `d` data. When omitted, a generated wavy ribbon is used and its
   * arc length is computed analytically (no DOM measurement needed). */
  d?: string;
  /** Theme color family for this ribbon's stroke. Cycles through a
   * Gemini-like blue/purple/red/yellow set across the default paths. */
  color?: ThemeColor;
  /** Stroke width, in SVG user units. Defaults to `3`. */
  strokeWidth?: number;
  /** `[start, end]` fraction of the overall scroll-through range this ribbon
   * completes its draw within. Only used when no explicit `progress` entry
   * is supplied for this path's index. Defaults to a staggered per-index range. */
  scrollRange?: [number, number];
}

export interface GoogleGeminiEffectProps {
  /** Hero heading above the artwork. Defaults to `"Build with Aceternity UI"`. */
  title?: string;
  /** Supporting description line below the heading. */
  description?: string;
  /** Per-ribbon overrides (color/strokeWidth/custom d/scrollRange). Defaults
   * to 5 generated ribbons in a Gemini-like palette. */
  paths?: GoogleGeminiPathSpec[];
  /** Per-path draw progress, 0–1, one entry per path (matched by index).
   * Accepts a plain number or a `State<number>`. Supplying an entry fully
   * hands control of that ribbon to the caller — internal scroll-tracking
   * is skipped for that index. */
  progress?: ValueOrState<number>[];
  /** viewBox width, in SVG user units. Defaults to `1440`. */
  width?: number;
  /** viewBox height, in SVG user units. Defaults to `320`. */
  height?: number;
  /** Renders a soft blurred glow duplicate behind each ribbon. Defaults to `true`. */
  glow?: boolean;
  /** Passthrough style merged onto the outer section. */
  style?: StyleObject;
}

const DEFAULT_PATH_PRESETS: Array<{
  amplitude: number;
  frequency: number;
  phase: number;
  verticalOffset: number;
  color: ThemeColor;
}> = [
  { amplitude: 46, frequency: 2.4, phase: 0, verticalOffset: -72, color: "info" },
  { amplitude: 60, frequency: 2.1, phase: 0.6, verticalOffset: -32, color: "primary" },
  { amplitude: 38, frequency: 2.7, phase: 1.3, verticalOffset: 0, color: "secondary" },
  { amplitude: 54, frequency: 2.2, phase: 2.0, verticalOffset: 34, color: "error" },
  { amplitude: 42, frequency: 2.5, phase: 2.7, verticalOffset: 72, color: "warning" },
];

const ANCHOR_COUNT = 7;
const LENGTH_SAMPLE_STEPS = 24;

function clampToUnitRange(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Catmull-Rom spline through `points`, converted to cubic Bezier segments (clamped at the ends). */
function catmullRomToBezierSegments(points: Point[]): CubicSegment[] {
  const segments: CubicSegment[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const start = points[index];
    const end = points[index + 1];
    const next = points[Math.min(points.length - 1, index + 2)];
    const c1: Point = { x: start.x + (end.x - previous.x) / 6, y: start.y + (end.y - previous.y) / 6 };
    const c2: Point = { x: end.x - (next.x - start.x) / 6, y: end.y - (next.y - start.y) / 6 };
    segments.push({ p0: start, c1, c2, p1: end });
  }
  return segments;
}

/** Arc length of one cubic Bezier segment, approximated by sampling and summing chord lengths. */
function sampleCubicSegmentLength(segment: CubicSegment): number {
  const { p0, c1, c2, p1 } = segment;
  let length = 0;
  let previous = p0;
  for (let step = 1; step <= LENGTH_SAMPLE_STEPS; step += 1) {
    const t = step / LENGTH_SAMPLE_STEPS;
    const inverseT = 1 - t;
    const x = inverseT ** 3 * p0.x + 3 * inverseT ** 2 * t * c1.x + 3 * inverseT * t ** 2 * c2.x + t ** 3 * p1.x;
    const y = inverseT ** 3 * p0.y + 3 * inverseT ** 2 * t * c1.y + 3 * inverseT * t ** 2 * c2.y + t ** 3 * p1.y;
    length += Math.hypot(x - previous.x, y - previous.y);
    previous = { x, y };
  }
  return length;
}

/** Generates one horizontal wavy ribbon spanning `width`, plus its exact analytical arc length. */
function buildWaveRibbon(
  width: number,
  height: number,
  amplitude: number,
  frequency: number,
  phase: number,
  verticalOffset: number,
): { d: string; length: number } {
  const points: Point[] = [];
  for (let index = 0; index < ANCHOR_COUNT; index += 1) {
    const t = index / (ANCHOR_COUNT - 1);
    points.push({
      x: t * width,
      y: height / 2 + verticalOffset + Math.sin(t * Math.PI * frequency + phase) * amplitude,
    });
  }
  const segments = catmullRomToBezierSegments(points);
  let d = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  let length = 0;
  for (const segment of segments) {
    d += ` C ${segment.c1.x.toFixed(2)},${segment.c1.y.toFixed(2)} ${segment.c2.x.toFixed(2)},${segment.c2.y.toFixed(2)} ${segment.p1.x.toFixed(2)},${segment.p1.y.toFixed(2)}`;
    length += sampleCubicSegmentLength(segment);
  }
  return { d, length };
}

/** Staggered `[start, end]` scroll sub-range for a path at `index` of `count` — earlier indices start sooner. */
function defaultScrollRange(index: number, count: number): [number, number] {
  const stagger = count > 1 ? index / (count - 1) : 0;
  const start = stagger * 0.3;
  const end = Math.min(1, start + 0.75);
  return [start, end];
}

/** Current "how far has this section scrolled through the viewport" fraction, 0 at first appearance, 1 once fully passed. */
function computeSectionScrollFraction(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
  const totalTravel = rect.height + viewportHeight;
  const traveled = viewportHeight - rect.top;
  return clampToUnitRange(totalTravel > 0 ? traveled / totalTravel : 0);
}

let googleGeminiEffectInstanceCounter = 0;

/**
 * A hero-section centerpiece: a cluster of wavy, multi-colored SVG ribbons
 * that progressively draw themselves in as the section scrolls through the
 * viewport. Call with no arguments for a working demo — 5 generated ribbons
 * that auto-track the page's own scroll position.
 */
function googleGeminiEffect(props: GoogleGeminiEffectProps = {}): DomphyElement<"section"> {
  const instanceId = ++googleGeminiEffectInstanceCounter;
  const title = props.title ?? "Build with Aceternity UI";
  const description =
    props.description ?? "Scroll through this section to watch the ribbons trace themselves in.";
  const width = Math.max(1, props.width ?? 1440);
  const height = Math.max(1, props.height ?? 320);
  const glow = props.glow ?? true;

  const pathSpecs: GoogleGeminiPathSpec[] =
    props.paths && props.paths.length > 0
      ? props.paths
      : DEFAULT_PATH_PRESETS.map((preset) => ({ color: preset.color }));

  // One State<number> per path — either mirrors an explicit `progress[index]`
  // override, or is driven internally by the scroll-tracking loop below.
  const lengthStates = pathSpecs.map((spec, index) => {
    if (spec.d) {
      // Custom path data: length is unknown until we can measure the real
      // DOM node (or estimate). Seeded with a generous heuristic so the
      // ribbon still renders sensibly before that first measurement lands.
      return toState(width * 1.4, `google-gemini-length-${instanceId}-${index}`);
    }
    const preset = DEFAULT_PATH_PRESETS[index % DEFAULT_PATH_PRESETS.length];
    const built = buildWaveRibbon(width, height, preset.amplitude, preset.frequency, preset.phase, preset.verticalOffset);
    return toState(built.length, `google-gemini-length-${instanceId}-${index}`);
  });

  const pathData: string[] = pathSpecs.map((spec, index) => {
    if (spec.d) return spec.d;
    const preset = DEFAULT_PATH_PRESETS[index % DEFAULT_PATH_PRESETS.length];
    return buildWaveRibbon(width, height, preset.amplitude, preset.frequency, preset.phase, preset.verticalOffset).d;
  });

  const rawScrollFraction = toState(0, `google-gemini-scroll-${instanceId}`);
  const needsInternalScrollTracking = pathSpecs.some((_spec, index) => props.progress?.[index] === undefined);

  const progressGetters: Array<(listener: Listener) => number> = pathSpecs.map((spec, index) => {
    const explicitProgress = props.progress?.[index];
    if (explicitProgress !== undefined) {
      const explicitState = toState(explicitProgress, `google-gemini-progress-${instanceId}-${index}`);
      return (listener: Listener) => clampToUnitRange(explicitState.get(listener));
    }
    const [rangeStart, rangeEnd] = spec.scrollRange ?? defaultScrollRange(index, pathSpecs.length);
    return (listener: Listener) => {
      const raw = rawScrollFraction.get(listener);
      if (rangeEnd <= rangeStart) return raw >= rangeEnd ? 1 : 0;
      return clampToUnitRange((raw - rangeStart) / (rangeEnd - rangeStart));
    };
  });

  const glowFilterId = `domphy-google-gemini-glow-${instanceId}`;

  function ribbonStyle(index: number, color: ThemeColor, strokeWidth: number, extra?: StyleObject): StyleObject {
    return {
      fill: "none",
      strokeLinecap: "round",
      stroke: (listener: Listener) => themeColor(listener, "shift-9", color),
      strokeWidth,
      strokeDasharray: (listener: Listener) => {
        const length = lengthStates[index].get(listener);
        return `${length.toFixed(2)} ${length.toFixed(2)}`;
      },
      strokeDashoffset: (listener: Listener) => {
        const length = lengthStates[index].get(listener);
        const progress = progressGetters[index](listener);
        return `${(length * (1 - progress)).toFixed(2)}`;
      },
      ...(extra ?? {}),
    } as StyleObject;
  }

  const ribbonElements: DomphyElement[] = [];
  pathSpecs.forEach((spec, index) => {
    const preset = DEFAULT_PATH_PRESETS[index % DEFAULT_PATH_PRESETS.length];
    const color = spec.color ?? preset.color;
    const strokeWidth = spec.strokeWidth ?? 3;
    const d = pathData[index];

    if (glow) {
      ribbonElements.push({
        path: null,
        _key: `ribbon-glow-${instanceId}-${index}`,
        d,
        ariaHidden: "true",
        // Decorative glow duplicate with no text of its own — exempt from the
        // missing-color contract, matching ripple.ts's ring elements.
        _doctorDisable: "missing-color",
        style: ribbonStyle(index, color, strokeWidth * 3, {
          opacity: 0.35,
          filter: `url(#${glowFilterId})`,
        }),
      } as DomphyElement);
    }

    ribbonElements.push({
      path: null,
      _key: `ribbon-${instanceId}-${index}`,
      d,
      ariaHidden: "true",
      _doctorDisable: "missing-color",
      _onMount: (node: ElementNode) => {
        if (!spec.d || typeof window === "undefined") return;
        const pathElement = node.domElement as SVGPathElement | null;
        if (!pathElement || typeof pathElement.getTotalLength !== "function") return;
        try {
          const measured = pathElement.getTotalLength();
          if (measured > 0) lengthStates[index].set(measured);
        } catch {
          // getTotalLength() is unavailable in some headless/test runtimes
          // (e.g. jsdom) — keep the seeded heuristic length in that case.
        }
      },
      style: ribbonStyle(index, color, strokeWidth),
    } as DomphyElement);
  });

  const glowDefs: DomphyElement[] = glow
    ? [
        {
          filter: [{ feGaussianBlur: null, stdDeviation: "8" } as DomphyElement],
          id: glowFilterId,
          x: "-30%",
          y: "-30%",
          width: "160%",
          height: "160%",
        } as DomphyElement,
      ]
    : [];

  const artworkSvg: DomphyElement<"svg"> = {
    svg: [...(glowDefs.length ? [{ defs: glowDefs } as DomphyElement] : []), ...ribbonElements],
    viewBox: `0 0 ${width} ${height}`,
    preserveAspectRatio: "xMidYMid meet",
    ariaHidden: "true",
    style: { display: "block", width: "100%", height: "auto" } as StyleObject,
  } as DomphyElement<"svg">;

  const textBlock: DomphyElement<"div"> = {
    div: [
      { h2: title, $: [heading()] } as DomphyElement,
      { p: description, $: [paragraph()] } as DomphyElement,
    ],
    style: {
      position: "relative",
      zIndex: 1,
      textAlign: "center",
      maxWidth: themeSpacing(160),
      marginInline: "auto",
      marginBlockEnd: themeSpacing(10),
    } as StyleObject,
  } as DomphyElement<"div">;

  return {
    section: [
      textBlock,
      {
        div: [artworkSvg],
        style: { position: "relative", zIndex: 1 } as StyleObject,
      } as DomphyElement<"div">,
    ],
    dataTone: "shift-16",
    _onMount: (node: ElementNode) => {
      if (!needsInternalScrollTracking || typeof window === "undefined") return;
      const sectionElement = node.domElement as HTMLElement | null;
      if (!sectionElement) return;

      let currentFraction = computeSectionScrollFraction(sectionElement);
      let targetFraction = currentFraction;
      let animating = false;
      let rafHandle = 0;
      rawScrollFraction.set(currentFraction);

      const step = () => {
        // Belt-and-suspenders stop condition: some hosts (e.g. a test harness
        // that wipes the DOM directly instead of going through the framework's
        // removal lifecycle) never fire the "Remove" hook below. Bailing here
        // once the node is detached prevents the window scroll/resize
        // listeners from resurrecting this loop forever.
        if (!sectionElement.isConnected) return;
        currentFraction += (targetFraction - currentFraction) * 0.2;
        if (Math.abs(targetFraction - currentFraction) < 0.0008) {
          currentFraction = targetFraction;
          rawScrollFraction.set(currentFraction);
          animating = false;
          return;
        }
        rawScrollFraction.set(currentFraction);
        rafHandle = window.requestAnimationFrame(step);
      };

      const handleScroll = () => {
        targetFraction = computeSectionScrollFraction(sectionElement);
        if (!animating) {
          animating = true;
          rafHandle = window.requestAnimationFrame(step);
        }
      };

      window.addEventListener("scroll", handleScroll, { passive: true });
      window.addEventListener("resize", handleScroll, { passive: true });

      node.addHook("Remove", () => {
        window.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", handleScroll);
        if (rafHandle) window.cancelAnimationFrame(rafHandle);
      });
    },
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(10),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { googleGeminiEffect };
