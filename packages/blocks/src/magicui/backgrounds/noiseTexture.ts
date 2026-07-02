// magicui "Noise Texture" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A thin
// overlay rendering fine grayscale film-grain/static noise, meant to be
// layered over cards, buttons, or backgrounds for texture.
//
// FIDELITY GAP — read before assuming this is a literal SVG-filter port:
// the spec's domSketch calls for an SVG `<feTurbulence>` fractal-noise
// filter chained through `<feColorMatrix>`/`<feComponentTransfer>`. Domphy
// core's `SvgTags` allowlist (`packages/core/src/constants/SvgTags.ts` —
// the table `ElementNode._createDOMNode` consults to decide whether to
// `document.createElementNS` an element into the SVG namespace, versus
// falling back to a plain unnamespaced `document.createElement`) does not
// include `feTurbulence`, `feComponentTransfer`, or `feFuncR/G/B/A`, even
// though those tag names ARE recognized elsewhere (`HtmlTags`, so doctor's
// `unknown-tag` rule stays silent and `getTagName` resolves them fine).
// Concretely: `{ feTurbulence: null, ... }` would render as an inert,
// unnamespaced `HTMLUnknownElement` in a real browser — SVG filter
// primitives only take effect inside the SVG namespace — so the filter
// would silently produce zero noise. Rather than ship a component that
// renders nothing, this is reimplemented as a `<canvas>` grayscale grain
// generator with an equivalent public API (`frequency`/`octaves`/`slope`/
// `noiseOpacity`) and the same visual result: a static, desaturated,
// speckled grain field. A literal SVG-filter version would become possible
// with a one-line addition to `SvgTags` in `@domphy/core` (out of scope for
// this package).

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { paragraph, strong } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";

export interface NoiseTextureProps {
  /** Controls grain fineness — higher values produce smaller, finer speckles. Defaults to `0.4`. */
  frequency?: number;
  /** Number of blended fractal-noise layers (finer accumulated detail per layer). Defaults to `6`. */
  octaves?: number;
  /** Brightness multiplier applied to the grayscale grain, controlling contrast/intensity. Defaults to `0.15`. */
  slope?: number;
  /** Overall opacity of the noise layer. Defaults to `0.6`. */
  noiseOpacity?: number;
  /** Deterministic seed for the noise field — the same seed reproduces the same grain.
   * Defaults to a per-instance value (so repeated calls without an explicit seed still differ). */
  seed?: number;
  /** Content the noise layer is composited over. Defaults to a small demo panel. */
  children?: DomphyElement | DomphyElement[];
  /** Passthrough style merged onto the outer wrapper. */
  style?: StyleObject;
}

let noiseTextureInstanceCounter = 0;

/** Seeded pseudo-random generator (mulberry32) — deterministic per seed, no external RNG dependency. */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Draws one static grayscale grain field into the canvas, sized to its current bounding box.
 * Multi-octave value noise (not Perlin) summed with halving amplitude per octave, approximating
 * the layered-detail read of a real fractal-noise filter without needing one. */
function drawNoise(canvas: HTMLCanvasElement, frequency: number, octaves: number, slope: number, seed: number): void {
  const context = canvas.getContext("2d");
  if (!context) return;

  const width = Math.max(1, Math.round(canvas.clientWidth || 1));
  const height = Math.max(1, Math.round(canvas.clientHeight || 1));
  canvas.width = width;
  canvas.height = height;

  // Higher frequency → smaller grain cells (finer speckle); lower → coarser blobs.
  const cellSize = Math.max(1, Math.min(40, Math.round(2 / Math.max(0.02, frequency))));
  const random = createSeededRandom(seed);
  const octaveCount = Math.max(1, Math.round(octaves));

  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      let value = 0;
      let amplitude = 1;
      let amplitudeTotal = 0;
      for (let octave = 0; octave < octaveCount; octave += 1) {
        value += random() * amplitude;
        amplitudeTotal += amplitude;
        amplitude *= 0.5;
      }
      const normalized = amplitudeTotal > 0 ? value / amplitudeTotal : 0;
      const gray = Math.max(0, Math.min(255, Math.round(normalized * 255 * slope * 4)));
      // Equal R/G/B by construction — fully desaturated grayscale, no separate
      // feColorMatrix desaturation step needed.
      context.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
      context.fillRect(x, y, cellSize, cellSize);
    }
  }
}

function defaultChildren(): DomphyElement[] {
  return [
    { strong: "Textured surface", $: [strong()] } as DomphyElement,
    {
      p: "A subtle desaturated grain layered over this panel via canvas, not an SVG filter — see the fidelity note in this file.",
      $: [paragraph()],
    } as DomphyElement,
  ];
}

/**
 * Overlay rendering fine grayscale film-grain/static noise, meant to be
 * layered over cards, buttons, or backgrounds for texture. Implemented as a
 * `<canvas>` grain generator (see the fidelity note above the module for
 * why — Domphy core doesn't yet namespace the SVG filter-primitive tags the
 * upstream technique needs). Static by default: one fixed noise field per
 * mount/seed; any fade-in/out is left to the caller's own CSS transition on
 * hover/group-hover, same as the upstream pattern. Call with no arguments
 * for a working demo — a small textured panel.
 */
function noiseTexture(props: NoiseTextureProps = {}): DomphyElement<"div"> {
  const instanceId = ++noiseTextureInstanceCounter;
  const frequency = props.frequency ?? 0.4;
  const octaves = props.octaves ?? 6;
  const slope = props.slope ?? 0.15;
  const noiseOpacity = props.noiseOpacity ?? 0.6;
  const seed = props.seed ?? instanceId * 97 + 1;

  const contentChildren = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultChildren();

  const canvasElement: DomphyElement<"canvas"> = {
    canvas: null,
    ariaHidden: "true",
    _onMount: (node: ElementNode) => {
      const canvas = node.domElement as unknown as HTMLCanvasElement;
      const redraw = () => drawNoise(canvas, frequency, octaves, slope, seed);
      redraw();

      let observer: ResizeObserver | null = null;
      if (typeof ResizeObserver === "function") {
        observer = new ResizeObserver(() => redraw());
        observer.observe(canvas);
      }

      node.addHook("Remove", () => {
        observer?.disconnect();
        observer = null;
      });
    },
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      // Reads as a texture multiply over whatever content sits beneath.
      mixBlendMode: "multiply",
      opacity: noiseOpacity,
    } as StyleObject,
  } as DomphyElement<"canvas">;

  return {
    div: [{ div: contentChildren, style: { position: "relative" } }, canvasElement],
    dataTone: "shift-1",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(8),
      minHeight: themeSpacing(40),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { noiseTexture };
