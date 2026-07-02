// Magic UI "Dot Pattern" — clean-room reimplementation.
//
// A background of evenly spaced small dots (dot-grid paper style), with an
// optional per-dot twinkling glow animation. Implemented purely from the
// block's public functional/visual spec — no upstream Magic UI source was
// viewed or copied.
//
// Unlike this package's `gridPattern` (a single tiled SVG `<pattern>`, which
// stamps identical content at every tile and so cannot give any one tile its
// own independent random timing), `glow` mode needs each visible dot to
// animate on its own randomized duration/delay. That rules out a `<pattern>`
// tile here, so the dot grid is built from individual `<circle>` elements
// instead, managed imperatively: on mount (and on every `ResizeObserver`
// firing), the container is measured, the previous circle set is cleared,
// and a fresh grid sized to the real pixel dimensions divided by spacing is
// appended directly via `document.createElementNS` — bypassing Domphy's
// declarative diffing for this one dynamic-count layer, the same way
// `particles`/`flickeringGrid` manage their canvas pixels imperatively
// rather than through the declarative tree. Non-glow dots are plain
// `fill="currentColor"` circles (no per-dot color at all); glow dots read
// from a shared `<radialGradient>` (bright core fading to transparent) and
// each get their own randomized `animation-duration`/`animation-delay` on
// one shared "there and back" scale+opacity `@keyframes`, so no two dots
// twinkle in sync.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface DotPatternProps {
  /** Horizontal spacing between dots, in px. Defaults to `16`. */
  width?: number;
  /** Vertical spacing between dots, in px. Defaults to `16`. */
  height?: number;
  /** Whole-pattern horizontal offset, in px. Defaults to `0`. */
  x?: number;
  /** Whole-pattern vertical offset, in px. Defaults to `0`. */
  y?: number;
  /** Per-dot horizontal center offset within its cell, in px. Defaults to `1`. */
  cx?: number;
  /** Per-dot vertical center offset within its cell, in px. Defaults to `1`. */
  cy?: number;
  /** Dot radius, in px. Defaults to `1`. */
  cr?: number;
  /** Turns on the animated glow (randomized per-dot pulse). Defaults to `false`. */
  glow?: boolean;
  /** Theme color family for the dots/glow core. Defaults to `"neutral"`. */
  color?: ThemeColor;
  /** Foreground content layered above the dot field. Defaults to a small demo heading. */
  children?: DomphyElement | DomphyElement[];
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

let dotPatternInstanceCounter = 0;

const GLOW_PULSE_KEYFRAMES = {
  "0%,100%": { transform: "scale(0.85)", opacity: "0.6" },
  "50%": { transform: "scale(1.25)", opacity: "1" },
};

/**
 * A background of evenly spaced dots, optionally twinkling with an
 * independently-randomized glow per dot. Call with no arguments for a
 * working demo — a dark panel with a static dot grid behind a heading.
 */
function dotPattern(props: DotPatternProps = {}): DomphyElement<"div"> {
  const spacingWidth = Math.max(1, props.width ?? 16);
  const spacingHeight = Math.max(1, props.height ?? 16);
  const patternOffsetX = props.x ?? 0;
  const patternOffsetY = props.y ?? 0;
  const dotOffsetX = props.cx ?? 1;
  const dotOffsetY = props.cy ?? 1;
  const dotRadius = props.cr ?? 1;
  const glow = props.glow ?? false;
  const color = props.color ?? "neutral";

  const instanceId = ++dotPatternInstanceCounter;
  const glowGradientId = `domphy-dot-pattern-glow-${instanceId}`;
  const glowAnimationName = `dot-pattern-glow-pulse-${hashString(
    JSON.stringify({ instanceId, GLOW_PULSE_KEYFRAMES }),
  )}`;

  const contentChildren: DomphyElement[] = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : [
        { h2: "Dot Pattern", $: [heading()] } as DomphyElement,
        {
          p: glow
            ? "A dot grid where every dot twinkles on its own random cadence."
            : "A static dot-grid-paper background.",
          $: [paragraph()],
        } as DomphyElement,
      ];

  const glowDefs: DomphyElement[] = glow
    ? [
        {
          radialGradient: [
            {
              stop: null,
              offset: "0%",
              // Decorative gradient stop, no text of its own.
              _doctorDisable: "missing-color",
              style: { stopColor: (listener: Listener) => themeColor(listener, "shift-11", color) } as StyleObject,
            } as DomphyElement,
            {
              stop: null,
              offset: "100%",
              _doctorDisable: "missing-color",
              style: {
                stopColor: (listener: Listener) => themeColor(listener, "shift-11", color),
                stopOpacity: "0",
              } as StyleObject,
            } as DomphyElement,
          ],
          id: glowGradientId,
        } as DomphyElement,
      ]
    : [];

  const dotLayer: DomphyElement = {
    g: [],
    dataDotPatternLayer: "true",
    // Mount hooks fire top-down, right after THIS node's own DOM element is
    // created and appended into its parent (see `ElementNode.render`'s
    // recursion order) — so `node.domElement` here is always a real `<g>`
    // already attached under the outer `<svg>`, with no need to query for
    // it from an ancestor (which would fire too early, before this `<g>`
    // exists at all).
    _onMount: (node: ElementNode) => {
      const groupElement = node.domElement as SVGGElement | null;
      const svgElement = groupElement?.ownerSVGElement ?? null;
      if (!groupElement || !svgElement || typeof window === "undefined") return;
      const svgNamespace = "http://www.w3.org/2000/svg";

      let dotCircles: SVGCircleElement[] = [];

      function buildDot(pointX: number, pointY: number): SVGCircleElement {
        const circle = document.createElementNS(svgNamespace, "circle");
        circle.setAttribute("cx", String(pointX));
        circle.setAttribute("cy", String(pointY));
        circle.setAttribute("r", String(dotRadius));
        if (glow) {
          circle.setAttribute("fill", `url(#${glowGradientId})`);
          const durationSeconds = 1.6 + Math.random() * 1.4;
          const delaySeconds = Math.random() * 3;
          circle.style.transformBox = "fill-box";
          circle.style.transformOrigin = "center";
          circle.style.animation = `${glowAnimationName} ${durationSeconds}s ease-in-out ${delaySeconds}s infinite`;
        } else {
          circle.setAttribute("fill", "currentColor");
        }
        return circle;
      }

      function reflow(): void {
        const rect = svgElement!.getBoundingClientRect();
        // jsdom/non-layout runtimes measure 0×0 — fall back to a modest
        // default grid so the component still renders something structural.
        const measuredWidth = rect.width || 320;
        const measuredHeight = rect.height || 200;
        const columns = Math.max(1, Math.ceil(measuredWidth / spacingWidth) + 1);
        const rows = Math.max(1, Math.ceil(measuredHeight / spacingHeight) + 1);

        // The grid is small/cheap enough (dozens to a few hundred cells) that
        // a full rebuild on every resize is simpler and safer than diffing
        // individual dot survival across a changed column/row count.
        for (const circle of dotCircles) circle.remove();
        dotCircles = [];
        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            const pointX = patternOffsetX + dotOffsetX + column * spacingWidth;
            const pointY = patternOffsetY + dotOffsetY + row * spacingHeight;
            const circle = buildDot(pointX, pointY);
            groupElement!.appendChild(circle);
            dotCircles.push(circle);
          }
        }
      }

      reflow();

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => reflow());
        resizeObserver.observe(svgElement);
      }

      node.addHook("Remove", () => {
        resizeObserver?.disconnect();
        for (const circle of dotCircles) circle.remove();
        dotCircles = [];
      });
    },
  } as DomphyElement;

  const gridSvg: DomphyElement = {
    svg: [...(glowDefs.length ? [{ defs: glowDefs } as DomphyElement] : []), dotLayer],
    ariaHidden: "true",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      color: (listener: Listener) => themeColor(listener, "shift-6", color),
    } as StyleObject,
  } as DomphyElement;

  return {
    div: [
      gridSvg,
      {
        div: contentChildren,
        style: { position: "relative", zIndex: 1 },
      } as DomphyElement,
    ],
    dataTone: "shift-15",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(8),
      minHeight: themeSpacing(64),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { dotPattern };
