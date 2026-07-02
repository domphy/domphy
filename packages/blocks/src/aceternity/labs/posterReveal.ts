// Aceternity UI "GTA VI Poster" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A hero
// intro that assembles a grid of poster panels with a staggered zoom-in
// cascade, finished by a slow group-level camera zoom, with a control to
// replay the whole sequence.
//
// The reference demo's own content happens to be box art for a specific
// unreleased game (per the spec's research note) — that artwork is not
// reproduced here. This component is data-driven (an ordered `layers` array)
// and ships with generic themed placeholder panels instead.
//
// Replay is implemented the same way textAnimate.ts replays on text change:
// there is no "rewind this WAAPI animation" primitive, so a version counter
// is folded into every layer's `_key`. Bumping the counter makes the whole
// poster subtree a *new* set of DOM nodes on the next render, which tears
// down the old ones and re-mounts fresh ones — and since `motion()`'s
// initial -> animate tween runs from `_onMount`, that remount is exactly
// "replay the timeline from the start" for free.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { heading, motion } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface PosterLayer {
  id: string;
  /** Panel label — shown as decorative micro-text on placeholder panels, and read by screen readers via `ariaLabel`. */
  label: string;
  /** Photo/artwork source. Defaults to a themed gradient placeholder when omitted. */
  imageSrc?: string;
  /** Placeholder gradient family, used only when `imageSrc` is omitted. */
  colorFamily?: ThemeColor;
  /** `"wordmark"` layers render bold centered text over the grid instead of a media panel — still positioned via `gridColumn`/`gridRow` like any other layer (typically `"1 / -1"` to span the whole poster). Defaults to `"panel"`. */
  kind?: "panel" | "wordmark";
  /** CSS grid placement within the poster's 3x3 grid, e.g. `"1 / 2"`. */
  gridColumn: string;
  gridRow: string;
  /** Exaggerated starting scale this layer zooms in from. Defaults to `1.55`. */
  initialScale?: number;
  /** Exaggerated starting offset (px) this layer settles in from. Both default to `0`. */
  initialOffsetX?: number;
  initialOffsetY?: number;
  /** Reveal delay, in ms. Defaults to `index * 130`. */
  delay?: number;
  /** Reveal duration, in ms. Defaults to `props.revealDuration`. */
  duration?: number;
  /** Per-layer easing override. Defaults to `props.revealEasing`. */
  easing?: string;
}

export interface PosterRevealProps {
  layers?: PosterLayer[];
  /** Default reveal duration for layers that don't set their own, in ms. Defaults to `700`. */
  revealDuration?: number;
  /** Default reveal easing for layers that don't set their own — a springy overshoot-then-settle
   * curve (Domphy has no bundled spring integrator; see `dock.ts`/`cardStack.ts` for the same
   * cubic-bezier approximation elsewhere in this package). Defaults to `"cubic-bezier(0.34, 1.56, 0.64, 1)"`. */
  revealEasing?: string;
  /** Group-level "camera zoom" scale played once every layer has settled. Defaults to `1.035`. */
  cameraZoomScale?: number;
  /** Camera zoom duration, in ms. Defaults to `1300`. */
  cameraZoomDuration?: number;
  /** Poster frame aspect ratio. Defaults to `"3 / 4"` (portrait). */
  aspectRatio?: string;
  /** Poster frame max width, in `themeSpacing` units. Defaults to `100`. */
  maxWidthUnits?: number;
  showReplayControl?: boolean;
  /** Fired once, after the last layer has settled and the camera zoom has finished. */
  onSequenceComplete?: () => void;
  style?: StyleObject;
}

const PLACEHOLDER_COLORS: ThemeColor[] = ["primary", "secondary", "info", "success", "attention", "highlight"];

function defaultPanelLayers(): PosterLayer[] {
  const cells: PosterLayer[] = [];
  for (let row = 1; row <= 3; row++) {
    for (let column = 1; column <= 3; column++) {
      const index = cells.length;
      cells.push({
        id: `panel-${index}`,
        label: `Panel ${index + 1}`,
        colorFamily: PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length],
        gridColumn: `${column} / ${column + 1}`,
        gridRow: `${row} / ${row + 1}`,
        initialScale: 1.5 + (index % 3) * 0.08,
        delay: index * 130,
      });
    }
  }
  return cells;
}

function defaultLayers(): PosterLayer[] {
  const panels = defaultPanelLayers();
  const wordmark: PosterLayer = {
    id: "wordmark",
    label: "Wordmark",
    kind: "wordmark",
    gridColumn: "1 / -1",
    gridRow: "1 / -1",
    initialScale: 1.3,
    delay: panels.length * 130,
    duration: 620,
  };
  return [...panels, wordmark];
}

function refreshGlyph(): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [
          {
            path: null,
            d: "M4 12a8 8 0 0 1 13.2-6.1L20 8.3",
            fill: "none",
          } as DomphyElement<"path">,
          { polygon: null, points: "20,3.6 20,9.3 14.3,7.7" } as DomphyElement<"polygon">,
          {
            path: null,
            d: "M20 12a8 8 0 0 1-13.2 6.1L4 15.7",
            fill: "none",
          } as DomphyElement<"path">,
          { polygon: null, points: "4,20.4 4,14.7 9.7,16.3" } as DomphyElement<"polygon">,
        ],
        viewBox: "0 0 24 24",
        fill: "currentColor",
        stroke: "currentColor",
        strokeWidth: "1.6",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    ariaHidden: "true",
    style: { display: "inline-flex", width: themeSpacing(4.5), height: themeSpacing(4.5) },
  };
}

function panelMedia(layer: PosterLayer, index: number): DomphyElement<"div"> {
  if (layer.imageSrc) {
    return {
      div: null,
      style: {
        position: "absolute",
        inset: 0,
        backgroundImage: `url(${layer.imageSrc})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      },
    } as DomphyElement<"div">;
  }
  const family = layer.colorFamily ?? PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
  return {
    div: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      backgroundImage: (listener: Listener) =>
        `linear-gradient(155deg, ${themeColor(listener, "shift-8", family)}, ${themeColor(listener, "shift-15", family)})`,
    },
  } as DomphyElement<"div">;
}

function wordmarkContent(text: string): DomphyElement<"div"> {
  return {
    div: [
      {
        h1: text,
        $: [heading({ color: "neutral" })],
        style: {
          margin: 0,
          textAlign: "center",
          textTransform: "uppercase",
          color: (listener: Listener) => themeColor(listener, "shift-11", "neutral"),
        } as StyleObject,
      } as DomphyElement<"h1">,
    ],
    ariaHidden: "true",
    // Decorative scrim with no text of its own (the h1 inside sets its own color via
    // heading()) — exempt from the missing-color contract, matching focusCards.ts's
    // bottom-title scrim.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: themeSpacing(4),
      backgroundImage: (listener: Listener) =>
        `radial-gradient(ellipse at center, ${themeColor(listener, "shift-17", "neutral")} 0%, transparent 70%)`,
    } as StyleObject,
  } as DomphyElement<"div">;
}

function buildLayer(
  layer: PosterLayer,
  index: number,
  version: number,
  defaultDuration: number,
  defaultEasing: string,
): DomphyElement<"div"> {
  const delay = layer.delay ?? index * 130;
  const duration = layer.duration ?? defaultDuration;
  const easing = layer.easing ?? defaultEasing;
  const initialScale = layer.initialScale ?? 1.55;
  const isWordmark = layer.kind === "wordmark";

  return {
    div: [isWordmark ? wordmarkContent(layer.label) : panelMedia(layer, index)],
    _key: `${layer.id}-${version}`,
    ariaLabel: layer.label,
    // The layer wrapper's own `outline` is a decorative panel-seam border, not text —
    // the panel/wordmark content inside sets its own color independently.
    _doctorDisable: "missing-color",
    $: [
      motion({
        initial: {
          scale: initialScale,
          x: layer.initialOffsetX ?? 0,
          y: layer.initialOffsetY ?? 0,
          opacity: isWordmark ? 0 : 1,
        },
        animate: { scale: 1, x: 0, y: 0, opacity: 1 },
        transition: { duration, delay, easing },
      }),
    ],
    style: {
      position: "relative",
      gridColumn: layer.gridColumn,
      gridRow: layer.gridRow,
      overflow: isWordmark ? "visible" : "hidden",
      zIndex: isWordmark ? 2 : 1,
      outline: isWordmark ? "none" : (listener: Listener) => `1px solid ${themeColor(listener, "shift-4", "neutral")}`,
      outlineOffset: "-1px",
    } as StyleObject,
  } as DomphyElement<"div">;
}

/**
 * A hero intro that assembles a grid of poster panels with a staggered
 * zoom-in cascade, finished by a slow group-level camera zoom. Call with no
 * arguments for a working demo — a 3x3 grid of themed placeholder panels plus
 * a centered wordmark, with a working replay control. Data-driven via
 * `props.layers`; the reference demo's specific box-art content is not
 * reproduced.
 */
function posterReveal(props: PosterRevealProps = {}): DomphyElement<"div"> {
  const layers = props.layers && props.layers.length > 0 ? props.layers : defaultLayers();
  const defaultDuration = props.revealDuration ?? 700;
  const defaultEasing = props.revealEasing ?? "cubic-bezier(0.34, 1.56, 0.64, 1)";
  const cameraZoomScale = props.cameraZoomScale ?? 1.035;
  const cameraZoomDuration = props.cameraZoomDuration ?? 1300;
  const aspectRatio = props.aspectRatio ?? "3 / 4";
  const maxWidthUnits = props.maxWidthUnits ?? 100;
  const showReplayControl = props.showReplayControl ?? true;

  const replayVersion = toState(0);

  const totalCascadeMs = layers.reduce((max, layer, index) => {
    const delay = layer.delay ?? index * 130;
    const duration = layer.duration ?? defaultDuration;
    return Math.max(max, delay + duration);
  }, 0);

  let sequenceTimer: ReturnType<typeof setTimeout> | null = null;
  const scheduleCompletion = () => {
    if (sequenceTimer) clearTimeout(sequenceTimer);
    if (!props.onSequenceComplete) return;
    sequenceTimer = setTimeout(props.onSequenceComplete, totalCascadeMs + cameraZoomDuration);
  };

  function buildPoster(version: number): DomphyElement<"div"> {
    return {
      div: layers.map((layer, index) => buildLayer(layer, index, version, defaultDuration, defaultEasing)),
      _key: `poster-frame-${version}`,
      $: [
        motion({
          animate: { scale: cameraZoomScale },
          transition: { duration: cameraZoomDuration, delay: totalCascadeMs, easing: "ease-out" },
        }),
      ],
      style: {
        position: "absolute",
        inset: 0,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
      } as StyleObject,
    };
  }

  const replayButton: DomphyElement<"button"> | null = showReplayControl
    ? ({
        button: [refreshGlyph()],
        type: "button",
        ariaLabel: "Replay poster reveal",
        onClick: () => replayVersion.set(replayVersion.get() + 1),
        dataTone: "shift-0",
        style: {
          position: "absolute",
          insetBlockStart: themeSpacing(3),
          insetInlineStart: themeSpacing(3),
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: themeSpacing(9),
          height: themeSpacing(9),
          border: "none",
          borderRadius: "50%",
          cursor: "pointer",
          backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
          color: (listener: Listener) => themeColor(listener, "shift-9"),
          boxShadow: (listener: Listener) => `0 ${themeSpacing(1)} ${themeSpacing(4)} ${themeColor(listener, "shift-4", "neutral")}`,
        },
      } as DomphyElement<"button">)
    : null;

  return {
    div: [
      { div: (listener: Listener) => [buildPoster(replayVersion.get(listener))], style: { position: "relative", width: "100%", height: "100%" } } as DomphyElement<"div">,
      ...(replayButton ? [replayButton] : []),
    ],
    ariaLabel: "Poster reveal",
    dataTone: "shift-17",
    _onMount: (node: ElementNode) => {
      scheduleCompletion();
      const release = replayVersion.addListener(() => scheduleCompletion());
      node.addHook("Remove", () => {
        release();
        if (sequenceTimer) clearTimeout(sequenceTimer);
      });
    },
    style: {
      position: "relative",
      width: "100%",
      maxWidth: themeSpacing(maxWidthUnits),
      aspectRatio,
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { posterReveal };
