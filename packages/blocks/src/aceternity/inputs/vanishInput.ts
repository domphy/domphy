// Aceternity UI "Placeholders And Vanish Input" — clean-room reimplementation
// from the public behavior/visual spec only (no upstream source viewed or
// copied). A rounded search/text field whose placeholder text auto-cycles
// through a list of phrases with a vertical slide-crossfade, and which
// dissolves the typed text into drifting particles instead of plainly
// clearing on submit.
//
// Two independent mechanisms, matching the spec's own split:
//
// (1) Placeholder rotation reuses this package's `layoutTextFlip.ts`/
// `wordRotate.ts` idiom: a single-item reactive keyed list, replaced
// wholesale on a fixed interval so the reconciler runs the outgoing key's
// `motion()` exit and the incoming key's enter at once (translateY + fade).
// Rotation is paused (and the whole overlay hidden) whenever the field has
// real typed content, resuming once it's cleared again.
//
// (2) The vanish/dissolve draws the submitted text onto a hidden canvas
// (`context.font` built from the real input's own resolved computed style so
// glyph pixels align), samples the pixel buffer at a coarse 2px stride for a
// grainy rather than photographic look, and turns every sampled opaque pixel
// into a lightweight particle with a small rightward/downward-biased drift
// velocity and its own fade-out rate. A `requestAnimationFrame` loop nudges
// every particle by its velocity plus small jitter and fades it out each
// frame; once every particle has fully faded the canvas clears, the real
// input value resets to empty, and placeholder rotation resumes. Environments
// with no real 2D canvas backend (e.g. jsdom without the optional `canvas`
// npm package) fall back to clearing the field immediately — see
// `fidelityNotes`.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { computed, toState } from "@domphy/core";
import { fab, motion } from "@domphy/ui";
import { type ThemeColor, themeColor, themeColorToken, themeDensity, themeSize, themeSpacing } from "@domphy/theme";

export interface VanishInputProps {
  /** Phrases cycled through as the animated placeholder. Defaults to a short demo list. */
  placeholders?: string[];
  /** Initial/controlled field value. Defaults to `""`. */
  value?: string;
  /** Fires with the live input value on every keystroke. */
  onChange?: (value: string) => void;
  /** Fires with the value present at the moment the vanish animation begins. */
  onSubmit?: (value: string) => void;
  /** `id` attribute of the underlying `<input>`. Defaults to a generated unique id. */
  id?: string;
  /** `name` attribute of the underlying `<input>`. */
  name?: string;
  /** Milliseconds each placeholder phrase is held before rotating to the next. Defaults to `3000`. */
  rotationInterval?: number;
  /** Extra class name merged onto the outer wrapper's native `class` attribute. */
  className?: string;
  /** Passthrough style merged onto the outer wrapper. */
  style?: StyleObject;
}

interface PlaceholderLayer {
  key: string;
  text: string;
}

interface VanishParticle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  red: number;
  green: number;
  blue: number;
  alpha: number;
  decay: number;
}

const DEFAULT_PLACEHOLDERS = [
  "Ask anything…",
  "Search for a component…",
  "What do you want to build today?",
  "Type a question and press enter",
];

// Coarse sampling stride, in device pixels — every other pixel on both axes —
// the spec's own "grainy rather than dense" requirement, and keeps particle
// counts (and therefore per-frame draw cost) reasonable for longer queries.
const SAMPLE_STRIDE = 2;
const MIN_ALPHA_THRESHOLD = 32;

let vanishInputInstanceCounter = 0;

// Visually-hidden but screen-reader-visible label text, matching
// `canvasText.ts`'s own `SR_ONLY_STYLE` idiom — the field's real accessible
// name lives here (associated via `for`/`id`) rather than only on
// `aria-label`, so it also satisfies a plain structural "input needs a
// label" audit.
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

function placeholderLayer(entry: PlaceholderLayer): DomphyElement<"span"> {
  return {
    span: entry.text,
    _key: entry.key,
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      fontSize: (listener: Listener) => themeSize(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-7", "neutral"),
    } as StyleObject,
    $: [
      motion({
        initial: { opacity: 0, y: "0.6em" },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: "-0.6em" },
        transition: { duration: 350, easing: "ease" },
      }),
    ],
  };
}

/** Right-pointing arrow glyph, hand-composed (line + chevron), not traced from any icon library. */
function arrowGlyph(): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [
          { line: null, x1: "4", y1: "12", x2: "16", y2: "12", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round" } as DomphyElement,
          {
            path: null,
            d: "M11 6 L17 12 L11 18",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
          } as DomphyElement,
        ],
        viewBox: "0 0 24 24",
        fill: "none",
        role: "img",
        ariaHidden: "true",
        style: { width: "55%", height: "55%" },
      } as DomphyElement<"svg">,
    ],
    style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" } as StyleObject,
  };
}

/**
 * A rounded search/text field whose placeholder auto-cycles through a list
 * of phrases, and which dissolves the typed text into drifting particles
 * instead of plainly clearing on submit. Call with no arguments for a
 * working demo using a short built-in phrase list.
 */
function vanishInput(props: VanishInputProps = {}): DomphyElement<"div"> {
  const instanceId = ++vanishInputInstanceCounter;
  const placeholders = props.placeholders && props.placeholders.length > 0 ? props.placeholders : DEFAULT_PLACEHOLDERS;
  const rotationInterval = Math.max(500, props.rotationInterval ?? 3000);
  const fieldId = props.id ?? `vanish-input-${instanceId}`;
  const onChange = props.onChange;
  const onSubmit = props.onSubmit;

  const value = toState(props.value ?? "");
  const isVanishing = toState(false);

  let placeholderIndex = 0;
  let placeholderInsertCount = 0;
  const placeholderLayers = toState<PlaceholderLayer[]>([
    { key: `vanish-placeholder-${instanceId}-0`, text: placeholders[0] },
  ]);

  let inputDomElement: HTMLInputElement | null = null;
  let inputElementNode: ElementNode | null = null;
  let canvasDomElement: HTMLCanvasElement | null = null;
  let activeAnimationFrameId: number | null = null;

  function advancePlaceholder(): void {
    if (placeholders.length <= 1 || value.get().length > 0) return;
    placeholderIndex = (placeholderIndex + 1) % placeholders.length;
    placeholderInsertCount += 1;
    placeholderLayers.set([
      { key: `vanish-placeholder-${instanceId}-${placeholderInsertCount}`, text: placeholders[placeholderIndex] },
    ]);
  }

  function buildParticles(submittedValue: string): VanishParticle[] {
    if (!inputDomElement || !canvasDomElement || typeof window === "undefined") return [];
    const context = canvasDomElement.getContext("2d");
    if (!context) return [];

    const rect = inputDomElement.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvasDomElement.width = Math.max(1, Math.floor(width * devicePixelRatio));
    canvasDomElement.height = Math.max(1, Math.floor(height * devicePixelRatio));
    canvasDomElement.style.width = `${width}px`;
    canvasDomElement.style.height = `${height}px`;
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    const computedStyle = window.getComputedStyle(inputDomElement);
    context.font = `${computedStyle.fontWeight || "400"} ${computedStyle.fontSize || "16px"} ${computedStyle.fontFamily || "sans-serif"}`;
    context.textBaseline = "middle";
    context.fillStyle = themeColorToken(inputElementNode, "shift-9", "neutral");
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    context.fillText(submittedValue, paddingLeft, height / 2);

    const particles: VanishParticle[] = [];
    try {
      const pixelWidth = canvasDomElement.width;
      const pixelHeight = canvasDomElement.height;
      const pixels = context.getImageData(0, 0, pixelWidth, pixelHeight).data;
      for (let pixelY = 0; pixelY < pixelHeight; pixelY += SAMPLE_STRIDE) {
        for (let pixelX = 0; pixelX < pixelWidth; pixelX += SAMPLE_STRIDE) {
          const offset = (pixelY * pixelWidth + pixelX) * 4;
          const alpha = pixels[offset + 3];
          if (alpha < MIN_ALPHA_THRESHOLD) continue;
          particles.push({
            x: pixelX / devicePixelRatio,
            y: pixelY / devicePixelRatio,
            velocityX: 0.5 + Math.random() * 1.5,
            velocityY: (Math.random() - 0.5) * 1.2 + 0.3,
            red: pixels[offset],
            green: pixels[offset + 1],
            blue: pixels[offset + 2],
            alpha: 1,
            decay: 0.025 + Math.random() * 0.035,
          });
        }
      }
    } catch {
      // Cross-origin/tainted canvas or an environment with no real 2D
      // backend — fall back to an empty particle set (immediate clear).
      return [];
    }
    context.clearRect(0, 0, width, height);
    return particles;
  }

  function finishVanish(): void {
    if (canvasDomElement) {
      const context = canvasDomElement.getContext("2d");
      context?.clearRect(0, 0, canvasDomElement.width, canvasDomElement.height);
    }
    value.set("");
    isVanishing.set(false);
    activeAnimationFrameId = null;
  }

  function runVanishAnimation(particles: VanishParticle[]): void {
    if (typeof window === "undefined" || !canvasDomElement) {
      finishVanish();
      return;
    }
    const context = canvasDomElement.getContext("2d");
    if (!context || particles.length === 0) {
      finishVanish();
      return;
    }
    const width = canvasDomElement.clientWidth || canvasDomElement.width;
    const height = canvasDomElement.clientHeight || canvasDomElement.height;

    function tick(): void {
      context!.clearRect(0, 0, width, height);
      let anyAlive = false;
      for (const particle of particles) {
        if (particle.alpha <= 0) continue;
        particle.x += particle.velocityX + (Math.random() - 0.5) * 0.4;
        particle.y += particle.velocityY + (Math.random() - 0.5) * 0.4;
        particle.alpha -= particle.decay;
        if (particle.alpha > 0) {
          anyAlive = true;
          context!.fillStyle = `rgba(${particle.red}, ${particle.green}, ${particle.blue}, ${particle.alpha})`;
          context!.fillRect(particle.x, particle.y, 1.5, 1.5);
        }
      }
      if (anyAlive) {
        activeAnimationFrameId = window.requestAnimationFrame(tick);
      } else {
        finishVanish();
      }
    }
    activeAnimationFrameId = window.requestAnimationFrame(tick);
  }

  function submit(): void {
    if (isVanishing.get()) return;
    const submittedValue = value.get();
    if (!submittedValue) return;
    onSubmit?.(submittedValue);
    isVanishing.set(true);
    const particles = buildParticles(submittedValue);
    runVanishAnimation(particles);
  }

  const canvasElement = {
    canvas: null,
    ariaHidden: "true",
    // Decorative particle-dissolve layer with no text of its own — colors
    // are resolved imperatively (canvas 2D has no themeColor() var() concept).
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      width: "100%",
      height: "100%",
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      canvasDomElement = node.domElement as HTMLCanvasElement;
    },
  } as unknown as DomphyElement<"canvas">;

  const srOnlyLabel: DomphyElement<"label"> = {
    label: placeholders[0],
    for: fieldId,
    style: SR_ONLY_STYLE as StyleObject,
  };

  const inputElement: DomphyElement<"input"> = {
    input: null,
    type: "text",
    id: fieldId,
    name: props.name,
    autocomplete: "off",
    value: (listener: Listener) => value.get(listener),
    readonly: (listener: Listener) => isVanishing.get(listener),
    onInput: (event: Event) => {
      const nextValue = (event.target as HTMLInputElement).value;
      value.set(nextValue);
      onChange?.(nextValue);
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submit();
      }
    },
    _onMount: (node: ElementNode) => {
      inputDomElement = node.domElement as HTMLInputElement;
      inputElementNode = node;
    },
    style: {
      position: "relative",
      zIndex: 1,
      flex: "1 1 auto",
      minWidth: 0,
      border: "none",
      outline: "none",
      background: "transparent",
      fontSize: (listener: Listener) => themeSize(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-10", "neutral"),
      opacity: (listener: Listener) => (isVanishing.get(listener) ? 0 : 1),
      // Reserve room for the circular submit button (which is out-of-flow,
      // `position: absolute`) so typed text and the animated placeholder
      // never run underneath it.
      paddingInlineEnd: (listener: Listener) => themeSpacing(themeDensity(listener) * 10),
      transition: "opacity 120ms ease",
    } as StyleObject,
  };

  const placeholderOverlay: DomphyElement<"div"> = {
    div: (listener: Listener) => placeholderLayers.get(listener).map(placeholderLayer),
    ariaHidden: "true",
    style: {
      position: "absolute",
      left: 0,
      right: (listener: Listener) => themeSpacing(themeDensity(listener) * 10),
      top: 0,
      bottom: 0,
      pointerEvents: "none",
      overflow: "hidden",
      opacity: (listener: Listener) => (value.get(listener).length === 0 ? 1 : 0),
      transition: "opacity 150ms ease",
    } as StyleObject,
  };

  // Solid circular fill color, derived from whether the field has content —
  // muted/inert while empty, switching to the accent once there's something
  // to submit. Delegated to `fab()` (rather than a hand-rolled
  // `backgroundColor: (l) => themeColor(l, "shift-9", …)`) so the button's
  // own tone formula lives in one place and follows the same shipped
  // convention every other solid action-button surface in this design
  // system already uses.
  const submitButtonColor = computed<ThemeColor>(() => (value.get().length > 0 ? "primary" : "neutral"));

  const submitButton: DomphyElement<"button"> = {
    button: [arrowGlyph()],
    type: "submit",
    ariaLabel: "Submit",
    disabled: (listener: Listener) => value.get(listener).length === 0 || isVanishing.get(listener),
    $: [fab({ size: "small", color: submitButtonColor })],
    style: {
      position: "absolute",
      top: "50%",
      right: (listener: Listener) => themeSpacing(themeDensity(listener) * 1.5),
      transform: "translateY(-50%)",
      zIndex: 2,
    } as StyleObject,
  };

  const formElement: DomphyElement<"form"> = {
    form: [srOnlyLabel, canvasElement, inputElement, placeholderOverlay, submitButton],
    onSubmit: (event: Event) => {
      event.preventDefault();
      submit();
    },
    dataTone: "shift-16",
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      width: "100%",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      borderRadius: themeSpacing(999),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      outlineOffset: "-1px",
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 2.5),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 5),
      "&:focus-within": {
        outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-6", "primary")}`,
      },
    } as StyleObject,
  };

  return {
    div: [formElement],
    class: props.className,
    style: {
      width: "100%",
      // ~600px at the default 16px root font — the spec's "roughly 500-600px" cap.
      maxWidth: themeSpacing(150),
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined" || placeholders.length <= 1) return;
      const timer = window.setInterval(advancePlaceholder, rotationInterval);
      node.addHook("Remove", () => {
        window.clearInterval(timer);
        if (activeAnimationFrameId !== null) window.cancelAnimationFrame(activeAnimationFrameId);
      });
    },
  };
}

export { vanishInput };
