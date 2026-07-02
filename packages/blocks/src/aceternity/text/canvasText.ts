// Aceternity UI "Canvas Text" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). Large
// display heading text whose letterforms are filled with several looping,
// hand-drawn-looking flowing curved lines painted on a canvas and clipped to
// the exact glyph shapes — colorful strokes visible only inside the letters,
// perfectly cut out to the text silhouette.
//
// Canvas 2D has no native "glyph outline as a path" API, so the clip is done
// with the classic two-pass compositing trick instead of a real Path2D
// outline: each frame the curves are drawn normally (`source-over`), then
// the context switches to `destination-in` and paints the text once more
// with `fillText` — `destination-in` keeps only pixels where BOTH the
// just-drawn curves AND the text glyphs are opaque, erasing everything
// outside the letters. The glyph metrics driving both the canvas font string
// and the wrapper's own box size are read once via `getComputedStyle`/
// `measureText` after mount — the wrapper's own CSS `fontSize`/`fontWeight`
// are set through the theme's `themeSize()` token (a large bold heading
// scale, not a hardcoded pixel value), so the component still respects
// `dataSize`/`dataDensity` context while canvas gets a concrete px number to
// draw with. A single shared `requestAnimationFrame` loop, gated by an
// `IntersectionObserver`, drives the undulation — the same perf idiom this
// package's `canvasRevealEffect()`/`flickeringGrid()` already use.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { type ThemeColor, themeColorToken, themeSize } from "@domphy/theme";

export interface CanvasTextProps {
  /** Text content rendered as the clipped display heading. Defaults to `"Domphy"`. */
  text?: string;
  /** Theme color families cycled across the stack of flowing lines. Defaults to `["info", "primary", "secondary"]`. */
  colors?: ThemeColor[];
  /** Seconds for one full undulation cycle of the flowing curves. Defaults to `6`. */
  animationDuration?: number;
  /** Stroke thickness of each line, in canvas px. Defaults to `2`. */
  lineWidth?: number;
  /** Vertical spacing between adjacent lines, in canvas px. Defaults to `10`. */
  lineGap?: number;
  /** Amplitude of each line's waviness, in canvas px. Defaults to `8`. */
  curveIntensity?: number;
  /** Class name applied to an absolutely-positioned backdrop layer behind the
   * clipped canvas, so callers can supply their own light/dark page-matching
   * background. No backdrop element is rendered at all when omitted. */
  backgroundClassName?: string;
  /** Renders the wrapper `position: absolute` instead of `relative`, so it can
   * be stacked on top of other content. Defaults to `false`. */
  overlay?: boolean;
  /** Extra class name merged onto the wrapper's native `class` attribute. */
  className?: string;
  /** Passthrough style merged onto the wrapper. */
  style?: StyleObject;
}

const SR_ONLY_STYLE = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: "0",
} as const;

const DEFAULT_COLORS: ThemeColor[] = ["info", "primary", "secondary"];
// How many bezier segments make up one flowing line across the canvas width —
// enough to read as a smooth hand-drawn curve without over-tessellating.
const SEGMENTS_PER_LINE = 8;

/**
 * Large display heading text filled with several looping, colorful flowing
 * curves painted on a canvas and clipped to the exact glyph shapes — an
 * ambient, hover-free effect that starts automatically on mount. Call with
 * no arguments for a working demo.
 */
function canvasText(props: CanvasTextProps = {}): DomphyElement<"div"> {
  const text = props.text ?? "Domphy";
  const colors = props.colors && props.colors.length > 0 ? props.colors : DEFAULT_COLORS;
  const animationDurationSeconds = Math.max(0.5, props.animationDuration ?? 6);
  const lineWidthPx = Math.max(0.5, props.lineWidth ?? 2);
  const lineGapPx = Math.max(2, props.lineGap ?? 10);
  const curveIntensityPx = Math.max(0, props.curveIntensity ?? 8);
  const overlay = props.overlay ?? false;

  const srOnlyText: DomphyElement<"span"> = { span: text, style: SR_ONLY_STYLE };

  const backdropLayer: DomphyElement<"div"> | null = props.backgroundClassName
    ? {
        div: null,
        ariaHidden: "true",
        class: props.backgroundClassName,
        style: { position: "absolute", inset: 0 } as StyleObject,
      }
    : null;

  const canvasElement = {
    canvas: null,
    ariaHidden: "true",
    // Decorative canvas with no text of its own — the sr-only span above
    // carries the accessible text; fill colors are resolved imperatively
    // below (canvas 2D has no themeColor() var() concept), mirroring
    // canvasRevealEffect.ts's own exemption for the same reason.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      const canvas = node.domElement as HTMLCanvasElement | null;
      const wrapperElement = canvas?.parentElement ?? null;
      if (!canvas || !wrapperElement || typeof window === "undefined") return;
      const context = canvas.getContext("2d");
      if (!context) return;

      const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      const lineColors = colors.map((color) => {
        try {
          return themeColorToken(node, "shift-10", color);
        } catch {
          return "#3b82f6";
        }
      });

      const computedStyle = window.getComputedStyle(wrapperElement);
      const fontSizePx = Math.max(24, parseFloat(computedStyle.fontSize) || 96);
      const fontWeight = computedStyle.fontWeight || "800";
      const fontFamily = computedStyle.fontFamily || "sans-serif";
      const fontString = `${fontWeight} ${fontSizePx}px ${fontFamily}`;

      context.font = fontString;
      const metrics = context.measureText(text);
      const paddingPx = fontSizePx * 0.15;
      const ascent = metrics.actualBoundingBoxAscent || fontSizePx * 0.8;
      const descent = metrics.actualBoundingBoxDescent || fontSizePx * 0.25;
      const cssWidth = Math.max(1, metrics.width + paddingPx * 2);
      const cssHeight = Math.max(1, ascent + descent + paddingPx * 2);
      const textX = paddingPx;
      const textBaselineY = ascent + paddingPx;

      // Runtime-computed box, not knowable until the glyphs are measured —
      // written imperatively, same idiom canvasRevealEffect.ts/kineticText.ts
      // already use for measurement-driven sizing.
      wrapperElement.style.width = `${cssWidth}px`;
      wrapperElement.style.height = `${cssHeight}px`;
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      canvas.width = Math.max(1, Math.floor(cssWidth * devicePixelRatio));
      canvas.height = Math.max(1, Math.floor(cssHeight * devicePixelRatio));
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      context.textBaseline = "alphabetic";

      const lineCount = Math.max(1, Math.ceil(cssHeight / lineGapPx));
      const angularSpeed = (Math.PI * 2) / (animationDurationSeconds * 1000);

      let animationFrameId: number | null = null;
      let intersectionObserver: IntersectionObserver | null = null;

      function drawFrame(timeMs: number): void {
        // Belt-and-suspenders stop condition: some hosts (e.g. a test
        // harness that wipes the DOM directly instead of going through the
        // framework's removal lifecycle, or an environment without
        // `IntersectionObserver` to gate the loop) never fire the "Remove"
        // hook below. Bailing here once the canvas is detached prevents the
        // loop from leaking forever across unrelated later tests.
        if (!canvas!.isConnected) return;
        context!.clearRect(0, 0, cssWidth, cssHeight);
        context!.globalCompositeOperation = "source-over";

        const phase = timeMs * angularSpeed;
        for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
          const baseY = lineIndex * lineGapPx + lineGapPx / 2;
          context!.beginPath();
          context!.strokeStyle = lineColors[lineIndex % lineColors.length] ?? lineColors[0];
          context!.lineWidth = lineWidthPx;
          context!.lineCap = "round";

          let previousX = 0;
          let previousY = baseY + Math.sin(phase + lineIndex * 0.7) * curveIntensityPx;
          context!.moveTo(previousX, previousY);
          for (let segment = 1; segment <= SEGMENTS_PER_LINE; segment += 1) {
            const x = (segment / SEGMENTS_PER_LINE) * cssWidth;
            const y = baseY + Math.sin(phase + segment * 0.9 + lineIndex * 0.7) * curveIntensityPx;
            const midX = (previousX + x) / 2;
            const midY = (previousY + y) / 2;
            context!.quadraticCurveTo(previousX, previousY, midX, midY);
            previousX = x;
            previousY = y;
          }
          context!.stroke();
        }

        // Erase every pixel that isn't also inside the glyph shapes — the
        // clip-to-text-silhouette step. See file header comment.
        context!.globalCompositeOperation = "destination-in";
        context!.fillStyle = "#000";
        context!.font = fontString;
        context!.fillText(text, textX, textBaselineY);
        context!.globalCompositeOperation = "source-over";

        animationFrameId = window.requestAnimationFrame(drawFrame);
      }

      function startLoop(): void {
        if (animationFrameId !== null) return;
        animationFrameId = window.requestAnimationFrame(drawFrame);
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
        intersectionObserver.observe(wrapperElement);
      } else {
        startLoop();
      }

      node.addHook("Remove", () => {
        stopLoop();
        intersectionObserver?.disconnect();
      });
    },
  } as DomphyElement<"canvas">;

  return {
    div: [srOnlyText, ...(backdropLayer ? [backdropLayer] : []), canvasElement],
    class: props.className,
    // The doctor's `missing-color` heuristic flags any reactive style prop
    // that resolves to a `var(...)` reference without a paired `color` — it
    // can't distinguish a *size* token from a *color* token. This wrapper's
    // `fontSize` exists purely so _onMount can read the resolved px value
    // back via getComputedStyle for canvas metrics; no visible CSS-rendered
    // text actually uses it as typographic color context (the sr-only span
    // is visually clipped, and the visible glyphs are canvas pixels).
    _doctorDisable: "missing-color",
    style: {
      position: overlay ? "absolute" : "relative",
      display: "inline-block",
      // Function-form theme token, not a literal — themeSize()'s own return
      // value drives the resolved px number read back via getComputedStyle
      // in _onMount above, so canvas sizing stays tied to dataSize context.
      fontSize: (listener) => themeSize(listener, "increase-7"),
      fontWeight: () => "800",
      ...(props.style ?? {}),
    } as StyleObject,
  } as DomphyElement<"div">;
}

export { canvasText };
