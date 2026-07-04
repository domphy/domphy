// Aceternity UI "Webcam Pixel Grid" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// live webcam feed downsampled into a grid of colored pixel tiles rendered on
// a canvas, with a per-tile "elevation" pop driven by how much that cell's
// color has changed since the last frame — a cheap 2D stand-in for a full 3D
// relief effect.
//
// Two canvases, the same "sample once, redraw many" split this package's
// `pixelatedCanvas.ts` already uses for a *static* source image: here the
// source is a live `<video>` element instead of a loaded `<img>`, redrawn
// into a `gridCols x gridRows` offscreen canvas every frame (the browser's own
// image smoothing does the per-cell averaging, no manual region loop), then
// `getImageData()` reads back one RGB triplet per cell. Comparing each cell's
// color against its own previous-frame color gives a per-cell motion delta;
// an asymmetric low-pass filter (fast rise toward a higher delta, slow decay
// back down) turns that into a smoothed "elevation" value in `[0, 1]`, which
// the visible canvas renders as a small upward pixel offset plus a brightness
// boost — a 2D shading trick standing in for a true CSS 3D perspective
// transform per tile (see this file's `fidelityNotes` in the port manifest:
// redrawing thousands of individually-transformed DOM tiles at 64x48
// resolution every frame would be far more expensive than one canvas redraw,
// and the spec itself flags the rendering surface as an open implementation
// choice).
//
// `video`/`canvas` register themselves into shared closure refs and each
// calls a guarded `trySetup()` once both exist — the same order-independent
// pairing idiom `tracingBeam.ts` uses for its own two sibling SVG nodes —
// rather than assuming sibling mount order.
//
// `navigator.mediaDevices.getUserMedia` is requested once both refs are
// ready; a missing API, a rejected permission prompt, or no camera device all
// resolve to the same graceful fallback — the sampling loop never starts and
// the canvas stays a plain dark placeholder. That placeholder is never the
// *only* thing on screen, though: a `children` content overlay (default: a
// small demo heading) always renders above the canvas, camera or no camera —
// matching the spec's own researchNote about the no-camera case in this
// environment (headless/automated runs have no webcam to grant), and how the
// live reference itself composes this block (a persistent hero headline over
// the effect, not a swap-in-on-failure message).

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeColorToken, themeSpacing } from "@domphy/theme";

export type WebcamPixelGridColorMode = "webcam" | "monochrome";

export interface WebcamPixelGridProps {
  /** Sampling grid columns. Defaults to `64`. */
  gridCols?: number;
  /** Sampling grid rows. Defaults to `48`. */
  gridRows?: number;
  /** How strongly frame-to-frame color change drives the elevation pop, `0-1`. Defaults to `0.6`. */
  motionSensitivity?: number;
  /** Maximum per-tile upward pixel offset at full elevation. Defaults to `15`. */
  maxElevation?: number;
  /** Low-pass smoothing factor easing elevation toward its target each frame, `0-1` (higher = snappier). Defaults to `0.1`. */
  elevationSmoothing?: number;
  /** `"webcam"` samples true per-tile color; `"monochrome"` recolors every tile toward `monochromeColor` at the sampled brightness. Defaults to `"webcam"`. */
  colorMode?: WebcamPixelGridColorMode;
  /** Theme color family used for every tile in monochrome mode. Defaults to `"success"` (a bright green family). */
  monochromeColor?: ThemeColor;
  /** Theme color family for the container backdrop showing through tile gaps. Defaults to `"neutral"`. */
  backgroundColor?: ThemeColor;
  /** Theme color family for each tile's outline. Defaults to `"neutral"`. */
  borderColor?: ThemeColor;
  /** Opacity of each tile's outline, `0-1`. Defaults to `0.15`. */
  borderOpacity?: number;
  /** Flips the sampled feed horizontally, like a mirror/selfie view. Defaults to `true`. */
  mirror?: boolean;
  /** Fraction of each cell reserved as a gap between tiles, `0-1`. Defaults to `0.12`. */
  gapRatio?: number;
  /** Inverts every sampled color (`255 - channel`). Defaults to `false`. */
  invertColors?: boolean;
  /** Darkens every sampled color, `0` (no change) to `1` (black). Defaults to `0`. */
  darken?: number;
  /** Fires once the webcam stream is playing. */
  onWebcamReady?: () => void;
  /** Fires when the webcam can't be accessed (no API, no device, or denied permission). */
  onWebcamError?: (error: unknown) => void;
  /**
   * Foreground content layered above the pixel grid (a hero headline, a CTA,
   * an "enable camera" prompt, …) — the grid is a background effect that
   * plays behind whatever's placed here, camera or no camera. Defaults to a
   * small demo heading so the block reads as something even where no camera
   * is available (this is also the ordinary case for automated/headless
   * environments, which have no webcam to grant).
   */
  children?: DomphyElement | DomphyElement[];
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

function clampUnit(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Same small hex->rgb helper `pixelatedCanvas.ts` uses for its own resolved theme tokens. */
function hexTokenToRgb(hexToken: string): { red: number; green: number; blue: number } {
  const hex = hexToken.replace("#", "");
  const isShort = hex.length === 3;
  const red = parseInt(isShort ? hex[0] + hex[0] : hex.slice(0, 2), 16) || 0;
  const green = parseInt(isShort ? hex[1] + hex[1] : hex.slice(2, 4), 16) || 0;
  const blue = parseInt(isShort ? hex[2] + hex[2] : hex.slice(4, 6), 16) || 0;
  return { red, green, blue };
}

let webcamPixelGridInstanceCounter = 0;

/**
 * A live webcam feed downsampled into a grid of colored pixel tiles, with
 * motion-driven per-tile elevation for a subtle relief look. Call with no
 * arguments for a working demo — falls back to a plain dark placeholder
 * wherever no camera is available or permission is denied.
 */
function webcamPixelGrid(props: WebcamPixelGridProps = {}): DomphyElement<"div"> {
  ++webcamPixelGridInstanceCounter;
  const gridCols = Math.max(2, Math.round(props.gridCols ?? 64));
  const gridRows = Math.max(2, Math.round(props.gridRows ?? 48));
  const motionSensitivity = clampUnit(props.motionSensitivity ?? 0.6);
  const maxElevation = Math.max(0, props.maxElevation ?? 15);
  const elevationSmoothing = Math.min(1, Math.max(0.01, props.elevationSmoothing ?? 0.1));
  const colorMode = props.colorMode ?? "webcam";
  const monochromeColor = props.monochromeColor ?? "success";
  const backgroundColor = props.backgroundColor ?? "neutral";
  const borderColor = props.borderColor ?? "neutral";
  const borderOpacity = clampUnit(props.borderOpacity ?? 0.15);
  const mirror = props.mirror ?? true;
  const gapRatio = Math.min(0.6, Math.max(0, props.gapRatio ?? 0.12));
  const invertColors = props.invertColors ?? false;
  const darken = clampUnit(props.darken ?? 0);

  let videoDomElement: HTMLVideoElement | null = null;
  let canvasDomElement: HTMLCanvasElement | null = null;
  let removeTeardown: (() => void) | null = null;

  function trySetup(node: ElementNode): void {
    if (!videoDomElement || !canvasDomElement) return;
    if (removeTeardown || typeof window === "undefined") return;

    let mediaStream: MediaStream | null = null;
    let streamActive = false;

    // Requesting the camera never depends on 2D canvas support, so this runs
    // before the canvas-context guard below — a headless/test runtime with no
    // `canvas` npm package installed (canvas draws are unavailable) should
    // still resolve `onWebcamReady`/`onWebcamError` from the real API.
    const hasGetUserMedia =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function";

    if (!hasGetUserMedia) {
      props.onWebcamError?.(new Error("Camera access is not available in this environment."));
    } else {
      navigator.mediaDevices
        .getUserMedia({
          video: { width: { ideal: gridCols * 8 }, height: { ideal: gridRows * 8 } },
          audio: false,
        })
        .then((stream) => {
          mediaStream = stream;
          videoDomElement!.srcObject = stream;
          return videoDomElement!.play();
        })
        .then(() => {
          streamActive = true;
          props.onWebcamReady?.();
        })
        .catch((error: unknown) => {
          props.onWebcamError?.(error);
        });
    }

    const containerElement = canvasDomElement.parentElement;
    if (!containerElement) {
      removeTeardown = () => {
        mediaStream?.getTracks().forEach((track) => track.stop());
        removeTeardown = null;
      };
      return;
    }
    const context = canvasDomElement.getContext("2d");
    if (!context) {
      removeTeardown = () => {
        mediaStream?.getTracks().forEach((track) => track.stop());
        removeTeardown = null;
      };
      return;
    }

    const sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = gridCols;
    sampleCanvas.height = gridRows;
    const sampleContext = sampleCanvas.getContext("2d", {
      willReadFrequently: true,
    } as CanvasRenderingContext2DSettings);

    const backgroundToken = (() => {
      try {
        return themeColorToken(node, "inherit", backgroundColor);
      } catch {
        return "#000000";
      }
    })();
    const borderToken = (() => {
      try {
        return themeColorToken(node, "shift-6", borderColor);
      } catch {
        return "#666666";
      }
    })();
    const monochromeRgb = (() => {
      try {
        return hexTokenToRgb(themeColorToken(node, "shift-9", monochromeColor));
      } catch {
        return { red: 57, green: 255, blue: 20 };
      }
    })();

    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    let cssWidth = 0;
    let cssHeight = 0;

    const cellCount = gridCols * gridRows;
    const previousRed = new Float32Array(cellCount);
    const previousGreen = new Float32Array(cellCount);
    const previousBlue = new Float32Array(cellCount);
    const elevation = new Float32Array(cellCount);
    let hasPreviousFrame = false;

    let animationFrameId: number | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;

    function resizeCanvas(): void {
      const rect = containerElement!.getBoundingClientRect();
      cssWidth = rect.width || 1;
      cssHeight = rect.height || 1;
      canvasDomElement!.width = Math.max(1, Math.floor(cssWidth * devicePixelRatio));
      canvasDomElement!.height = Math.max(1, Math.floor(cssHeight * devicePixelRatio));
      context!.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }

    function sampleFrame(): Uint8ClampedArray | null {
      if (!sampleContext) return null;
      sampleContext.imageSmoothingEnabled = true;
      sampleContext.save();
      if (mirror) {
        sampleContext.translate(gridCols, 0);
        sampleContext.scale(-1, 1);
      }
      try {
        sampleContext.drawImage(videoDomElement!, 0, 0, gridCols, gridRows);
      } catch {
        sampleContext.restore();
        return null;
      }
      sampleContext.restore();
      return sampleContext.getImageData(0, 0, gridCols, gridRows).data;
    }

    function processColor(red: number, green: number, blue: number): [number, number, number] {
      let outputRed = red;
      let outputGreen = green;
      let outputBlue = blue;
      if (colorMode === "monochrome") {
        const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
        outputRed = monochromeRgb.red * luminance;
        outputGreen = monochromeRgb.green * luminance;
        outputBlue = monochromeRgb.blue * luminance;
      }
      if (invertColors) {
        outputRed = 255 - outputRed;
        outputGreen = 255 - outputGreen;
        outputBlue = 255 - outputBlue;
      }
      if (darken > 0) {
        outputRed *= 1 - darken;
        outputGreen *= 1 - darken;
        outputBlue *= 1 - darken;
      }
      return [outputRed, outputGreen, outputBlue];
    }

    function drawFrame(): void {
      const pixels = sampleFrame();
      context!.clearRect(0, 0, cssWidth, cssHeight);
      context!.fillStyle = backgroundToken;
      context!.fillRect(0, 0, cssWidth, cssHeight);
      if (!pixels) return;

      const cellWidth = cssWidth / gridCols;
      const cellHeight = cssHeight / gridRows;
      const tileWidth = cellWidth * (1 - gapRatio);
      const tileHeight = cellHeight * (1 - gapRatio);

      for (let row = 0; row < gridRows; row += 1) {
        for (let column = 0; column < gridCols; column += 1) {
          const index = row * gridCols + column;
          const offset = index * 4;
          const sampledRed = pixels[offset];
          const sampledGreen = pixels[offset + 1];
          const sampledBlue = pixels[offset + 2];

          const delta = hasPreviousFrame
            ? (Math.abs(sampledRed - previousRed[index]) +
                Math.abs(sampledGreen - previousGreen[index]) +
                Math.abs(sampledBlue - previousBlue[index])) /
              (255 * 3)
            : 0;
          const target = clampUnit(delta * motionSensitivity * 4);
          // Asymmetric low-pass: rises toward a higher target several times
          // faster than it decays back down, so motion pops quickly and
          // settles smoothly rather than jittering frame to frame.
          const rate = target > elevation[index] ? Math.min(1, elevationSmoothing * 5) : elevationSmoothing;
          elevation[index] += (target - elevation[index]) * rate;

          previousRed[index] = sampledRed;
          previousGreen[index] = sampledGreen;
          previousBlue[index] = sampledBlue;

          const [red, green, blue] = processColor(sampledRed, sampledGreen, sampledBlue);
          const boost = elevation[index] * 0.35;
          const litRed = red + (255 - red) * boost;
          const litGreen = green + (255 - green) * boost;
          const litBlue = blue + (255 - blue) * boost;

          const tileX = column * cellWidth + (cellWidth - tileWidth) / 2;
          const tileY = row * cellHeight + (cellHeight - tileHeight) / 2 - elevation[index] * maxElevation;

          context!.fillStyle = `rgb(${litRed | 0}, ${litGreen | 0}, ${litBlue | 0})`;
          context!.fillRect(tileX, tileY, tileWidth, tileHeight);

          if (borderOpacity > 0) {
            context!.globalAlpha = borderOpacity;
            context!.strokeStyle = borderToken;
            context!.lineWidth = 1;
            context!.strokeRect(tileX + 0.5, tileY + 0.5, tileWidth - 1, tileHeight - 1);
            context!.globalAlpha = 1;
          }
        }
      }
      hasPreviousFrame = true;
    }

    function tick(): void {
      if (streamActive) drawFrame();
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

    resizeCanvas();
    context.fillStyle = backgroundToken;
    context.fillRect(0, 0, cssWidth, cssHeight);

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

    removeTeardown = () => {
      stopLoop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      mediaStream?.getTracks().forEach((track) => track.stop());
      removeTeardown = null;
    };
  }

  const videoElement: DomphyElement<"video"> = {
    video: null,
    muted: true,
    autoPlay: true,
    playsInline: true,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: { display: "none" } as StyleObject,
    _onMount: (node: ElementNode) => {
      videoDomElement = node.domElement as HTMLVideoElement;
      trySetup(node);
    },
    _onRemove: () => {
      videoDomElement = null;
      removeTeardown?.();
    },
  } as unknown as DomphyElement<"video">;

  const canvasElement = {
    canvas: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      display: "block",
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      canvasDomElement = node.domElement as HTMLCanvasElement;
      trySetup(node);
    },
    _onRemove: () => {
      canvasDomElement = null;
      removeTeardown?.();
    },
  } as unknown as DomphyElement<"canvas">;

  const contentChildren: DomphyElement[] = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : [
        { h2: "Webcam Pixel Grid", $: [heading()] } as DomphyElement,
        {
          p: "A live camera feed rendered as a grid of colored pixel tiles.",
          $: [paragraph()],
        } as DomphyElement,
      ];

  const contentOverlay: DomphyElement = {
    div: contentChildren,
    style: {
      position: "relative",
      zIndex: 1,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      height: "100%",
      padding: themeSpacing(8),
    } as StyleObject,
  };

  return {
    div: [videoElement, canvasElement, contentOverlay],
    dataTone: "shift-16",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      width: "100%",
      aspectRatio: `${gridCols} / ${gridRows}`,
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { webcamPixelGrid };
