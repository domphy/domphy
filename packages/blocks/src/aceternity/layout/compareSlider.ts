// Aceternity UI "Compare" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// before/after image box with a draggable (or hover-tracked) vertical
// divider revealing the second image over the first.
//
// The overlay (second) image is sized to the container's full width/height
// like the base image and made to only show the region left of the divider
// via a reactive `clip-path: inset(...)` on the image itself, rather than
// shrinking a narrower wrapper `<div>` around a full-width image — the two
// read identically (only the region left of the divider is visible) but
// `clip-path` sidesteps the "wrapper width != image width" pitfall the
// wrapper approach requires guarding against (documented in the spec's own
// research note): the image element's own box never changes size, so
// there's nothing to keep in sync.
//
// Pointer tracking writes straight to a `toState<number>` percentage on every
// `pointermove` — no measurement caching or easing beyond the plain CSS
// `transition` on the divider/clip position, matching this package's other
// zero-lag cursor-follow effects (`textHoverEffect.ts`, `magicCard.ts`).
// Drag mode listens on `window` for the duration of the press (the same
// "declarative `pointerdown`, imperative `window` move/up for the drag's
// lifetime" idiom `draggableCard.ts`/`splitterHandle()` use); hover mode just
// listens on the container directly, no press needed. Autoplay is a small
// `requestAnimationFrame` loop driving a sine oscillation between two bounds,
// pausing (without losing phase) while the user is actively dragging/hovering.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface CompareSliderProps {
  /** Base image URL, fully visible right of the divider. Renders a themed
   * placeholder panel when omitted. */
  firstImage?: string;
  /** Overlay image URL, visible left of the divider. Renders a themed
   * placeholder panel when omitted. */
  secondImage?: string;
  /** Extra class name merged onto the outer container. */
  className?: string;
  /** Extra class name merged onto the first (base) image element. */
  firstImageClassName?: string;
  /** Extra class name merged onto the second (overlay) image element. */
  secondImageClassName?: string;
  /** `"hover"` tracks the divider to the cursor on every pointer move with no
   * click required; `"drag"` requires press-and-hold. Defaults to `"hover"`. */
  slideMode?: "hover" | "drag";
  /** Starting divider position, 0-100. Defaults to `50`. */
  initialSliderPercentage?: number;
  /** Shows the circular chevron handle centered on the divider. Defaults to `true`. */
  showHandlebar?: boolean;
  /** Animates the divider back and forth on its own when not being
   * interacted with. Defaults to `false`. */
  autoplay?: boolean;
  /** Milliseconds for one full automatic back-and-forth sweep. Defaults to `5000`. */
  autoplayDuration?: number;
  style?: StyleObject;
}

const AUTOPLAY_CENTER_PERCENT = 50;
const AUTOPLAY_AMPLITUDE_PERCENT = 40;

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function placeholderPanel(colorFamily: ThemeColor, className?: string, extraStyle?: StyleObject): DomphyElement<"div"> {
  return {
    div: null,
    // See compareSlider()'s own note: an explicit `class: undefined` would
    // clobber the auto-generated per-node style class, so only set `class`
    // when a real className was passed.
    ...(className ? { class: className } : {}),
    ariaHidden: "true",
    // Decorative fallback surface with no text of its own.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      backgroundImage: (listener: Listener) =>
        `linear-gradient(135deg, ${themeColor(listener, "shift-6", colorFamily)}, ${themeColor(listener, "shift-11", colorFamily)})`,
      ...(extraStyle ?? {}),
    } as StyleObject,
  } as DomphyElement<"div">;
}

/** Two opposing chevrons (‹›) signaling the handle is horizontally draggable. */
function chevronsGlyph(): DomphyElement<"svg"> {
  return {
    svg: [
      { path: null, d: "M14 6l-6 6 6 6", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
      { path: null, d: "M10 6l6 6-6 6", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
    ],
    viewBox: "0 0 24 24",
    ariaHidden: "true",
    style: { display: "block", width: themeSpacing(4), height: themeSpacing(4) } as StyleObject,
  } as DomphyElement<"svg">;
}

/**
 * A before/after image box with a divider that tracks the pointer (hover
 * mode) or drags on press (drag mode) to reveal the second image over the
 * first, with an optional self-playing autoplay sweep. Call with no
 * arguments for a working demo — two themed placeholder panels split at 50%.
 */
function compareSlider(props: CompareSliderProps = {}): DomphyElement<"div"> {
  const slideMode = props.slideMode ?? "hover";
  const showHandlebar = props.showHandlebar ?? true;
  const autoplay = props.autoplay ?? false;
  const autoplayDuration = Math.max(200, props.autoplayDuration ?? 5000);

  const percent = toState(clampPercent(props.initialSliderPercentage ?? 50));

  let containerElement: HTMLElement | null = null;
  let interacting = false;

  const updateFromClientX = (clientX: number) => {
    if (!containerElement) return;
    const rect = containerElement.getBoundingClientRect();
    const width = rect.width || containerElement.clientWidth || 1;
    percent.set(clampPercent(((clientX - rect.left) / width) * 100));
  };

  const secondImageClipStyle: StyleObject = {
    clipPath: (listener: Listener) => `inset(0 ${100 - percent.get(listener)}% 0 0)`,
    transition: "clip-path 60ms linear",
  } as StyleObject;

  const firstImageElement: DomphyElement = props.firstImage
    ? ({
        img: null,
        src: props.firstImage,
        alt: "Before",
        ...(props.firstImageClassName ? { class: props.firstImageClassName } : {}),
        style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" } as StyleObject,
      } as DomphyElement<"img">)
    : placeholderPanel("primary", props.firstImageClassName);

  const secondImageElement: DomphyElement = props.secondImage
    ? ({
        img: null,
        src: props.secondImage,
        alt: "After",
        ...(props.secondImageClassName ? { class: props.secondImageClassName } : {}),
        style: {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          pointerEvents: "none",
          ...secondImageClipStyle,
        } as StyleObject,
      } as DomphyElement<"img">)
    : placeholderPanel("secondary", props.secondImageClassName, secondImageClipStyle);

  const divider: DomphyElement<"div"> = {
    div: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      insetBlockStart: 0,
      insetBlockEnd: 0,
      insetInlineStart: (listener: Listener) => `${percent.get(listener)}%`,
      width: themeSpacing(0.5),
      transform: "translateX(-50%)",
      pointerEvents: "none",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      boxShadow: (listener: Listener) => `0 0 ${themeSpacing(3)} ${themeColor(listener, "inherit")}`,
      transition: "left 60ms linear",
    } as StyleObject,
  } as DomphyElement<"div">;

  const handle: DomphyElement<"div"> = {
    div: [chevronsGlyph()],
    role: "separator",
    ariaOrientation: "vertical",
    ariaValuemin: "0",
    ariaValuemax: "100",
    ariaValuenow: (listener: Listener) => String(Math.round(percent.get(listener))),
    style: {
      position: "absolute",
      insetBlockStart: "50%",
      insetInlineStart: (listener: Listener) => `${percent.get(listener)}%`,
      transform: "translate(-50%, -50%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: themeSpacing(9),
      height: themeSpacing(9),
      borderRadius: themeSpacing(999),
      pointerEvents: "none",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      boxShadow: (listener: Listener) => `0 ${themeSpacing(1)} ${themeSpacing(3)} ${themeColor(listener, "shift-4", "neutral")}`,
      transition: "left 60ms linear",
    } as StyleObject,
  } as DomphyElement<"div">;

  const dragHandlers = {
    onPointerDown: (event: PointerEvent) => {
      if (typeof window === "undefined") return;
      interacting = true;
      updateFromClientX(event.clientX);
      const handleMove = (moveEvent: PointerEvent) => updateFromClientX(moveEvent.clientX);
      const handleUp = () => {
        interacting = false;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
  };

  const hoverHandlers = {
    onPointerEnter: () => {
      interacting = true;
    },
    onPointerMove: (event: PointerEvent) => {
      updateFromClientX(event.clientX);
    },
    onPointerLeave: () => {
      interacting = false;
    },
  };

  return {
    div: [firstImageElement, secondImageElement, divider, ...(showHandlebar ? [handle] : [])],
    // Only set `class` when a className was actually passed — an explicit
    // `class: undefined` would overwrite (not skip) the auto-generated
    // per-node style class ElementNode.merge() seeds at construction,
    // silently dropping this element's own `style: {}` from the DOM.
    ...(props.className ? { class: props.className } : {}),
    ...(slideMode === "drag" ? dragHandlers : hoverHandlers),
    // Edge-anchor the surface tone here (a light shift-1) instead of baking
    // a fixed tone straight into backgroundColor below — descendants (divider,
    // placeholder panels) read this same anchor via "inherit"/relative shifts.
    dataTone: "shift-1",
    _onMount: (node: ElementNode) => {
      containerElement = node.domElement as HTMLElement;
      if (!autoplay || typeof window === "undefined") return;

      const wrapperElement = containerElement;
      let autoplayElapsedMs = 0;
      let lastFrameTimeMs = typeof performance !== "undefined" ? performance.now() : Date.now();
      let animationFrameId: number | null = null;

      const tick = (nowMs: number) => {
        // Belt-and-suspenders stop condition: some hosts (e.g. a test
        // harness that wipes the DOM directly instead of going through the
        // framework's removal lifecycle) never fire the "Remove" hook below.
        // Bailing here once the container is detached prevents the loop from
        // leaking forever across unrelated later tests.
        if (!wrapperElement.isConnected) return;
        const deltaMs = nowMs - lastFrameTimeMs;
        lastFrameTimeMs = nowMs;
        if (!interacting) {
          autoplayElapsedMs += deltaMs;
          const phase = (autoplayElapsedMs % autoplayDuration) / autoplayDuration;
          const eased = Math.sin(phase * Math.PI * 2);
          percent.set(clampPercent(AUTOPLAY_CENTER_PERCENT + AUTOPLAY_AMPLITUDE_PERCENT * eased));
        }
        animationFrameId = window.requestAnimationFrame(tick);
      };
      animationFrameId = window.requestAnimationFrame(tick);

      node.addHook("Remove", () => {
        if (animationFrameId !== null) window.cancelAnimationFrame(animationFrameId);
      });
    },
    _onRemove: () => {
      containerElement = null;
    },
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      width: "100%",
      aspectRatio: "16 / 9",
      cursor: slideMode === "drag" ? "col-resize" : "default",
      touchAction: "none",
      userSelect: "none",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  } as DomphyElement<"div">;
}

export { compareSlider };
