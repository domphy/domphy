// Magic UI "Animated Beam" — clean-room reimplementation.
//
// A glowing SVG line that pulses along a curved (or straight) path connecting
// two circular badge nodes, commonly used to visualize data/connection flow
// between icons in an architecture diagram. The path is measured at runtime
// from the real DOM positions of the node badges (so it stays anchored when
// the layout shifts) and the bright segment loops continuously along it.
//
// Implemented purely from the block's public functional/visual spec — no
// upstream Magic UI source was viewed or copied.

import type { DomphyElement, ElementNode } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import type { ThemeColor } from "@domphy/theme";

/** A circular badge node placed inside the diagram canvas. */
export interface AnimatedBeamNode {
  /** Stable identifier referenced by `connections[].from`/`to`. */
  id: string;
  /** Content rendered inside the badge (icon/glyph). Defaults to a themed dot. */
  content?: DomphyElement;
  /** Vertical center of the badge, as a CSS position (e.g. `"20%"`). */
  top: string;
  /** Horizontal center of the badge, as a CSS position (e.g. `"14%"`). */
  left: string;
  /** Accent color used by the default glyph when `content` is omitted. */
  accentColor?: ThemeColor;
}

/** One animated connection between two nodes. */
export interface AnimatedBeamConnection {
  /** `id` of the source node. */
  from: string;
  /** `id` of the target node. */
  to: string;
  /** Bow amount in pixels. `0` renders a straight line. Defaults to `40`. */
  curvature?: number;
  /** Axis the curve bows along. Defaults to `"vertical"`. */
  bend?: "vertical" | "horizontal";
  /** Plays the pulse from `to` towards `from` instead of `from` towards `to`. */
  reverse?: boolean;
  /** Full loop duration in ms. Defaults to `3000`. */
  duration?: number;
  /** Delay in ms before this beam's pulse starts — use to stagger multiple beams. Defaults to `0`. */
  delay?: number;
  /** Theme color of the traveling glow. Defaults to `"primary"`. */
  glowColor?: ThemeColor;
  /** Theme color of the static background line. Defaults to `"neutral"`. */
  pathColor?: ThemeColor;
  /** Stroke width (px) of the static background line. Defaults to `2`. */
  pathWidth?: number;
  /** Opacity of the static background line. Defaults to `0.4`. */
  pathOpacity?: number;
  /** Stroke width (px) of the glow segment. Defaults to `3`. */
  glowWidth?: number;
  /** Extra x/y offset (px) applied to the beam's start point, past the node's edge. */
  startXOffset?: number;
  startYOffset?: number;
  /** Extra x/y offset (px) applied to the beam's end point, past the node's edge. */
  endXOffset?: number;
  endYOffset?: number;
}

export interface AnimatedBeamProps {
  /** Badge nodes placed inside the canvas. Defaults to a 2-source/1-hub layout. */
  nodes?: AnimatedBeamNode[];
  /** Animated connections between node ids. Defaults to two beams converging on the hub. */
  connections?: AnimatedBeamConnection[];
  /** Canvas height in pixels. Defaults to `260`. */
  height?: number;
}

let animatedBeamInstanceCounter = 0;

/** Small themed dot used as the default badge glyph when a node has no custom content. */
function defaultBeamGlyph(color: ThemeColor): DomphyElement {
  return {
    svg: [{ circle: null, cx: "12", cy: "12", r: "5" }],
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg",
    fill: "currentColor",
    style: { color: (listener) => themeColor(listener, "shift-9", color) },
  } as DomphyElement;
}

/** One circular badge node, absolutely positioned inside the shared canvas. */
function beamNodeElement(
  nodeSpec: AnimatedBeamNode,
  registerNode: (id: string, element: HTMLElement | null) => void,
): DomphyElement {
  return {
    div: [nodeSpec.content ?? defaultBeamGlyph(nodeSpec.accentColor ?? "primary")],
    _key: nodeSpec.id,
    _onMount: (node: ElementNode) => {
      registerNode(nodeSpec.id, node.domElement as HTMLElement);
    },
    _onRemove: () => registerNode(nodeSpec.id, null),
    style: {
      position: "absolute",
      top: nodeSpec.top,
      left: nodeSpec.left,
      transform: "translate(-50%, -50%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: themeSpacing(12),
      height: themeSpacing(12),
      borderRadius: "50%",
      backgroundColor: (listener) => themeColor(listener, "inherit", "neutral"),
      color: (listener) => themeColor(listener, "shift-9", "neutral"),
      outline: (listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
      outlineOffset: "-1px",
      boxShadow: (listener) =>
        `0 ${themeSpacing(1)} ${themeSpacing(4)} ${themeColor(listener, "shift-3", "neutral")}`,
      zIndex: 1,
    },
  } as DomphyElement;
}

/**
 * A glowing SVG beam that pulses along a curved path between two badge nodes,
 * visualizing connection/data flow (e.g. in an architecture diagram). Call
 * with no arguments for a working two-source/one-hub demo; the path geometry
 * is measured from the real DOM positions of the nodes on mount and
 * recomputed on resize.
 */
function animatedBeam(props: AnimatedBeamProps = {}): DomphyElement<"div"> {
  const instanceId = ++animatedBeamInstanceCounter;

  const nodes: AnimatedBeamNode[] = props.nodes ?? [
    { id: "source-a", top: "18%", left: "14%", accentColor: "info" },
    { id: "source-b", top: "82%", left: "14%", accentColor: "success" },
    { id: "hub", top: "50%", left: "84%", accentColor: "primary" },
  ];
  const connections: AnimatedBeamConnection[] = props.connections ?? [
    { from: "source-a", to: "hub", curvature: 60, duration: 3200 },
    { from: "source-b", to: "hub", curvature: -60, duration: 3200, delay: 900 },
  ];
  const height = props.height ?? 260;

  const nodeElements = new Map<string, HTMLElement>();
  const registerNode = (id: string, element: HTMLElement | null) => {
    if (element) nodeElements.set(id, element);
    else nodeElements.delete(id);
  };

  interface BeamRuntime {
    staticPathElement: SVGPathElement | null;
    glowPathElement: SVGPathElement | null;
    gradientElement: SVGLinearGradientElement | null;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    hasGeometry: boolean;
  }
  const runtimes: BeamRuntime[] = connections.map(() => ({
    staticPathElement: null,
    glowPathElement: null,
    gradientElement: null,
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    hasGeometry: false,
  }));

  let containerElement: HTMLElement | null = null;
  let svgElement: SVGSVGElement | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let recomputeFrameId: number | null = null;
  let animationFrameId: number | null = null;
  let animationStart: number | null = null;
  let removeWindowListeners: (() => void) | null = null;

  function quadraticPathData(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    curvature: number,
    bend: "vertical" | "horizontal",
  ): string {
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const controlX = bend === "horizontal" ? midX + curvature : midX;
    const controlY = bend === "horizontal" ? midY : midY - curvature;
    return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
  }

  function recompute(): void {
    if (!containerElement) return;
    const containerRect = containerElement.getBoundingClientRect();
    if (containerRect.width === 0 && containerRect.height === 0) return;

    svgElement?.setAttribute(
      "viewBox",
      `0 0 ${containerRect.width} ${containerRect.height}`,
    );

    connections.forEach((connection, index) => {
      const runtime = runtimes[index];
      const fromElement = nodeElements.get(connection.from);
      const toElement = nodeElements.get(connection.to);
      if (!fromElement || !toElement || !runtime.staticPathElement) {
        runtime.hasGeometry = false;
        return;
      }
      const fromRect = fromElement.getBoundingClientRect();
      const toRect = toElement.getBoundingClientRect();

      runtime.startX =
        fromRect.left - containerRect.left + fromRect.width / 2 + (connection.startXOffset ?? 0);
      runtime.startY =
        fromRect.top - containerRect.top + fromRect.height / 2 + (connection.startYOffset ?? 0);
      runtime.endX =
        toRect.left - containerRect.left + toRect.width / 2 + (connection.endXOffset ?? 0);
      runtime.endY =
        toRect.top - containerRect.top + toRect.height / 2 + (connection.endYOffset ?? 0);
      runtime.hasGeometry = true;

      const d = quadraticPathData(
        runtime.startX,
        runtime.startY,
        runtime.endX,
        runtime.endY,
        connection.curvature ?? 40,
        connection.bend ?? "vertical",
      );
      runtime.staticPathElement.setAttribute("d", d);
      runtime.glowPathElement?.setAttribute("d", d);
    });
  }

  // The moving "window" is a short slice of the gradient's own coordinate
  // range, linearly interpolated between the beam's start/end points. Its
  // stops are fixed (transparent -> glow -> transparent), so sliding the
  // window along the vector produces a traveling pulse.
  function tick(timestamp: number): void {
    // Belt-and-suspenders stop condition: some hosts (e.g. a test harness
    // that wipes the DOM directly instead of going through the framework's
    // removal lifecycle) never fire the `_onRemove` hook below. Bailing here
    // once the container is detached prevents this loop from leaking
    // forever across later, unrelated test files.
    if (!containerElement || !containerElement.isConnected) return;
    if (animationStart === null) animationStart = timestamp;
    const bandFraction = 0.28;
    const span = 1 + bandFraction * 2;

    connections.forEach((connection, index) => {
      const runtime = runtimes[index];
      const gradient = runtime.gradientElement;
      if (!gradient || !runtime.hasGeometry) return;

      const duration = connection.duration ?? 3000;
      const delay = connection.delay ?? 0;
      const elapsed = timestamp - animationStart! - delay;
      if (elapsed < 0) return;

      const progress = (elapsed % duration) / duration;
      let windowStart = progress * span - bandFraction;
      let windowEnd = windowStart + bandFraction;
      if (connection.reverse) {
        windowStart = 1 - windowStart;
        windowEnd = 1 - windowEnd;
      }

      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      gradient.setAttribute("x1", String(lerp(runtime.startX, runtime.endX, windowStart)));
      gradient.setAttribute("y1", String(lerp(runtime.startY, runtime.endY, windowStart)));
      gradient.setAttribute("x2", String(lerp(runtime.startX, runtime.endX, windowEnd)));
      gradient.setAttribute("y2", String(lerp(runtime.startY, runtime.endY, windowEnd)));
    });

    animationFrameId = window.requestAnimationFrame(tick);
  }

  function gradientId(index: number): string {
    return `domphy-animated-beam-${instanceId}-${index}`;
  }

  function staticPathElement(
    connection: AnimatedBeamConnection,
    index: number,
  ): DomphyElement {
    return {
      path: null,
      d: "M 0 0",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: String(connection.pathWidth ?? 2),
      strokeLinecap: "round",
      _key: `static-${index}`,
      _onMount: (node: ElementNode) => {
        runtimes[index].staticPathElement = node.domElement as unknown as SVGPathElement;
      },
      _onRemove: () => {
        runtimes[index].staticPathElement = null;
      },
      style: {
        color: (listener) => themeColor(listener, "shift-3", connection.pathColor ?? "neutral"),
        opacity: connection.pathOpacity ?? 0.4,
      },
    } as DomphyElement;
  }

  function glowPathElement(
    connection: AnimatedBeamConnection,
    index: number,
  ): DomphyElement {
    return {
      path: null,
      d: "M 0 0",
      fill: "none",
      stroke: `url(#${gradientId(index)})`,
      strokeWidth: String(connection.glowWidth ?? 3),
      strokeLinecap: "round",
      _key: `glow-${index}`,
      _onMount: (node: ElementNode) => {
        runtimes[index].glowPathElement = node.domElement as unknown as SVGPathElement;
      },
      _onRemove: () => {
        runtimes[index].glowPathElement = null;
      },
    } as DomphyElement;
  }

  function gradientDefinition(
    connection: AnimatedBeamConnection,
    index: number,
  ): DomphyElement {
    const glowColor = connection.glowColor ?? "primary";
    // `<stop>` is a paint-server node, not text — it has no `color` to follow the
    // tone context, so the `missing-color` doctor rule is a false positive here.
    const stop = (offset: string, opacity: number): DomphyElement =>
      ({
        stop: null,
        offset,
        style: { stopColor: (listener) => themeColor(listener, "shift-9", glowColor), stopOpacity: opacity },
        _doctorDisable: "missing-color",
      }) as DomphyElement;
    return {
      linearGradient: [stop("0%", 0), stop("50%", 1), stop("100%", 0)],
      id: gradientId(index),
      gradientUnits: "userSpaceOnUse",
      x1: "0",
      y1: "0",
      x2: "0",
      y2: "0",
      _key: `gradient-${index}`,
      _onMount: (node: ElementNode) => {
        runtimes[index].gradientElement = node.domElement as unknown as SVGLinearGradientElement;
      },
      _onRemove: () => {
        runtimes[index].gradientElement = null;
      },
    } as DomphyElement;
  }

  const svgChildren: DomphyElement[] = [
    { defs: connections.map((connection, index) => gradientDefinition(connection, index)) } as DomphyElement,
    ...connections.flatMap((connection, index) => [
      staticPathElement(connection, index),
      glowPathElement(connection, index),
    ]),
  ];

  return {
    div: [
      ...nodes.map((nodeSpec) => beamNodeElement(nodeSpec, registerNode)),
      {
        svg: svgChildren,
        width: "100%",
        height: "100%",
        xmlns: "http://www.w3.org/2000/svg",
        ariaHidden: "true",
        _onMount: (node: ElementNode) => {
          svgElement = node.domElement as unknown as SVGSVGElement;
        },
        _onRemove: () => {
          svgElement = null;
        },
        style: { position: "absolute", inset: 0, pointerEvents: "none" },
      } as DomphyElement,
    ],
    _onMount: (node: ElementNode) => {
      containerElement = node.domElement as HTMLElement;
      if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") {
        return;
      }

      recomputeFrameId = window.requestAnimationFrame(() => {
        recompute();
        animationFrameId = window.requestAnimationFrame(tick);
      });

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => recompute());
        resizeObserver.observe(containerElement);
      }

      const onLayoutChange = () => recompute();
      window.addEventListener("resize", onLayoutChange);
      window.addEventListener("scroll", onLayoutChange, true);
      removeWindowListeners = () => {
        window.removeEventListener("resize", onLayoutChange);
        window.removeEventListener("scroll", onLayoutChange, true);
      };
    },
    _onRemove: () => {
      if (recomputeFrameId !== null) window.cancelAnimationFrame(recomputeFrameId);
      if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
      resizeObserver = null;
      removeWindowListeners?.();
      removeWindowListeners = null;
      containerElement = null;
    },
    style: {
      position: "relative",
      width: "100%",
      height: `${height}px`,
      overflow: "hidden",
    },
  };
}

export { animatedBeam };
