// Aceternity UI "Pixelated Canvas" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied).
// Renders a source image as a grid of blocky pixel cells on an HTML canvas
// that distorts (repels/attracts/swirls) around the cursor.
//
// Two canvases, same "sample once, redraw many" split this package's
// `asciiArt`/`pixelatedCanvas` share: a hidden offscreen canvas draws the
// loaded image scaled straight down onto a `columns x rows` grid (one
// `getImageData()` pixel per cell — the browser's own image smoothing does
// the per-cell averaging, no manual region loop) whenever the image loads
// or the visible canvas is resized; a visible canvas then redraws every
// cell each frame at its resting position offset by a distance-falloff
// displacement from the tracked pointer.
//
// The pointer position used for the falloff is itself lerped toward the
// raw pointer every frame (`pointerSmoothing`), and each cell's own
// current offset is separately lerped toward its *target* offset — so
// distortion strengthens/eases in as the pointer approaches/leaves a cell
// rather than snapping, per the spec's "eases back to rest" requirement.
// `requestAnimationFrame`, throttled to `frameRateCap`, matches this
// package's other continuous canvas loops (`particles`, `dottedGlowBackground`),
// including the `IntersectionObserver` pause/resume and `ResizeObserver`
// reflow.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { type ThemeColor, themeColorToken, themeSpacing } from "@domphy/theme";

export type PixelDotShape = "square" | "circle";
export type PixelDistortionMode = "repel" | "attract" | "swirl";
export type PixelObjectFit = "cover" | "contain";

export interface PixelatedCanvasProps {
  /** Source image URL. Defaults to a generic inline placeholder graphic (no network fetch). */
  imageSource?: string;
  /** Canvas CSS width, in px, at the base (non-responsive) size. Defaults to `480`. */
  width?: number;
  /** Canvas CSS height, in px, at the base (non-responsive) size. Defaults to `320`. */
  height?: number;
  /** Grid cell size, in canvas px. Defaults to `5`. */
  cellSize?: number;
  /** Dot shape drawn per cell. Defaults to `"square"`. */
  dotShape?: PixelDotShape;
  /** Fraction (0-1) of each cell's size the dot actually fills. Defaults to `0.9`. */
  dotScale?: number;
  /** Canvas backdrop color family (shows through gaps between dots). Defaults to `"neutral"`. */
  backgroundColor?: ThemeColor;
  /** Desaturates every sampled dot to grayscale. Defaults to `false`. */
  grayscale?: boolean;
  /** Recolors every dot toward this theme color family (multiplies over the sampled luminance) instead of its original hue. */
  tintColor?: ThemeColor;
  /** How cells near the cursor move. Defaults to `"repel"`. */
  distortionMode?: PixelDistortionMode;
  /** Maximum per-cell displacement, in px, at the cursor's center. Defaults to `14`. */
  distortionStrength?: number;
  /** Radius, in px, within which cells are displaced. Defaults to `90`. */
  distortionRadius?: number;
  /** Lerp factor (0-1, higher = snappier) easing the tracked pointer toward the raw pointer each frame. Defaults to `0.18`. */
  pointerSmoothing?: number;
  /** Per-frame random jitter amount, in px, added on top of the distortion offset. Defaults to `0`. */
  jitter?: number;
  /** Target frames per second cap for the redraw loop. Defaults to `60`. */
  frameRateCap?: number;
  /** How the source image is cropped/fit into the cell grid. Defaults to `"cover"`. */
  objectFit?: PixelObjectFit;
  /** Scales the canvas to fill its container's measured width (aspect ratio locked to `width`/`height`) instead of a fixed pixel size. Defaults to `true`. */
  responsive?: boolean;
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

interface CellSample {
  red: number;
  green: number;
  blue: number;
  restX: number;
  restY: number;
  offsetX: number;
  offsetY: number;
  jitterX: number;
  jitterY: number;
}

// Generic abstract placeholder graphic — an inline SVG data URI, no network
// fetch and no real photo (same idiom `pixelImage.ts`/`asciiArt.ts` use for
// their own default demo imagery elsewhere in this package).
const PLACEHOLDER_IMAGE_MARKUP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">' +
  '<rect width="300" height="200" fill="#0f172a"/>' +
  '<circle cx="210" cy="70" r="50" fill="#f59e0b"/>' +
  '<path d="M0 160 L90 90 L150 140 L210 80 L300 150 L300 200 L0 200 Z" fill="#334155"/>' +
  "</svg>";
const PLACEHOLDER_IMAGE_URI = `data:image/svg+xml,${encodeURIComponent(PLACEHOLDER_IMAGE_MARKUP)}`;

function drawSourceIntoSampleCanvas(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  columns: number,
  rows: number,
  objectFit: PixelObjectFit,
): void {
  context.imageSmoothingEnabled = true;
  context.clearRect(0, 0, columns, rows);
  const naturalWidth = image.naturalWidth || columns;
  const naturalHeight = image.naturalHeight || rows;

  if (objectFit === "contain") {
    context.drawImage(image, 0, 0, naturalWidth, naturalHeight, 0, 0, columns, rows);
    return;
  }

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
  cellSize: number,
): CellSample[] {
  const pixels = context.getImageData(0, 0, columns, rows).data;
  const cells: CellSample[] = new Array(columns * rows);
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const index = row * columns + column;
      const offset = index * 4;
      cells[index] = {
        red: pixels[offset],
        green: pixels[offset + 1],
        blue: pixels[offset + 2],
        restX: column * cellSize + cellSize / 2,
        restY: row * cellSize + cellSize / 2,
        offsetX: 0,
        offsetY: 0,
        jitterX: 0,
        jitterY: 0,
      };
    }
  }
  return cells;
}

function applyGrayscaleAndTint(
  red: number,
  green: number,
  blue: number,
  grayscale: boolean,
  tint: { red: number; green: number; blue: number } | null,
): [number, number, number] {
  let outputRed = red;
  let outputGreen = green;
  let outputBlue = blue;
  if (grayscale || tint) {
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    outputRed = luminance;
    outputGreen = luminance;
    outputBlue = luminance;
  }
  if (tint) {
    outputRed = (outputRed / 255) * tint.red;
    outputGreen = (outputGreen / 255) * tint.green;
    outputBlue = (outputBlue / 255) * tint.blue;
  }
  return [outputRed, outputGreen, outputBlue];
}

function tokenToRgb(hexToken: string): { red: number; green: number; blue: number } {
  const hex = hexToken.replace("#", "");
  const isShort = hex.length === 3;
  const red = parseInt(isShort ? hex[0] + hex[0] : hex.slice(0, 2), 16) || 0;
  const green = parseInt(isShort ? hex[1] + hex[1] : hex.slice(2, 4), 16) || 0;
  const blue = parseInt(isShort ? hex[2] + hex[2] : hex.slice(4, 6), 16) || 0;
  return { red, green, blue };
}

let pixelatedCanvasInstanceCounter = 0;

/**
 * Renders a source image as a grid of blocky pixel cells that repel,
 * attract, or swirl away from the cursor. Call with no arguments for a
 * working demo using a generic placeholder graphic.
 */
function pixelatedCanvas(props: PixelatedCanvasProps = {}): DomphyElement<"div"> {
  const instanceId = ++pixelatedCanvasInstanceCounter;
  const imageSource = props.imageSource ?? PLACEHOLDER_IMAGE_URI;
  const baseWidth = Math.max(16, props.width ?? 480);
  const baseHeight = Math.max(16, props.height ?? 320);
  const cellSize = Math.max(1, props.cellSize ?? 5);
  const dotShape = props.dotShape ?? "square";
  const dotScale = Math.min(1, Math.max(0.1, props.dotScale ?? 0.9));
  const backgroundColorFamily = props.backgroundColor ?? "neutral";
  const grayscale = props.grayscale ?? false;
  const tintColor = props.tintColor;
  const distortionMode = props.distortionMode ?? "repel";
  const distortionStrength = props.distortionStrength ?? 14;
  const distortionRadius = Math.max(1, props.distortionRadius ?? 90);
  const pointerSmoothing = Math.min(1, Math.max(0.01, props.pointerSmoothing ?? 0.18));
  const jitter = props.jitter ?? 0;
  const frameRateCap = Math.max(1, props.frameRateCap ?? 60);
  const objectFit = props.objectFit ?? "cover";
  const responsive = props.responsive ?? true;

  const canvasElement = {
    canvas: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      display: "block",
      width: "100%",
      height: "100%",
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const canvas = node.domElement as HTMLCanvasElement | null;
      const containerElement = canvas?.parentElement ?? null;
      if (!canvas || !containerElement) return;
      const context = canvas.getContext("2d");
      // Headless/test runtimes without a real 2D canvas backend (e.g. jsdom
      // without the optional `canvas` npm package) resolve `getContext` to
      // `null` rather than throwing — bail out before starting the loop.
      if (!context) return;

      const sampleCanvas = document.createElement("canvas");
      const sampleContext = sampleCanvas.getContext("2d", {
        willReadFrequently: true,
      } as CanvasRenderingContext2DSettings);

      const backgroundToken = (() => {
        try {
          return themeColorToken(node, "inherit", backgroundColorFamily);
        } catch {
          return "#000000";
        }
      })();
      const tintRgb = tintColor
        ? (() => {
            try {
              return tokenToRgb(themeColorToken(node, "shift-9", tintColor));
            } catch {
              return null;
            }
          })()
        : null;

      let devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      let cssWidth = baseWidth;
      let cssHeight = baseHeight;
      let columns = Math.max(1, Math.round(cssWidth / cellSize));
      let rows = Math.max(1, Math.round(cssHeight / cellSize));
      let cells: CellSample[] = [];
      let image: HTMLImageElement | null = null;
      let imageLoaded = false;

      let rawPointerX = -distortionRadius * 2;
      let rawPointerY = -distortionRadius * 2;
      let smoothPointerX = rawPointerX;
      let smoothPointerY = rawPointerY;
      let pointerActive = false;

      let animationFrameId: number | null = null;
      let resizeObserver: ResizeObserver | null = null;
      let intersectionObserver: IntersectionObserver | null = null;
      let lastFrameTime = 0;

      function resample(): void {
        if (!sampleContext || !image || !imageLoaded) return;
        columns = Math.max(1, Math.round(cssWidth / cellSize));
        rows = Math.max(1, Math.round(cssHeight / cellSize));
        sampleCanvas.width = columns;
        sampleCanvas.height = rows;
        try {
          drawSourceIntoSampleCanvas(sampleContext, image, columns, rows, objectFit);
          cells = buildCellSamples(sampleContext, columns, rows, cellSize);
        } catch {
          // Cross-origin image without CORS headers taints the canvas —
          // `getImageData()` throws. Leave the grid empty rather than crash.
          cells = [];
        }
      }

      function resizeCanvas(): void {
        if (responsive) {
          const rect = containerElement!.getBoundingClientRect();
          cssWidth = rect.width > 0 ? rect.width : baseWidth;
          cssHeight = cssWidth * (baseHeight / baseWidth);
        } else {
          cssWidth = baseWidth;
          cssHeight = baseHeight;
        }
        canvas!.width = Math.max(1, Math.floor(cssWidth * devicePixelRatio));
        canvas!.height = Math.max(1, Math.floor(cssHeight * devicePixelRatio));
        context!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
        resample();
      }

      function computeDisplacement(cell: CellSample): { x: number; y: number } {
        const deltaX = cell.restX - smoothPointerX;
        const deltaY = cell.restY - smoothPointerY;
        const distance = Math.hypot(deltaX, deltaY);
        if (!pointerActive || distance >= distortionRadius || distance < 0.001) {
          return { x: 0, y: 0 };
        }
        const falloff = 1 - distance / distortionRadius;
        const magnitude = distortionStrength * falloff;
        if (distortionMode === "attract") {
          return { x: (-deltaX / distance) * magnitude, y: (-deltaY / distance) * magnitude };
        }
        if (distortionMode === "swirl") {
          // Tangential displacement — perpendicular to the radius vector.
          return { x: (-deltaY / distance) * magnitude, y: (deltaX / distance) * magnitude };
        }
        // repel
        return { x: (deltaX / distance) * magnitude, y: (deltaY / distance) * magnitude };
      }

      function drawFrame(): void {
        context!.clearRect(0, 0, cssWidth, cssHeight);
        context!.fillStyle = backgroundToken;
        context!.fillRect(0, 0, cssWidth, cssHeight);

        const dotSize = cellSize * dotScale;
        for (const cell of cells) {
          const target = computeDisplacement(cell);
          cell.offsetX += (target.x - cell.offsetX) * 0.25;
          cell.offsetY += (target.y - cell.offsetY) * 0.25;
          if (jitter > 0) {
            cell.jitterX = (Math.random() - 0.5) * jitter;
            cell.jitterY = (Math.random() - 0.5) * jitter;
          }

          const [red, green, blue] = applyGrayscaleAndTint(cell.red, cell.green, cell.blue, grayscale, tintRgb);
          context!.fillStyle = `rgb(${red | 0}, ${green | 0}, ${blue | 0})`;

          const drawX = cell.restX + cell.offsetX + cell.jitterX;
          const drawY = cell.restY + cell.offsetY + cell.jitterY;
          if (dotShape === "circle") {
            context!.beginPath();
            context!.arc(drawX, drawY, dotSize / 2, 0, Math.PI * 2);
            context!.fill();
          } else {
            context!.fillRect(drawX - dotSize / 2, drawY - dotSize / 2, dotSize, dotSize);
          }
        }
      }

      function tick(time: number): void {
        // Belt-and-suspenders: this loop is otherwise only stopped by the
        // `IntersectionObserver` callback (skipped entirely when
        // `IntersectionObserver` isn't available — see `startLoop()`'s
        // caller below) or the node's own "Remove" hook. Neither is
        // guaranteed to fire in every host (e.g. a raw `innerHTML = ""`
        // DOM wipe never runs Domphy's removal lifecycle) — bail out
        // without rescheduling once the canvas itself is detached, so the
        // loop can't outlive its element.
        if (!canvas!.isConnected) {
          animationFrameId = null;
          return;
        }
        const minFrameInterval = 1000 / frameRateCap;
        if (time - lastFrameTime >= minFrameInterval) {
          lastFrameTime = time;
          smoothPointerX += (rawPointerX - smoothPointerX) * pointerSmoothing;
          smoothPointerY += (rawPointerY - smoothPointerY) * pointerSmoothing;
          drawFrame();
        }
        animationFrameId = window.requestAnimationFrame(tick);
      }

      function startLoop(): void {
        if (animationFrameId !== null) return;
        lastFrameTime = 0;
        animationFrameId = window.requestAnimationFrame(tick);
      }
      function stopLoop(): void {
        if (animationFrameId === null) return;
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      function handlePointerMove(event: PointerEvent): void {
        const rect = containerElement!.getBoundingClientRect();
        rawPointerX = event.clientX - rect.left;
        rawPointerY = event.clientY - rect.top;
        pointerActive = true;
      }
      function handlePointerLeave(): void {
        pointerActive = false;
        rawPointerX = -distortionRadius * 2;
        rawPointerY = -distortionRadius * 2;
      }

      resizeCanvas();
      if (sampleContext) {
        image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
          imageLoaded = true;
          resample();
        };
        image.onerror = () => {
          // Leave the grid empty (background-only canvas) on load failure.
        };
        image.src = imageSource;
      }

      containerElement.addEventListener("pointermove", handlePointerMove);
      containerElement.addEventListener("pointerleave", handlePointerLeave);

      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => resizeCanvas());
        resizeObserver.observe(containerElement);
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
        resizeObserver?.disconnect();
        intersectionObserver?.disconnect();
        containerElement.removeEventListener("pointermove", handlePointerMove);
        containerElement.removeEventListener("pointerleave", handlePointerLeave);
      });
    },
  } as unknown as DomphyElement<"canvas">;

  return {
    div: [canvasElement],
    style: {
      position: "relative",
      display: "block",
      width: responsive ? "100%" : `${baseWidth}px`,
      aspectRatio: `${baseWidth} / ${baseHeight}`,
      overflow: "hidden",
      borderRadius: themeSpacing(3),
      ...(props.style ?? {}),
    } as StyleObject,
  } as DomphyElement<"div">;
}

export { pixelatedCanvas };
