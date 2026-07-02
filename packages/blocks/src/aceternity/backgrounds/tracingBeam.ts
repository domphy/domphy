// Aceternity UI "Tracing Beam" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A thin
// vertical gradient beam running alongside long-form content, whose colored
// segment grows downward in step with how far the reader has scrolled past
// the content block.
//
// The path itself is a gentle, static S-curve (a handful of cubic-bezier
// segments oscillating left-right) sampled once and measured with the real
// SVG `getTotalLength()`; the standard "draw a line as you scroll" technique
// — a single full-length `stroke-dasharray` plus a `stroke-dashoffset` that
// shrinks toward `0` as progress grows — reveals the gradient path from the
// top down (the same dash-offset idiom `animatedCircularProgressBar()` uses
// for its ring, applied to a line instead of a circle). Progress is *not*
// raw scroll pixels: a `scroll`/`resize` listener recomputes
// `contentElement.getBoundingClientRect()` on every tick, scoping the 0-1
// fraction to how far the content wrapper itself has scrolled through the
// viewport (matching the spec's "scoped to the content wrapper, not the
// whole page" research note) rather than document height. A
// critically-damped spring (the same spring-damper integrator
// `smoothCursor()` already uses in this package) chases that raw fraction,
// so fast scrolling makes the beam's leading edge overshoot slightly past
// the target and settle back — the "springy, elastic" leading-edge stretch
// the spec describes.
//
// The `<svg>` column and the content column are DOM siblings, but Domphy's
// client `render()` fires `_onMount` top-down (a parent's hook runs before
// its later siblings even exist — see `ElementNode.render`), so the svg's
// own `_onMount` cannot assume the content element already exists. Both
// sides instead register themselves into shared closure variables and each
// calls a guarded `trySetup()` once both are present, independent of which
// one happens to mount first (the same `registerNode`-pair idiom
// `animatedBeam()` uses for its node badges).

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface TracingBeamProps {
  /** Long-form content rendered beside the beam. Defaults to a small demo article. */
  children?: DomphyElement | DomphyElement[];
  /** Horizontal wiggle amplitude of the path's S-curve, in SVG viewBox units (the lane is 20 units wide). Defaults to `6`. */
  curvature?: number;
  /** Theme color roles for the traveled gradient segment, sampled across three stops. Defaults to `["info", "primary", "secondary"]`. */
  gradientColors?: ThemeColor[];
  /** Toggles the small circular marker node at the top of the path. Defaults to `true`. */
  showMarker?: boolean;
  /** Passthrough style merged onto the outer wrapper. */
  style?: StyleObject;
}

const LANE_WIDTH = 20;
const LANE_CENTER = LANE_WIDTH / 2;
const SEGMENT_HEIGHT = 120;

interface SpringState {
  displayed: number;
  velocity: number;
}

/** Builds a gentle S-curve `d` string oscillating across the lane, one cubic-bezier segment per `SEGMENT_HEIGHT` of height. */
function buildTracingPath(height: number, curvature: number): string {
  const segmentCount = Math.max(1, Math.ceil(height / SEGMENT_HEIGHT));
  let d = `M${LANE_CENTER} 0`;
  let previousY = 0;
  for (let index = 0; index < segmentCount; index += 1) {
    const nextY = Math.min(height, previousY + SEGMENT_HEIGHT);
    const direction = index % 2 === 0 ? 1 : -1;
    const controlOneY = previousY + (nextY - previousY) * 0.33;
    const controlTwoY = previousY + (nextY - previousY) * 0.66;
    const swingX = LANE_CENTER + direction * curvature;
    d += ` C${swingX} ${controlOneY.toFixed(1)}, ${swingX} ${controlTwoY.toFixed(1)}, ${LANE_CENTER} ${nextY.toFixed(1)}`;
    previousY = nextY;
  }
  return d;
}

function defaultTracingContent(): DomphyElement[] {
  return [
    { h2: "Tracing Beam", $: [heading()] } as DomphyElement,
    {
      p: "The beam beside this column fills in as you scroll past it, with a springy leading edge on fast scrolls.",
      $: [paragraph()],
    } as DomphyElement,
    {
      p: "Keep scrolling — the colored segment tracks how far this content block has moved through the viewport, not raw page height.",
      $: [paragraph()],
    } as DomphyElement,
  ];
}

/**
 * A thin vertical gradient beam beside long-form content that traces
 * downward in step with scroll progress through the content block, with a
 * springy, slightly elastic leading edge on fast scrolls. Call with no
 * arguments for a working demo — a beam beside a small placeholder article.
 */
function tracingBeam(props: TracingBeamProps = {}): DomphyElement<"div"> {
  const curvature = props.curvature ?? 6;
  const gradientColors = props.gradientColors && props.gradientColors.length > 0 ? props.gradientColors : (["info", "primary", "secondary"] as ThemeColor[]);
  const showMarker = props.showMarker ?? true;

  const contentChildren: DomphyElement[] = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultTracingContent();

  const gradientId = "domphy-tracing-beam-gradient";

  // `<stop>` is a paint-server node, not text — exempt from the missing-color
  // contract (mirrors animatedBeam.ts's own gradient stops).
  const gradientStops: DomphyElement[] = [
    { stop: null, offset: "0%", style: { stopColor: (listener) => themeColor(listener, "shift-9", gradientColors[0]) } as StyleObject, _doctorDisable: "missing-color" } as DomphyElement,
    {
      stop: null,
      offset: "50%",
      style: { stopColor: (listener) => themeColor(listener, "shift-9", gradientColors[1 % gradientColors.length]) } as StyleObject,
      _doctorDisable: "missing-color",
    } as DomphyElement,
    {
      stop: null,
      offset: "100%",
      style: { stopColor: (listener) => themeColor(listener, "shift-9", gradientColors[2 % gradientColors.length]) } as StyleObject,
      _doctorDisable: "missing-color",
    } as DomphyElement,
  ];

  let svgElement: SVGSVGElement | null = null;
  let basePathElement: SVGPathElement | null = null;
  let traveledPathElement: SVGPathElement | null = null;
  let contentElement: HTMLElement | null = null;
  let removeTeardown: (() => void) | null = null;

  function trySetup(): void {
    if (!svgElement || !basePathElement || !traveledPathElement || !contentElement) return;
    if (removeTeardown || typeof window === "undefined") return;

    const spring: SpringState = { displayed: 0, velocity: 0 };
    const stiffness = 210;
    const damping = 26;
    const restDelta = 0.0015;

    let totalLength = 0;
    let animationFrameId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let lastFrameTime = 0;

    function rebuildPath(): void {
      const height = Math.max(1, contentElement!.getBoundingClientRect().height);
      svgElement!.setAttribute("viewBox", `0 0 ${LANE_WIDTH} ${height}`);
      const d = buildTracingPath(height, curvature);
      basePathElement!.setAttribute("d", d);
      traveledPathElement!.setAttribute("d", d);
      // jsdom/non-layout runtimes don't implement SVG geometry methods — fall
      // back to the sampled height so the component still renders/animates.
      try {
        totalLength = traveledPathElement!.getTotalLength();
      } catch {
        totalLength = height;
      }
      traveledPathElement!.setAttribute("stroke-dasharray", String(totalLength));
      paintProgress();
    }

    function rawProgress(): number {
      const rect = contentElement!.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      if (rect.height <= viewportHeight) {
        const entered = viewportHeight - rect.top;
        return Math.min(1, Math.max(0, entered / rect.height));
      }
      const scrollable = Math.max(1, rect.height - viewportHeight);
      return Math.min(1, Math.max(0, -rect.top / scrollable));
    }

    function paintProgress(): void {
      const offset = totalLength * (1 - spring.displayed);
      traveledPathElement!.setAttribute("stroke-dashoffset", String(offset));
    }

    function step(time: number): void {
      const deltaSeconds = Math.min((time - lastFrameTime) / 1000, 1 / 30);
      lastFrameTime = time;
      const target = rawProgress();

      // Spring-damper: force = -stiffness * displacement - damping * velocity
      // (the same integrator `smoothCursor()` uses for its trailing glyph).
      const acceleration = -stiffness * (spring.displayed - target) - damping * spring.velocity;
      spring.velocity += acceleration * deltaSeconds;
      spring.displayed = Math.min(1.15, Math.max(-0.05, spring.displayed + spring.velocity * deltaSeconds));

      paintProgress();

      const settled = Math.abs(target - spring.displayed) < restDelta && Math.abs(spring.velocity) < restDelta;
      animationFrameId = settled ? null : window.requestAnimationFrame(step);
    }

    function ensureLoopRunning(): void {
      if (animationFrameId === null) {
        lastFrameTime = performance.now();
        animationFrameId = window.requestAnimationFrame(step);
      }
    }

    rebuildPath();

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => rebuildPath());
      resizeObserver.observe(contentElement);
    }

    const onScrollOrResize = () => ensureLoopRunning();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });

    removeTeardown = () => {
      if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      removeTeardown = null;
    };
  }

  const beamSvg: DomphyElement = {
    svg: [
      { defs: [{ linearGradient: gradientStops, id: gradientId, x1: "0", y1: "0", x2: "0", y2: "1" } as DomphyElement] } as DomphyElement,
      {
        path: null,
        d: "",
        fill: "none",
        strokeWidth: "2",
        strokeLinecap: "round",
        _key: "base-path",
        ariaHidden: "true",
        // Decorative background stroke with no text of its own — exempt from
        // the missing-color contract (mirrors dotPattern.ts's gradient stops).
        _doctorDisable: "missing-color",
        _onMount: (node: ElementNode) => {
          basePathElement = node.domElement as unknown as SVGPathElement;
          trySetup();
        },
        _onRemove: () => {
          basePathElement = null;
        },
        style: { stroke: (listener) => themeColor(listener, "shift-3") } as StyleObject,
      } as DomphyElement,
      {
        path: null,
        d: "",
        fill: "none",
        stroke: `url(#${gradientId})`,
        strokeWidth: "2",
        strokeLinecap: "round",
        _key: "traveled-path",
        _onMount: (node: ElementNode) => {
          traveledPathElement = node.domElement as unknown as SVGPathElement;
          trySetup();
        },
        _onRemove: () => {
          traveledPathElement = null;
        },
      } as DomphyElement,
      ...(showMarker
        ? [
            {
              circle: null,
              cx: String(LANE_CENTER),
              cy: "6",
              r: "5",
              _key: "marker",
              ariaHidden: "true",
              style: { fill: (listener) => themeColor(listener, "shift-9", gradientColors[0]) } as StyleObject,
              _doctorDisable: "missing-color",
            } as DomphyElement,
          ]
        : []),
    ],
    viewBox: `0 0 ${LANE_WIDTH} 1`,
    preserveAspectRatio: "none",
    ariaHidden: "true",
    _onMount: (node: ElementNode) => {
      svgElement = node.domElement as unknown as SVGSVGElement;
      trySetup();
    },
    _onRemove: () => {
      svgElement = null;
      removeTeardown?.();
    },
    style: { display: "block", width: "100%", height: "100%" } as StyleObject,
  } as DomphyElement;

  return {
    div: [
      {
        div: [beamSvg],
        style: {
          position: "sticky",
          top: themeSpacing(4),
          width: themeSpacing(LANE_WIDTH),
          height: "100%",
          alignSelf: "stretch",
          flexShrink: 0,
        } as StyleObject,
      } as DomphyElement,
      {
        div: contentChildren,
        _onMount: (node: ElementNode) => {
          contentElement = node.domElement as HTMLElement;
          trySetup();
        },
        _onRemove: () => {
          contentElement = null;
          removeTeardown?.();
        },
        style: { flex: 1, minWidth: 0 } as StyleObject,
      } as DomphyElement,
    ],
    style: {
      position: "relative",
      display: "flex",
      alignItems: "flex-start",
      gap: themeSpacing(4),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { tracingBeam };
