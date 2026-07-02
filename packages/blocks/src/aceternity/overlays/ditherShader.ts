// Aceternity UI "Dither Shader" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). Converts a
// source photo into a real-time ordered-dithering render (Bayer/halftone/
// noise/crosshatch) for a retro, pixel-art look.
//
// Same "sample once onto a hidden downscale canvas, redraw onto the visible
// one" split this package's `pixelatedCanvas`/`asciiArt` already use: a
// hidden canvas draws the loaded image scaled down to `columns x rows`
// (one `getImageData()` pixel per grid cell — the browser's own bilinear
// downsample does the per-cell averaging), and the visible canvas redraws
// every cell each pass using one of 4 per-cell decision rules:
//
// - "bayer": classic ordered dithering against a 4x4 Bayer threshold matrix.
// - "noise": the same threshold-vs-luminance test, but the per-cell
//   threshold comes from a deterministic pseudo-random hash instead of a
//   fixed matrix.
// - "halftone": no binary on/off — each cell draws a variable-radius dot,
//   radius scaling with the cell's darkness (classic newsprint halftone).
// - "crosshatch": each cell quantizes to one of 4 density bands (none / one
//   diagonal / crossed diagonals / filled), band count standing in for tone.
//
// `animated` re-runs the exact same per-cell pass every frame with the
// matrix/noise/jitter phase offset by elapsed time (a `requestAnimationFrame`
// loop, throttled and gated by `IntersectionObserver`, matching this
// package's other continuous canvas loops) instead of doing a single
// synchronous pass on load.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { type ThemeColor, themeColorToken, themeSpacing } from "@domphy/theme";

export type DitherPatternMode = "bayer" | "halftone" | "noise" | "crosshatch";
export type DitherColorMode = "grayscale" | "original" | "duotone" | "custom";

export interface DitherShaderProps {
  /** Source image URL. Defaults to a generic inline placeholder graphic (no network fetch). */
  src?: string;
  /** Accessible label for the rendered image. Defaults to `"Dithered image"`. */
  alt?: string;
  /** Dither cell/block size, in output px. Defaults to `4`. */
  gridSize?: number;
  /** Ordered-dither pattern rule. Defaults to `"bayer"`. */
  ditherMode?: DitherPatternMode;
  /** How on/off cells are colored. Defaults to `"grayscale"`. */
  colorMode?: DitherColorMode;
  /** "Ink" color family for `"duotone"`/`"custom"` color modes. Defaults to `"neutral"`. */
  primaryColor?: ThemeColor;
  /** "Paper" color family for `"duotone"`/`"custom"` color modes. Defaults to `"neutral"`. */
  secondaryColor?: ThemeColor;
  /** Luminance threshold (0-1) separating "on" from "off" cells. Defaults to `0.5`. */
  threshold?: number;
  /** Additive brightness adjustment, roughly -1 to 1. Defaults to `0`. */
  brightness?: number;
  /** Contrast adjustment, roughly -1 to 1. Defaults to `0`. */
  contrast?: number;
  /** Subtly drifts the dither pattern every frame instead of rendering once. Defaults to `false`. */
  animated?: boolean;
  /** Phase units advanced per second while `animated`. Defaults to `1`. */
  animationSpeed?: number;
  /** Output CSS width, in px. Defaults to `480`. */
  width?: number;
  /** Output CSS height, in px. Defaults to `320`. */
  height?: number;
  /** Passthrough style merged onto the outer wrapper. */
  style?: StyleObject;
}

interface DitherCellSample {
  red: number;
  green: number;
  blue: number;
  luminance: number;
}

// A standard 4x4 Bayer ordered-dither threshold matrix (values 0-15).
const BAYER_MATRIX_4X4: readonly (readonly number[])[] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const PLACEHOLDER_IMAGE_MARKUP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">' +
  '<rect width="300" height="200" fill="#0f172a"/>' +
  '<circle cx="210" cy="70" r="50" fill="#f59e0b"/>' +
  '<path d="M0 160 L90 90 L150 140 L210 80 L300 150 L300 200 L0 200 Z" fill="#334155"/>' +
  "</svg>";
const PLACEHOLDER_IMAGE_URI = `data:image/svg+xml,${encodeURIComponent(PLACEHOLDER_IMAGE_MARKUP)}`;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// Deterministic per-cell hash noise (classic GLSL "sin fract" trick) — cheap,
// stable across frames unless the seed changes.
function pseudoRandom(column: number, row: number, seed: number): number {
  const value = Math.sin(column * 127.1 + row * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function applyBrightnessContrast(luminance: number, brightness: number, contrast: number): number {
  const brightened = luminance + brightness;
  const contrastFactor = 1 + contrast;
  return clamp01((brightened - 0.5) * contrastFactor + 0.5);
}

function drawSourceIntoSampleCanvas(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  columns: number,
  rows: number,
): void {
  context.imageSmoothingEnabled = true;
  context.clearRect(0, 0, columns, rows);
  const naturalWidth = image.naturalWidth || columns;
  const naturalHeight = image.naturalHeight || rows;
  const sourceAspect = naturalWidth / naturalHeight;
  const targetAspect = columns / rows;
  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = naturalWidth;
  let sourceHeight = naturalHeight;
  if (sourceAspect > targetAspect) {
    sourceWidth = naturalHeight * targetAspect;
    sourceX = (naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = naturalWidth / targetAspect;
    sourceY = (naturalHeight - sourceHeight) / 2;
  }
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, columns, rows);
}

function buildCellSamples(
  context: CanvasRenderingContext2D,
  columns: number,
  rows: number,
): DitherCellSample[] {
  const pixels = context.getImageData(0, 0, columns, rows).data;
  const cells: DitherCellSample[] = new Array(columns * rows);
  for (let index = 0; index < columns * rows; index += 1) {
    const offset = index * 4;
    const red = pixels[offset] ?? 0;
    const green = pixels[offset + 1] ?? 0;
    const blue = pixels[offset + 2] ?? 0;
    cells[index] = {
      red,
      green,
      blue,
      luminance: (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255,
    };
  }
  return cells;
}

interface ResolvedDitherColors {
  onToken: string;
  offToken: string;
}

function resolveDitherColors(
  node: ElementNode,
  colorMode: DitherColorMode,
  primaryColorFamily: ThemeColor,
  secondaryColorFamily: ThemeColor,
): ResolvedDitherColors {
  try {
    if (colorMode === "grayscale") {
      return {
        onToken: themeColorToken(node, "shift-16", "neutral"),
        offToken: themeColorToken(node, "shift-0", "neutral"),
      };
    }
    if (colorMode === "original") {
      // "on" is overridden per-cell with the sampled source color; the
      // token here is only the paper/background fill.
      return {
        onToken: themeColorToken(node, "shift-16", "neutral"),
        offToken: themeColorToken(node, "shift-1", "neutral"),
      };
    }
    // duotone / custom — both resolve through theme color families rather
    // than arbitrary hex, since Domphy forbids raw color literals. "custom"
    // simply means the caller supplied both families explicitly.
    return {
      onToken: themeColorToken(node, "shift-13", primaryColorFamily),
      offToken: themeColorToken(node, "shift-2", secondaryColorFamily),
    };
  } catch {
    return { onToken: "#161616", offToken: "#f2f2f2" };
  }
}

/**
 * Renders a source image as a real-time ordered-dithering pattern (Bayer,
 * halftone, noise, or crosshatch) on a canvas. Call with no arguments for a
 * working demo using a generic placeholder graphic.
 */
function ditherShader(props: DitherShaderProps = {}): DomphyElement<"div"> {
  const imageSource = props.src ?? PLACEHOLDER_IMAGE_URI;
  const altText = props.alt ?? "Dithered image";
  const gridSize = Math.max(1, props.gridSize ?? 4);
  const ditherMode = props.ditherMode ?? "bayer";
  const colorMode = props.colorMode ?? "grayscale";
  const primaryColorFamily = props.primaryColor ?? "neutral";
  const secondaryColorFamily = props.secondaryColor ?? "neutral";
  const threshold = clamp01(props.threshold ?? 0.5);
  const brightness = props.brightness ?? 0;
  const contrast = props.contrast ?? 0;
  const animated = props.animated ?? false;
  const animationSpeed = props.animationSpeed ?? 1;
  const outputWidth = Math.max(16, props.width ?? 480);
  const outputHeight = Math.max(16, props.height ?? 320);

  const canvasElement = {
    canvas: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: { display: "block", width: "100%", height: "100%" } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const canvas = node.domElement as HTMLCanvasElement | null;
      const wrapperElement = canvas?.parentElement ?? null;
      if (!canvas || !wrapperElement) return;
      const context = canvas.getContext("2d");
      // Headless/test runtimes without a real 2D canvas backend resolve
      // getContext to null rather than throwing — bail before starting.
      if (!context) return;

      const sampleCanvas = document.createElement("canvas");
      const sampleContext = sampleCanvas.getContext("2d", {
        willReadFrequently: true,
      } as CanvasRenderingContext2DSettings);

      const colors = resolveDitherColors(node, colorMode, primaryColorFamily, secondaryColorFamily);

      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(outputWidth * devicePixelRatio));
      canvas.height = Math.max(1, Math.floor(outputHeight * devicePixelRatio));
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

      const columns = Math.max(1, Math.round(outputWidth / gridSize));
      const rows = Math.max(1, Math.round(outputHeight / gridSize));
      sampleCanvas.width = columns;
      sampleCanvas.height = rows;

      let cells: DitherCellSample[] = [];
      let image: HTMLImageElement | null = null;
      let imageLoaded = false;
      let animationFrameId: number | null = null;
      let intersectionObserver: IntersectionObserver | null = null;
      const startTimeMs = performance.now();

      function resample(): void {
        if (!sampleContext || !image || !imageLoaded) return;
        try {
          drawSourceIntoSampleCanvas(sampleContext, image, columns, rows);
          cells = buildCellSamples(sampleContext, columns, rows);
        } catch {
          // Cross-origin image without CORS headers taints the canvas —
          // getImageData() throws. Leave the grid empty rather than crash.
          cells = [];
        }
      }

      function drawFrame(phase: number): void {
        context!.clearRect(0, 0, outputWidth, outputHeight);
        context!.fillStyle = colors.offToken;
        context!.fillRect(0, 0, outputWidth, outputHeight);

        const phaseRowOffset = Math.floor(phase) & 3;
        const phaseColumnOffset = Math.floor(phase * 1.3) & 3;

        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            const cell = cells[row * columns + column];
            if (!cell) continue;
            const adjustedLuminance = applyBrightnessContrast(cell.luminance, brightness, contrast);
            const cellX = column * gridSize;
            const cellY = row * gridSize;

            const onFillStyle =
              colorMode === "original"
                ? `rgb(${cell.red | 0}, ${cell.green | 0}, ${cell.blue | 0})`
                : colors.onToken;

            if (ditherMode === "bayer") {
              const matrixRow = (row + phaseRowOffset) & 3;
              const matrixColumn = (column + phaseColumnOffset) & 3;
              const matrixValue = ((BAYER_MATRIX_4X4[matrixRow]?.[matrixColumn] ?? 0) + 0.5) / 16;
              const localThreshold = clamp01(threshold + (matrixValue - 0.5));
              if (adjustedLuminance <= localThreshold) {
                context!.fillStyle = onFillStyle;
                context!.fillRect(cellX, cellY, gridSize, gridSize);
              }
            } else if (ditherMode === "noise") {
              const noiseValue = pseudoRandom(column, row, phase);
              const localThreshold = clamp01(threshold + (noiseValue - 0.5));
              if (adjustedLuminance <= localThreshold) {
                context!.fillStyle = onFillStyle;
                context!.fillRect(cellX, cellY, gridSize, gridSize);
              }
            } else if (ditherMode === "halftone") {
              const cellSeed = column * 12.9898 + row * 78.233;
              const jitter = phase !== 0 ? Math.sin(phase + cellSeed) * 0.06 : 0;
              const darkness = clamp01(threshold - adjustedLuminance + 0.5 + jitter);
              const radius = (gridSize / 2) * darkness;
              if (radius > 0.3) {
                context!.fillStyle = onFillStyle;
                context!.beginPath();
                context!.arc(cellX + gridSize / 2, cellY + gridSize / 2, radius, 0, Math.PI * 2);
                context!.fill();
              }
            } else {
              // crosshatch — quantize darkness into 4 density bands.
              const cellSeed = column * 12.9898 + row * 78.233;
              const jitter = phase !== 0 ? Math.sin(phase * 0.6 + cellSeed) * 0.05 : 0;
              const darkness = clamp01(threshold - adjustedLuminance + 0.5 + jitter);
              const level = Math.min(3, Math.floor(darkness * 4));
              if (level > 0) {
                context!.strokeStyle = onFillStyle;
                context!.lineWidth = Math.max(0.5, gridSize * 0.14);
                context!.beginPath();
                context!.moveTo(cellX, cellY + gridSize);
                context!.lineTo(cellX + gridSize, cellY);
                if (level >= 2) {
                  context!.moveTo(cellX, cellY);
                  context!.lineTo(cellX + gridSize, cellY + gridSize);
                }
                context!.stroke();
                if (level >= 3) {
                  context!.fillStyle = onFillStyle;
                  context!.globalAlpha = 0.35;
                  context!.fillRect(cellX, cellY, gridSize, gridSize);
                  context!.globalAlpha = 1;
                }
              }
            }
          }
        }
      }

      function tick(timeMs: number): void {
        // Belt-and-suspenders stop condition: some hosts (e.g. a test
        // harness that wipes the DOM directly instead of going through the
        // framework's removal lifecycle, or an environment without
        // `IntersectionObserver` to gate the loop) never fire the "Remove"
        // hook below. Bailing here once the canvas is detached prevents the
        // loop from leaking forever across unrelated later tests.
        if (!canvas!.isConnected) return;
        const elapsedSeconds = (timeMs - startTimeMs) / 1000;
        drawFrame(elapsedSeconds * animationSpeed);
        animationFrameId = window.requestAnimationFrame(tick);
      }

      function startLoop(): void {
        if (!animated || animationFrameId !== null) return;
        animationFrameId = window.requestAnimationFrame(tick);
      }
      function stopLoop(): void {
        if (animationFrameId === null) return;
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      if (sampleContext) {
        image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
          imageLoaded = true;
          resample();
          drawFrame(0);
          if (animated) startLoop();
        };
        image.onerror = () => {
          // Leave the canvas as a flat "paper" fill on load failure.
          drawFrame(0);
        };
        image.src = imageSource;
      }

      if (animated && typeof IntersectionObserver === "function") {
        intersectionObserver = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) startLoop();
            else stopLoop();
          }
        });
        intersectionObserver.observe(wrapperElement);
      }

      node.addHook("Remove", () => {
        stopLoop();
        intersectionObserver?.disconnect();
      });
    },
  } as unknown as DomphyElement<"canvas">;

  return {
    div: [canvasElement],
    role: "img",
    ariaLabel: altText,
    style: {
      position: "relative",
      display: "block",
      width: `${outputWidth}px`,
      aspectRatio: `${outputWidth} / ${outputHeight}`,
      overflow: "hidden",
      borderRadius: themeSpacing(2),
      ...(props.style ?? {}),
    } as StyleObject,
  } as DomphyElement<"div">;
}

export { ditherShader };
