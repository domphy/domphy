// Aceternity UI "Background Beams" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). An
// ambient hero-section background made of many long, gently curved SVG
// fibers overlapping on a dark backdrop, each carrying its own softly
// traveling color band.
//
// The stroke technique is the same "static path, moving gradient" idiom this
// package already uses for `animatedBeam()`: the `<path>` shapes themselves
// never move — only each path's own `<linearGradient>` slides its stops along
// a diagonal window, which reads as a colored band traveling down the fiber.
// Rather than `animatedBeam()`'s `userSpaceOnUse` + measured-pixel window
// (needed there because it connects two real DOM node positions),
// beams here use the SVG default `objectBoundingBox` gradient space — the
// window slides through `-0.3,-0.3` → `1.3,1.3` in the path's own 0–1
// bounding-box coordinates, so no `ResizeObserver`/`getBoundingClientRect`
// measuring is needed at all. The tradeoff (see `fidelityNotes`): the band
// travels along the bounding box's diagonal, not literally hugging every
// bend of a curved path — a fine approximation for gently-curved fibers.
//
// A single shared `requestAnimationFrame` loop drives every beam's gradient
// each frame (each beam keeps its own randomized duration/delay so they
// desync), gated by an `IntersectionObserver` that pauses the whole loop
// while the effect is scrolled out of view — the same perf idiom
// `flickeringGrid()` uses. A radial-gradient overlay div on top fades the
// beams out near the container's edges.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface BackgroundBeamsProps {
  /** Custom SVG path `d` strings, overriding the default generated fibers. */
  paths?: string[];
  /** Number of default beams generated when `paths` is omitted. Capped for
   * performance (the reference ships roughly 50; this defaults far lower).
   * Defaults to `20`. */
  count?: number;
  /** Theme color roles cycled across each beam's traveling band (three
   * consecutive roles per beam approximate a multi-hue "cyan-purple-magenta"
   * band). Defaults to `["info", "primary", "secondary"]`. */
  colors?: ThemeColor[];
  /** Seconds per beam's full travel cycle (base value — actual per-beam
   * duration is randomized around it so beams desync). Defaults to `8`. */
  duration?: number;
  /** Blur radius applied to every beam's stroke, in px. Defaults to `1.5`. */
  blur?: number;
  /** Toggles the radial-gradient edge-fade overlay. Defaults to `true`. */
  showVignette?: boolean;
  /** Foreground content layered above the beams. Defaults to a small demo heading. */
  children?: DomphyElement | DomphyElement[];
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

const VIEWBOX_WIDTH = 800;
const VIEWBOX_HEIGHT = 500;

let backgroundBeamsInstanceCounter = 0;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** One gently S-curved fiber running roughly top-to-bottom across the viewBox. */
function buildDefaultBeamPath(index: number, count: number): string {
  const startX = (count <= 1 ? 0.5 : index / (count - 1)) * VIEWBOX_WIDTH * 1.3 - VIEWBOX_WIDTH * 0.15;
  const startY = -30 - Math.random() * 40;
  const endX = startX + randomBetween(-90, 90);
  const endY = VIEWBOX_HEIGHT + 30 + Math.random() * 40;
  const controlOneX = startX + randomBetween(-70, 70);
  const controlOneY = VIEWBOX_HEIGHT * 0.33;
  const controlTwoX = endX + randomBetween(-70, 70);
  const controlTwoY = VIEWBOX_HEIGHT * 0.66;
  return `M${startX.toFixed(1)} ${startY.toFixed(1)} C${controlOneX.toFixed(1)} ${controlOneY.toFixed(1)}, ${controlTwoX.toFixed(1)} ${controlTwoY.toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}`;
}

interface BeamRuntime {
  gradientElement: SVGLinearGradientElement | null;
  durationSeconds: number;
  delaySeconds: number;
}

/**
 * Full-bleed ambient background of many overlapping, independently traveling
 * SVG light fibers on a dark backdrop — purely decorative, no pointer
 * interaction. Call with no arguments for a working demo — twenty desynced
 * beams behind a heading.
 */
function backgroundBeams(props: BackgroundBeamsProps = {}): DomphyElement<"div"> {
  const instanceId = ++backgroundBeamsInstanceCounter;
  const colors = props.colors && props.colors.length > 0 ? props.colors : (["info", "primary", "secondary"] as ThemeColor[]);
  const count = Math.max(1, Math.round(props.count ?? 20));
  const baseDuration = props.duration ?? 8;
  const blur = props.blur ?? 1.5;
  const showVignette = props.showVignette ?? true;
  const filterId = `domphy-background-beams-blur-${instanceId}`;

  const pathStrings = props.paths && props.paths.length > 0 ? props.paths : Array.from({ length: count }, (_unused, index) => buildDefaultBeamPath(index, count));

  const runtimes: BeamRuntime[] = pathStrings.map(() => ({
    gradientElement: null,
    durationSeconds: baseDuration * randomBetween(0.7, 1.3),
    delaySeconds: randomBetween(0, baseDuration),
  }));

  function gradientId(index: number): string {
    return `domphy-background-beams-gradient-${instanceId}-${index}`;
  }

  // `<stop>` is a paint-server node, not text — it has no `color` to follow the
  // tone context, so the `missing-color` doctor rule is a false positive here
  // (mirrors animatedBeam.ts's own gradient stops).
  function bandStop(offset: string, opacity: number, color: ThemeColor): DomphyElement {
    return {
      stop: null,
      offset,
      style: { stopColor: (listener) => themeColor(listener, "shift-10", color), stopOpacity: opacity } as StyleObject,
      _doctorDisable: "missing-color",
    } as DomphyElement;
  }

  function beamGradient(index: number): DomphyElement {
    const colorA = colors[index % colors.length];
    const colorB = colors[(index + 1) % colors.length];
    const colorC = colors[(index + 2) % colors.length];
    return {
      linearGradient: [
        bandStop("0%", 0, colorA),
        bandStop("25%", 0.6, colorA),
        bandStop("50%", 1, colorB),
        bandStop("75%", 0.6, colorC),
        bandStop("100%", 0, colorC),
      ],
      id: gradientId(index),
      // objectBoundingBox (SVG default) — no explicit x1/y1/x2/y2 attrs needed
      // beyond the ones the rAF loop writes imperatively each frame.
      _key: `gradient-${index}`,
      _onMount: (node: ElementNode) => {
        runtimes[index].gradientElement = node.domElement as unknown as SVGLinearGradientElement;
      },
      _onRemove: () => {
        runtimes[index].gradientElement = null;
      },
    } as DomphyElement;
  }

  function beamPath(d: string, index: number): DomphyElement {
    return {
      path: null,
      d,
      fill: "none",
      stroke: `url(#${gradientId(index)})`,
      strokeWidth: "1.4",
      strokeLinecap: "round",
      _key: `beam-${index}`,
      style: { filter: `url(#${filterId})` } as StyleObject,
    } as DomphyElement;
  }

  const blurFilter: DomphyElement = {
    filter: [{ feGaussianBlur: null, stdDeviation: String(blur) } as DomphyElement],
    id: filterId,
    x: "-50%",
    y: "-50%",
    width: "200%",
    height: "200%",
  } as DomphyElement;

  const svgLayer: DomphyElement = {
    svg: [
      { defs: [blurFilter, ...pathStrings.map((_unused, index) => beamGradient(index))] } as DomphyElement,
      ...pathStrings.map((d, index) => beamPath(d, index)),
    ],
    viewBox: `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`,
    preserveAspectRatio: "none",
    ariaHidden: "true",
    style: { position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" } as StyleObject,
  } as DomphyElement;

  const vignetteOverlay: DomphyElement = {
    div: null,
    ariaHidden: "true",
    // Decorative edge-fade overlay with no text of its own.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      backgroundImage: (listener) => `radial-gradient(ellipse at center, transparent 35%, ${themeColor(listener, "inherit")} 100%)`,
    } as StyleObject,
  } as DomphyElement;

  const contentChildren: DomphyElement[] = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : [
        { h2: "Background Beams", $: [heading()] } as DomphyElement,
        {
          p: "A field of long, softly traveling light fibers behind your content.",
          $: [paragraph()],
        } as DomphyElement,
      ];

  return {
    div: [svgLayer, ...(showVignette ? [vignetteOverlay] : []), { div: contentChildren, style: { position: "relative", zIndex: 1 } } as DomphyElement],
    dataTone: "shift-15",
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const containerElement = node.domElement as HTMLElement;

      let animationFrameId: number | null = null;
      let intersectionObserver: IntersectionObserver | null = null;

      function tick(timeMs: number): void {
        // Belt-and-suspenders stop condition: some hosts (e.g. a test harness
        // that wipes the DOM directly instead of going through the framework's
        // removal lifecycle) never fire the "Remove" hook below, and this loop
        // has no other convergence condition — it reschedules unconditionally
        // every frame. Bailing here once the container is detached prevents
        // it from leaking forever.
        if (!containerElement.isConnected) return;
        const timeSeconds = timeMs / 1000;
        const bandHalf = 0.3;
        for (const runtime of runtimes) {
          const gradient = runtime.gradientElement;
          if (!gradient) continue;
          const elapsed = timeSeconds - runtime.delaySeconds;
          if (elapsed < 0) continue;
          const progress = (elapsed % runtime.durationSeconds) / runtime.durationSeconds;
          const slide = -bandHalf + progress * (1 + bandHalf * 2);
          gradient.setAttribute("x1", slide.toFixed(3));
          gradient.setAttribute("y1", slide.toFixed(3));
          gradient.setAttribute("x2", (slide + bandHalf).toFixed(3));
          gradient.setAttribute("y2", (slide + bandHalf).toFixed(3));
        }
        animationFrameId = window.requestAnimationFrame(tick);
      }

      function startLoop(): void {
        if (animationFrameId !== null) return;
        animationFrameId = window.requestAnimationFrame(tick);
      }
      function stopLoop(): void {
        if (animationFrameId === null) return;
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      if (typeof IntersectionObserver === "function") {
        intersectionObserver = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) startLoop();
            else stopLoop();
          }
        });
        intersectionObserver.observe(containerElement);
      } else {
        startLoop();
      }

      node.addHook("Remove", () => {
        stopLoop();
        intersectionObserver?.disconnect();
      });
    },
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(8),
      minHeight: themeSpacing(80),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { backgroundBeams };
