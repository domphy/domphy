// Aceternity UI "Images Slider" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// full-bleed background image slider that autoplays and responds to
// keyboard navigation, transitioning slides with a subtle 3D tilt-and-scale
// entrance.
//
// The "AnimatePresence swap" the spec describes maps directly onto Domphy's
// own keyed-list reconciliation: the image layer's content is a reactive
// function returning a single-element array keyed by the active index
// (`div: (listener) => [buildSlideLayer(activeIndex.get(listener))]`, the
// exact pattern `@domphy/ui`'s own motion docs use for enter/exit swaps).
// Changing the key removes the previous slide (playing its `motion()` exit
// keyframe — a translateY slide fully off-screen) while inserting the new
// one (playing its enter keyframe — scale/opacity/rotateX settling to
// flat), both live in the DOM at once for the crossover, no manual
// mount/unmount bookkeeping needed. `motion()`'s single shared
// `transition.duration` (this component uses ~650ms) is the honest
// approximation of the spec's differing enter (~500ms) / exit (~1000ms)
// numbers, which the patch's single-transition-per-instance API can't split.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { button, heading, motion } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";

export type ImageSliderExitDirection = "up" | "down";

export interface ImageSliderProps {
  /** Background image URLs, cycled in order. Defaults to 3 generic placeholder photos. */
  images?: string[];
  /** Content rendered centered above the overlay (heading, button, …). Defaults to a generic demo caption. */
  children?: DomphyElement | DomphyElement[];
  /** Dark semi-transparent legibility layer over the image. Defaults to `true`. */
  overlay?: boolean;
  /** Passthrough style merged onto the overlay layer. */
  overlayStyle?: StyleObject;
  /** Auto-advances every `intervalMs`. Defaults to `true`. */
  autoplay?: boolean;
  /** Milliseconds between automatic slide changes. Defaults to `5000`. */
  intervalMs?: number;
  /** Which way the outgoing slide exits. Defaults to `"up"`. */
  direction?: ImageSliderExitDirection;
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

function placeholderSlide(paletteIndex: number): string {
  const palettes = [
    { top: "#0f172a", accent: "#38bdf8" },
    { top: "#1e293b", accent: "#f472b6" },
    { top: "#111827", accent: "#facc15" },
  ];
  const palette = palettes[paletteIndex % palettes.length]!;
  const markup =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">' +
    `<rect width="800" height="500" fill="${palette.top}"/>` +
    `<circle cx="620" cy="140" r="90" fill="${palette.accent}"/>` +
    `<path d="M0 380 L220 220 L360 320 L520 180 L800 360 L800 500 L0 500 Z" fill="rgba(255,255,255,0.08)"/>` +
    "</svg>";
  return `data:image/svg+xml,${encodeURIComponent(markup)}`;
}

const DEFAULT_IMAGES: string[] = [placeholderSlide(0), placeholderSlide(1), placeholderSlide(2)];

function defaultSliderContent(): DomphyElement[] {
  return [
    { h2: "Explore the World", $: [heading({ color: "neutral" })] } as DomphyElement,
    {
      button: "Get Started",
      $: [button({ color: "primary" })],
    } as DomphyElement<"button">,
  ];
}

function buildSlideLayer(
  index: number,
  imageSource: string,
  exitDirection: ImageSliderExitDirection,
): DomphyElement<"div"> {
  return {
    div: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    _key: `image-slider-slide-${index}`,
    style: {
      position: "absolute",
      inset: 0,
      // Quoted `url("...")`, not `url(...)` — the SVG data URI's `rgba(...)` fill leaves
      // literal, unescaped parentheses in the encoded string (encodeURIComponent doesn't
      // escape `(`/`)`), and an *unquoted* CSS url() treats a bare `(`/`)` as the end of
      // the function, silently invalidating (and dropping) the whole declaration.
      backgroundImage: `url("${imageSource}")`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    } as StyleObject,
    $: [
      motion({
        initial: { opacity: 0, transform: "scale(0) rotateX(45deg)" },
        animate: { opacity: 1, transform: "scale(1) rotateX(0deg)" },
        exit: { y: exitDirection === "up" ? "-150%" : "150%" },
        transition: { duration: 650, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      }),
    ],
  } as DomphyElement<"div">;
}

/**
 * A full-bleed autoplaying background image slider with keyboard navigation
 * and a subtle 3D tilt-and-scale slide transition. Call with no arguments
 * for a working demo with 3 generic placeholder photos.
 */
function imageSlider(props: ImageSliderProps = {}): DomphyElement<"div"> {
  const images = props.images && props.images.length > 0 ? props.images : DEFAULT_IMAGES;
  const totalSlides = images.length;
  const showOverlay = props.overlay ?? true;
  const autoplay = props.autoplay ?? true;
  const intervalMs = Math.max(500, props.intervalMs ?? 5000);
  const exitDirection = props.direction ?? "up";
  const content = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultSliderContent();

  const activeIndexState = toState(0, "image-slider-active-index");

  const imageLayerWrapper: DomphyElement<"div"> = {
    div: (listener: Listener) => {
      const index = activeIndexState.get(listener);
      return [buildSlideLayer(index, images[index] ?? images[0]!, exitDirection)];
    },
    style: { position: "absolute", inset: 0, zIndex: 0, overflow: "hidden", perspective: "1200px" } as StyleObject,
  } as DomphyElement<"div">;

  const overlayLayer: DomphyElement<"div"> | null = showOverlay
    ? ({
        div: null,
        ariaHidden: "true",
        dataTone: "shift-17",
        style: {
          position: "absolute",
          inset: 0,
          zIndex: 1,
          backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
          color: (listener: Listener) => themeColor(listener, "shift-9"),
          opacity: 0.55,
          pointerEvents: "none",
          ...(props.overlayStyle ?? {}),
        } as StyleObject,
      } as DomphyElement<"div">)
    : null;

  const contentLayer: DomphyElement<"div"> = {
    div: content,
    style: {
      position: "relative",
      zIndex: 2,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      textAlign: "center",
      gap: themeSpacing(4),
    } as StyleObject,
  } as DomphyElement<"div">;

  return {
    div: [imageLayerWrapper, ...(overlayLayer ? [overlayLayer] : []), contentLayer],
    tabindex: 0,
    style: {
      position: "relative",
      overflow: "hidden",
      width: "100%",
      height: "100dvh",
      outline: "none",
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const containerElement = node.domElement as HTMLElement | null;
      if (!containerElement) return;

      let intervalId: ReturnType<typeof setInterval> | null = null;
      let intersectionObserver: IntersectionObserver | null = null;

      const goToIndex = (nextIndex: number) => {
        const wrapped = ((nextIndex % totalSlides) + totalSlides) % totalSlides;
        activeIndexState.set(wrapped);
      };
      const goNext = () => goToIndex(activeIndexState.get() + 1);
      const goPrevious = () => goToIndex(activeIndexState.get() - 1);

      const stopAutoplay = () => {
        if (intervalId === null) return;
        clearInterval(intervalId);
        intervalId = null;
      };
      const restartAutoplay = () => {
        stopAutoplay();
        if (autoplay && totalSlides > 1) intervalId = setInterval(goNext, intervalMs);
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          goNext();
          restartAutoplay();
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          goPrevious();
          restartAutoplay();
        }
      };
      window.addEventListener("keydown", handleKeyDown);

      if (typeof IntersectionObserver === "function") {
        intersectionObserver = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) restartAutoplay();
            else stopAutoplay();
          }
        });
        intersectionObserver.observe(containerElement);
      } else {
        restartAutoplay();
      }

      node.addHook("Remove", () => {
        stopAutoplay();
        intersectionObserver?.disconnect();
        window.removeEventListener("keydown", handleKeyDown);
      });
    },
  } as DomphyElement<"div">;
}

export { imageSlider };
