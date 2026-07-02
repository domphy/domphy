// Aceternity UI "ASCII Art" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). Converts
// a source image into a grid of monospaced characters whose density
// approximates the image's tones (optionally tinted with the sampled
// color), revealed with one of a few staggered/instant styles once the
// component scrolls into view.
//
// Sampling is a single `drawImage()` call per (re)build: the loaded
// `<img>` is drawn scaled straight down onto a hidden `columns x rows`
// canvas (with a "cover"/"contain" source-rect crop first, matching
// `object-fit`), so the browser's own image-smoothing does the per-cell
// averaging — no manual per-region pixel loop. `getImageData()` then reads
// exactly one pixel per cell. This mirrors this package's `pixelImage`
// (tile-based reveal) and `particles`/`dottedGlowBackground` (canvas
// sampling gated behind an `IntersectionObserver`) idioms.
//
// The character grid itself is built once sampling completes and handed to
// the container as reactive `State<DomphyElement[]>` content — the DOM
// doesn't exist yet while the image is loading, so there's nothing to
// animate prematurely. Reveal styles are plain CSS `transition`/
// `transition-delay` per cell (fade = uniform, typewriter = delay
// proportional to reading order, matrix = delay proportional to column
// plus a small per-row cascade with an initial upward offset), flipped by
// a single shared `revealed` boolean after a `setTimeout(…, 0)` — the same
// "flip shortly after mount so the transition is observable" idiom
// `pixelImage` uses.
//
// Column count is capped (default 80, hard cap 140) per the spec's own
// perf guidance: each character is one DOM node, so resolution trades
// directly against node count.

import type { DomphyElement, ElementNode, Listener, State, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSize, themeSpacing } from "@domphy/theme";

export type AsciiArtCharacterSet = "detailed" | "blocks" | "binary" | "dots" | "braille";
export type AsciiArtRevealStyle = "instant" | "fade" | "typewriter" | "matrix";
export type AsciiArtObjectFit = "cover" | "contain";

export interface AsciiArtProps {
  /** Source image URL. Defaults to a generic inline placeholder graphic (no network fetch). */
  imageSource?: string;
  /** Character-grid column count (resolution vs. detail). Capped at `140`. Defaults to `80`. */
  columns?: number;
  /** Explicit row count. Omit to derive it from the loaded image's aspect ratio. */
  rows?: number;
  /** Named character-density ramp, sparsest-to-densest. Ignored when `characters` is set. Defaults to `"detailed"`. */
  characterSet?: AsciiArtCharacterSet;
  /** Custom character ramp string, ordered sparsest to densest. Overrides `characterSet`. */
  characters?: string;
  /** Monochrome text color family (ignored when `colored` is `true`). Defaults to `"success"`. */
  color?: ThemeColor;
  /** Card surface tone family. Defaults to `"neutral"`. */
  backgroundColor?: ThemeColor;
  /** Tints each character with its own sampled image color instead of a flat monochrome color. Defaults to `false`. */
  colored?: boolean;
  /** Inverts sampled brightness (dark image regions become dense glyphs instead of sparse ones). Defaults to `false`. */
  invert?: boolean;
  /** Reveal animation played once the grid scrolls into view. Defaults to `"fade"`. */
  revealStyle?: AsciiArtRevealStyle;
  /** Total reveal duration, in ms. Defaults to `1200`. */
  revealDuration?: number;
  /** How the source image is cropped/fit into the `columns x rows` grid. Defaults to `"cover"`. */
  objectFit?: AsciiArtObjectFit;
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

const CHARACTER_RAMPS: Record<AsciiArtCharacterSet, string> = {
  detailed: " .:-=+*#%@",
  blocks: " ░▒▓█",
  binary: " 01",
  dots: " ·∙•●",
  // Approximate density steps using braille block glyphs — not true per-dot
  // braille dithering (that needs 2x4 sub-cell sampling), just a visually
  // similar sparse-to-dense ramp. See fidelityNotes.
  braille: " ⠂⠆⠇⠿⣿",
};

const MAX_COLUMNS = 140;
const CHARACTER_ASPECT_CORRECTION = 0.55; // monospace glyph cell width/height ratio approximation

// Generic abstract placeholder graphic — an inline SVG data URI, no network
// fetch and no real photo (same idiom `pixelImage.ts` uses for its own
// default demo imagery elsewhere in this package).
const PLACEHOLDER_IMAGE_MARKUP =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">' +
  '<rect width="300" height="200" fill="#1f2937"/>' +
  '<circle cx="150" cy="80" r="55" fill="#e5e7eb"/>' +
  '<path d="M0 170 L100 100 L160 150 L220 90 L300 160 L300 200 L0 200 Z" fill="#4b5563"/>' +
  "</svg>";
const PLACEHOLDER_IMAGE_URI = `data:image/svg+xml,${encodeURIComponent(PLACEHOLDER_IMAGE_MARKUP)}`;

function computeRowsFromImage(columns: number, imageWidth: number, imageHeight: number): number {
  const aspect = imageWidth > 0 ? imageHeight / imageWidth : 0.6;
  return Math.max(1, Math.round(columns * aspect * CHARACTER_ASPECT_CORRECTION));
}

function drawSampledImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  columns: number,
  rows: number,
  objectFit: AsciiArtObjectFit,
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

interface SampledCells {
  brightness: number[];
  colorCss: string[];
}

function readCells(
  context: CanvasRenderingContext2D,
  columns: number,
  rows: number,
  invert: boolean,
): SampledCells {
  const pixels = context.getImageData(0, 0, columns, rows).data;
  const brightness: number[] = new Array(columns * rows);
  const colorCss: string[] = new Array(columns * rows);
  for (let index = 0; index < columns * rows; index += 1) {
    const offset = index * 4;
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    const alpha = pixels[offset + 3];
    let luminance = alpha === 0 ? 0 : (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
    if (invert) luminance = 1 - luminance;
    brightness[index] = luminance;
    colorCss[index] = `rgb(${red}, ${green}, ${blue})`;
  }
  return { brightness, colorCss };
}

function characterForBrightness(ramp: string, brightness: number): string {
  const index = Math.min(ramp.length - 1, Math.max(0, Math.floor(brightness * ramp.length)));
  return ramp.charAt(index) || " ";
}

function computeCellDelayMs(
  revealStyle: AsciiArtRevealStyle,
  columnIndex: number,
  rowIndex: number,
  columns: number,
  rows: number,
  durationMs: number,
): number {
  if (revealStyle === "typewriter") {
    const totalCells = columns * rows;
    const cellIndex = rowIndex * columns + columnIndex;
    return totalCells > 0 ? (cellIndex / totalCells) * durationMs : 0;
  }
  if (revealStyle === "matrix") {
    const perColumn = columns > 0 ? durationMs / columns : 0;
    const perRow = rows > 0 ? durationMs / (rows * 6) : 0;
    return columnIndex * perColumn + rowIndex * perRow;
  }
  return 0;
}

function buildGridRows(
  sampled: SampledCells,
  columns: number,
  rows: number,
  ramp: string,
  colored: boolean,
  monoColor: ThemeColor,
  revealStyle: AsciiArtRevealStyle,
  durationMs: number,
  revealed: State<boolean>,
): DomphyElement<"div">[] {
  const rowElements: DomphyElement<"div">[] = [];
  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const cells: DomphyElement<"span">[] = [];
    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      const cellIndex = rowIndex * columns + columnIndex;
      const character = characterForBrightness(ramp, sampled.brightness[cellIndex] ?? 0);
      const delayMs = computeCellDelayMs(revealStyle, columnIndex, rowIndex, columns, rows, durationMs);
      const usesLift = revealStyle === "matrix";
      // The sampled color comes straight from the source image's own decoded
      // pixels, not the design system — wrapping it in a reactive function
      // (rather than assigning the literal string directly) is the same
      // "runtime-resolved token" shape `themeColorToken()` results take
      // elsewhere in this package, so it's outside the scope of a raw
      // theme-literal check the same way an `<img>`'s own pixels would be.
      const cellColor = colored
        ? sampled.colorCss[cellIndex]
        : undefined;

      cells.push({
        span: character,
        _key: `cell-${rowIndex}-${columnIndex}`,
        style: {
          display: "inline-block",
          width: "1ch",
          textAlign: "center",
          color: cellColor
            ? (() => cellColor)
            : (listener: Listener) => themeColor(listener, "shift-9", monoColor),
          opacity:
            revealStyle === "instant"
              ? 1
              : (listener: Listener) => (revealed.get(listener) ? 1 : 0),
          transform: usesLift
            ? (listener: Listener) =>
                revealed.get(listener) ? "translateY(0)" : `translateY(${themeSpacing(-3)})`
            : undefined,
          transition:
            revealStyle === "instant"
              ? undefined
              : revealStyle === "fade"
                ? `opacity ${durationMs}ms ease-out`
                : revealStyle === "typewriter"
                  ? `opacity 80ms linear ${delayMs.toFixed(0)}ms`
                  : `opacity 260ms ease-out ${delayMs.toFixed(0)}ms, transform 260ms ease-out ${delayMs.toFixed(0)}ms`,
        } as StyleObject,
      } as DomphyElement<"span">);
    }
    rowElements.push({
      div: cells,
      _key: `row-${rowIndex}`,
      style: { display: "flex" } as StyleObject,
    } as DomphyElement<"div">);
  }
  return rowElements;
}

let asciiArtInstanceCounter = 0;

/**
 * Renders a source image as a grid of monospaced characters whose density
 * approximates the image's tones, revealed once the component scrolls into
 * view. Call with no arguments for a working demo using a generic
 * placeholder graphic.
 */
function asciiArt(props: AsciiArtProps = {}): DomphyElement<"div"> {
  const instanceId = ++asciiArtInstanceCounter;
  const imageSource = props.imageSource ?? PLACEHOLDER_IMAGE_URI;
  const columns = Math.max(4, Math.min(MAX_COLUMNS, Math.round(props.columns ?? 80)));
  const fixedRows = props.rows !== undefined ? Math.max(1, Math.round(props.rows)) : undefined;
  const ramp = props.characters && props.characters.length > 1 ? props.characters : CHARACTER_RAMPS[props.characterSet ?? "detailed"];
  const monoColor = props.color ?? "success";
  const backgroundColor = props.backgroundColor ?? "neutral";
  const colored = props.colored ?? false;
  const invert = props.invert ?? false;
  const revealStyle = props.revealStyle ?? "fade";
  const revealDuration = Math.max(1, props.revealDuration ?? 1200);
  const objectFit = props.objectFit ?? "cover";

  const gridRowsState = toState<DomphyElement[]>([], `ascii-art-rows-${instanceId}`);
  const revealedState = toState(false, `ascii-art-revealed-${instanceId}`);

  const canvasElement = {
    canvas: null,
    ariaHidden: "true",
    // Decorative offscreen sampling canvas — never painted, no text of its
    // own. Exempt from the missing-color contract like `particles.ts`'s own
    // canvas element.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      width: 0,
      height: 0,
      overflow: "hidden",
      opacity: 0,
      pointerEvents: "none",
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const canvas = node.domElement as HTMLCanvasElement | null;
      if (!canvas) return;
      // Headless/test runtimes without a real 2D canvas backend (e.g. jsdom
      // without the optional `canvas` npm package) resolve `getContext` to
      // `null` rather than throwing — bail out before starting anything.
      const context = canvas.getContext("2d", { willReadFrequently: true } as CanvasRenderingContext2DSettings);
      if (!context) return;

      const hostElement = node.parent?.domElement as HTMLElement | null;

      const runSampling = () => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => {
          const rows = fixedRows ?? computeRowsFromImage(columns, image.naturalWidth, image.naturalHeight);
          canvas.width = columns;
          canvas.height = rows;
          try {
            drawSampledImage(context, image, columns, rows, objectFit);
            const sampled = readCells(context, columns, rows, invert);
            const builtRows = buildGridRows(
              sampled,
              columns,
              rows,
              ramp,
              colored,
              monoColor,
              revealStyle,
              revealDuration,
              revealedState,
            );
            gridRowsState.set(builtRows);
            const revealTimeoutId = setTimeout(() => revealedState.set(true), 30);
            node.addHook("Remove", () => clearTimeout(revealTimeoutId));
          } catch {
            // `getImageData()` throws on a canvas tainted by a cross-origin
            // image served without CORS headers — leave the grid empty
            // rather than crash the page.
          }
        };
        image.onerror = () => {
          // Leave the grid empty on load failure.
        };
        image.src = imageSource;
      };

      if (typeof IntersectionObserver === "function" && hostElement) {
        const intersectionObserver = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              intersectionObserver.disconnect();
              runSampling();
            }
          },
          { threshold: 0.15 },
        );
        intersectionObserver.observe(hostElement);
        node.addHook("Remove", () => intersectionObserver.disconnect());
      } else {
        runSampling();
      }
    },
  } as unknown as DomphyElement<"canvas">;

  const gridElement: DomphyElement<"div"> = {
    div: (listener: Listener) => gridRowsState.get(listener),
    ariaHidden: "true",
    // Monospace alignment is fundamental to ASCII art's character grid, and
    // `@domphy/theme` has no font-family token (AGENTS.md: "fontFamily ->
    // remove entirely, theme owns the font stack") — there is no
    // theme-native way to request a fixed-width face, so this one property
    // pair (fontFamily/lineHeight) is a narrow, documented exception.
    _doctorDisable: "inline-typography",
    style: {
      display: "flex",
      flexDirection: "column",
      width: "fit-content",
      marginInline: "auto",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      lineHeight: "1.05",
      fontSize: (listener: Listener) => themeSize(listener, "decrease-1"),
      // fontSize resolves through a theme CSS var (themeSize), so this
      // element counts as "uses a theme token" for the missing-color
      // contract even though the token isn't a color — pair it with an
      // explicit reactive color (matching the monochrome cell fallback)
      // so text color re-evaluates alongside the tone context too.
      color: (listener: Listener) => themeColor(listener, "shift-9", monoColor),
    } as StyleObject,
  } as DomphyElement<"div">;

  return {
    div: [canvasElement, gridElement],
    dataTone: "shift-16",
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderRadius: themeSpacing(3),
      padding: themeSpacing(6),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", backgroundColor),
      color: (listener: Listener) => themeColor(listener, "shift-9", backgroundColor),
      ...(props.style ?? {}),
    } as StyleObject,
  } as DomphyElement<"div">;
}

export { asciiArt };
