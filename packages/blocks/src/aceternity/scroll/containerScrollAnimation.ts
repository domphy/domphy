// Aceternity UI "Container Scroll Animation" — clean-room reimplementation
// from the public behavior/visual spec only (no upstream source viewed or
// copied). A hero section: a heading sits above a large rounded card that
// rests reclined in 3D perspective and scaled down, then "stands up" to
// face the viewer at full size as the user scrolls through the section.
//
// Same `position: sticky` pinned-range idiom `textReveal()`/`macbookScroll`
// use: a tall outer `<section>` defines the scroll room, an inner
// `position: sticky` stage stays pinned for that whole range, and progress
// (0 at pin-start, 1 at pin-release) comes from the outer section's
// `getBoundingClientRect()` against `window.innerHeight`. Unlike
// `macbookScroll`/`parallaxScroll` (which write straight to captured DOM
// refs every frame — cheaper for many repeated child nodes), this component
// only ever transforms two elements (the header and the card), so progress
// is kept as a `State<number>` and both transforms are plain reactive
// `style.transform` functions reading it — the same idiom `textReveal`/
// `googleGeminiEffect` use, letting Domphy's own reactivity do the DOM
// writes instead of an imperative paint function.
//
// `perspective` lives on the sticky stage (the rotated card's own ancestor)
// via `themeSpacing()`, not a raw px value — without an ancestor perspective
// the card's `rotateX` would read as a flat vertical squish instead of
// genuine 3D depth.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { heading, strong } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";

export interface ContainerScrollAnimationProps {
  /** Heading rendered above the card. Defaults to a two-line demo headline with a colored accent word. */
  titleComponent?: string | DomphyElement;
  /** Content rendered inside the card (typically a screenshot/mockup image). Defaults to a placeholder image. */
  children?: DomphyElement | DomphyElement[];
  /** Card's starting `rotateX`, in degrees, at scroll progress 0 (its top edge leaning away from the
   * viewer, reclined). Defaults to `20`. */
  initialRotationDegrees?: number;
  /** Card's starting scale at scroll progress 0. Defaults to `0.75`. */
  initialScale?: number;
  /** How tall the scroll wrapper is, in viewport-height units. Defaults to `200`, clamped to a minimum of `140`. */
  wrapperHeightVh?: number;
  /** Passthrough style merged onto the card. */
  style?: StyleObject;
}

let containerScrollAnimationInstanceCounter = 0;

function clampToUnitRange(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Pinned-range progress: 0 when the section's top reaches the viewport top, 1 when its
 * bottom reaches the viewport bottom — same math `textReveal()`/`macbookScroll` use. */
function computePinnedProgress(sectionElement: HTMLElement): number {
  const rect = sectionElement.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const scrollableDistance = rect.height - viewportHeight;
  const raw = scrollableDistance > 0 ? -rect.top / scrollableDistance : rect.top <= 0 ? 1 : 0;
  return clampToUnitRange(raw);
}

/**
 * A hero section whose large card stands up out of a reclined 3D pose into
 * a flat, full-size presentation as the section scrolls through the
 * viewport — purely scroll-driven, no click required. Call with no
 * arguments for a working demo (a two-line headline over a placeholder
 * screenshot card).
 */
function containerScrollAnimation(props: ContainerScrollAnimationProps = {}): DomphyElement<"section"> {
  const instanceId = ++containerScrollAnimationInstanceCounter;
  const initialRotationDegrees = props.initialRotationDegrees ?? 20;
  const initialScale = Math.min(1, Math.max(0.4, props.initialScale ?? 0.75));
  const wrapperHeightVh = Math.max(140, Math.round(props.wrapperHeightVh ?? 200));
  const progress = toState(0, `container-scroll-animation-${instanceId}`);

  const titleNode: DomphyElement =
    typeof props.titleComponent === "string"
      ? ({ h2: props.titleComponent, $: [heading()] } as DomphyElement)
      : (props.titleComponent ??
        ({
          h2: [
            "Build interfaces that feel ",
            { strong: "alive", $: [strong({ color: "primary" })] } as DomphyElement,
            ".",
          ],
          $: [heading()],
        } as DomphyElement));

  const cardChildren: DomphyElement[] = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : [
        {
          img: null,
          src: "https://picsum.photos/seed/domphy-container-scroll/1400/860",
          alt: "Product screenshot",
          _doctorDisable: "missing-color",
          style: { display: "block", width: "100%", height: "100%", objectFit: "cover" } as StyleObject,
        } as DomphyElement,
      ];

  return {
    section: [
      {
        div: [
          {
            div: [titleNode],
            style: {
              position: "relative",
              zIndex: 1,
              textAlign: "center",
              marginBlockEnd: themeSpacing(10),
              // Floor raised from 0.6 to 0.85 — at progress=0 (the very
              // first, pre-scroll paint, which is exactly what a static a11y
              // scan captures) the heading/strong text measured a real WCAG
              // contrast failure (axe-core `color-contrast`) at 0.6. 0.85
              // keeps a subtle scroll-in fade without meaningfully dimming
              // the headline a visitor sees before they've scrolled at all.
              opacity: (listener: Listener) => 0.85 + 0.15 * progress.get(listener),
              transform: (listener: Listener) => `translateY(${(6 - 6 * progress.get(listener)).toFixed(1)}px)`,
            } as StyleObject,
          } as DomphyElement<"div">,
          {
            div: cardChildren,
            dataTone: "shift-16",
            style: {
              position: "relative",
              width: "min(92vw, 64em)",
              aspectRatio: "16 / 9",
              overflow: "hidden",
              borderRadius: themeSpacing(6),
              outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
              outlineOffset: "-1px",
              boxShadow: (listener: Listener) => `0 ${themeSpacing(6)} ${themeSpacing(16)} ${themeColor(listener, "shift-17")}`,
              backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
              color: (listener: Listener) => themeColor(listener, "shift-9"),
              transformOrigin: "50% 100%",
              transform: (listener: Listener) => {
                const value = progress.get(listener);
                const rotation = initialRotationDegrees * (1 - value);
                const scale = initialScale + (1 - initialScale) * value;
                return `rotateX(${rotation.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
              },
              ...(props.style ?? {}),
            } as StyleObject,
          } as DomphyElement<"div">,
        ],
        style: {
          position: "sticky",
          insetBlockStart: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          perspective: themeSpacing(320),
        } as StyleObject,
      } as DomphyElement<"div">,
    ],
    style: { position: "relative", minHeight: `${wrapperHeightVh}vh` } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") return;
      const sectionElement = node.domElement as HTMLElement;

      let currentProgress = computePinnedProgress(sectionElement);
      let targetProgress = currentProgress;
      let isAnimating = false;
      let animationFrameHandle = 0;
      progress.set(currentProgress);

      function step(): void {
        currentProgress += (targetProgress - currentProgress) * 0.18;
        if (Math.abs(targetProgress - currentProgress) < 0.001) {
          currentProgress = targetProgress;
          progress.set(currentProgress);
          isAnimating = false;
          return;
        }
        progress.set(currentProgress);
        animationFrameHandle = window.requestAnimationFrame(step);
      }

      function handleScroll(): void {
        targetProgress = computePinnedProgress(sectionElement);
        if (!isAnimating) {
          isAnimating = true;
          animationFrameHandle = window.requestAnimationFrame(step);
        }
      }

      window.addEventListener("scroll", handleScroll, { passive: true });
      window.addEventListener("resize", handleScroll);

      node.addHook("Remove", () => {
        window.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", handleScroll);
        if (animationFrameHandle) window.cancelAnimationFrame(animationFrameHandle);
      });
    },
  };
}

export { containerScrollAnimation };
