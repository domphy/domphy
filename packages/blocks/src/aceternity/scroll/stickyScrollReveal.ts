// Aceternity UI "Sticky Scroll Reveal" — clean-room reimplementation from
// the public behavior/visual spec only (no upstream source viewed or
// copied). A two-column layout: a list of long-form text sections scrolls
// past on the left while a rounded panel on the right stays pinned
// (`position: sticky`) and swaps its background color/content to match
// whichever section is currently nearest the viewport's vertical center.
//
// "Nearest to center" is computed the same `getBoundingClientRect()` +
// rAF-debounced scroll/resize idiom this package already uses for
// scroll-scrubbed effects (`textReveal`, `googleGeminiEffect`) rather than
// an `IntersectionObserver` root-margin band — a plain distance-to-center
// comparison across every title block is simpler to reason about, needs no
// observer polyfill, and (unlike an observer) still yields a sane answer in
// jsdom where every rect defaults to zero (all distances tie at 0, so the
// first item wins deterministically).
//
// The panel itself does NOT scrub continuously — the active index is a
// discrete `State<number>`, and every content layer is pre-rendered
// stacked in the panel with its opacity/pointer-events reactively tied to
// "is this index active", plus a CSS `transition` on `opacity` and
// `background-color`. That is the "snap to nearest section, then animate
// the swap with a short eased transition" pattern the spec calls for,
// implemented as N always-mounted layers cross-fading rather than
// destroying/recreating a single "current" node on every index change.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { heading, paragraph, strong } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSize, themeSpacing } from "@domphy/theme";

export interface StickyScrollContentItem {
  /** Section heading shown in the left column. */
  title: string;
  /** Muted description paragraph beneath the title. */
  description: string;
  /** Content rendered inside the sticky panel while this section is active.
   * Defaults to a large numeral badge. */
  node?: DomphyElement | DomphyElement[];
  /** Theme color family for this item's panel background. Cycles through a
   * default set (`primary`, `success`, `info`, `secondary`) when omitted. */
  color?: ThemeColor;
}

export interface StickyScrollRevealProps {
  /** Sections to scroll through. Defaults to 4 items describing Domphy's own architecture. */
  content?: StickyScrollContentItem[];
  /** Fraction (0–1) of the row's width the sticky panel occupies. Defaults to `0.42`. */
  panelWidthFraction?: number;
  /** Passthrough style merged onto the sticky panel. */
  panelStyle?: StyleObject;
  /** Passthrough style merged onto the outer two-column wrapper. */
  style?: StyleObject;
}

const DEFAULT_COLORS: ThemeColor[] = ["primary", "success", "info", "secondary"];

const DEFAULT_CONTENT: StickyScrollContentItem[] = [
  {
    title: "Reactive by default",
    description:
      "A state read happens inside a listener, so every element that touched it re-renders exactly when it changes — no diffing pass, no virtual DOM.",
  },
  {
    title: "Theme tokens, not magic numbers",
    description:
      "Every color and spacing value routes through themeColor()/themeSpacing(), so the whole surface adapts instantly when the palette or density changes.",
  },
  {
    title: "SSR and hydration, built in",
    description:
      "The same element tree renders on the server and mounts on the client — no separate server/client component split to maintain side by side.",
  },
  {
    title: "Patches over components",
    description:
      "Behavior and style compose through the $ array onto plain elements, so nothing hides behind a wrapper component's own opaque render function.",
  },
];

let stickyScrollRevealInstanceCounter = 0;

/** Big numeral badge used as a section's panel content when no `node` is supplied. */
function defaultPanelNode(index: number): DomphyElement<"div"> {
  return {
    div: [
      {
        strong: String(index + 1),
        $: [strong({ color: "neutral" })],
        style: {
          fontSize: (listener: Listener) => themeSize(listener, "increase-6"),
          // Redeclared alongside `fontSize` (not just left to the `strong()`
          // patch above) so the doctor's `missing-color` check — which only
          // inspects an element's own literal `style` object, not a merged
          // view of its patches — sees a themed `color` next to the other
          // themed prop it flagged.
          color: (listener: Listener) => themeColor(listener, "shift-11"),
        } as StyleObject,
      } as DomphyElement,
    ],
    style: { display: "flex", alignItems: "center", justifyContent: "center", height: "100%" } as StyleObject,
  };
}

/**
 * A two-column scroll section: long-form text scrolls on the left while a
 * pinned panel on the right cross-fades its background/content to match
 * whichever section is nearest the viewport's vertical center. Call with no
 * arguments for a working demo — 4 sections describing Domphy's own design.
 */
function stickyScrollReveal(props: StickyScrollRevealProps = {}): DomphyElement<"div"> {
  const instanceId = ++stickyScrollRevealInstanceCounter;
  const content = props.content && props.content.length > 0 ? props.content : DEFAULT_CONTENT;
  const panelWidthFraction = Math.min(0.7, Math.max(0.25, props.panelWidthFraction ?? 0.42));
  const activeIndex = toState(0, `sticky-scroll-reveal-active-${instanceId}`);

  const titleElements: (HTMLElement | null)[] = content.map(() => null);

  function textSection(item: StickyScrollContentItem, index: number): DomphyElement<"div"> {
    return {
      div: [
        {
          h3: item.title,
          $: [heading()],
          _onMount: (node: ElementNode) => {
            titleElements[index] = node.domElement as HTMLElement;
          },
          _onRemove: () => {
            titleElements[index] = null;
          },
          style: {
            transition: "color 300ms ease, opacity 300ms ease",
            opacity: (listener: Listener) => (activeIndex.get(listener) === index ? 1 : 0.4),
            color: (listener: Listener) => (activeIndex.get(listener) === index ? themeColor(listener, "shift-11") : themeColor(listener, "shift-6")),
          } as StyleObject,
        } as DomphyElement,
        { p: item.description, $: [paragraph()] } as DomphyElement,
      ],
      _key: `sticky-scroll-text-${instanceId}-${index}`,
      style: { minHeight: "60vh", display: "flex", flexDirection: "column", justifyContent: "center" } as StyleObject,
    };
  }

  function panelLayer(item: StickyScrollContentItem, index: number): DomphyElement<"div"> {
    const color = item.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
    const layerContent = item.node ? (Array.isArray(item.node) ? item.node : [item.node]) : [defaultPanelNode(index)];
    return {
      div: layerContent,
      _key: `sticky-scroll-panel-${instanceId}-${index}`,
      dataTone: "shift-15",
      style: {
        position: "absolute",
        inset: 0,
        borderRadius: themeSpacing(5),
        padding: themeSpacing(6),
        transition: "opacity 400ms ease, background-color 400ms ease",
        opacity: (listener: Listener) => (activeIndex.get(listener) === index ? 1 : 0),
        pointerEvents: (listener: Listener) => (activeIndex.get(listener) === index ? "auto" : "none"),
        backgroundColor: (listener: Listener) => themeColor(listener, "inherit", color),
        color: (listener: Listener) => themeColor(listener, "shift-9", color),
      } as StyleObject,
    };
  }

  return {
    div: [
      {
        div: content.map((item, index) => textSection(item, index)),
        style: { flex: `1 1 ${(1 - panelWidthFraction) * 100}%`, minWidth: 0 } as StyleObject,
      } as DomphyElement<"div">,
      {
        div: [
          {
            div: content.map((item, index) => panelLayer(item, index)),
            style: { position: "relative", height: themeSpacing(120) } as StyleObject,
          } as DomphyElement<"div">,
        ],
        style: {
          flex: `0 0 ${panelWidthFraction * 100}%`,
          position: "sticky",
          insetBlockStart: themeSpacing(8),
          alignSelf: "flex-start",
          ...(props.panelStyle ?? {}),
        } as StyleObject,
      } as DomphyElement<"div">,
    ],
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") return;

      let animationFrameHandle: number | null = null;

      function computeActiveIndex(): number {
        const viewportCenter = window.innerHeight / 2;
        let bestIndex = 0;
        let bestDistance = Number.POSITIVE_INFINITY;
        titleElements.forEach((element, index) => {
          if (!element) return;
          const rect = element.getBoundingClientRect();
          const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
          }
        });
        return bestIndex;
      }

      function scheduleUpdate(): void {
        if (animationFrameHandle !== null) return;
        animationFrameHandle = window.requestAnimationFrame(() => {
          animationFrameHandle = null;
          const nextIndex = computeActiveIndex();
          if (nextIndex !== activeIndex.get()) activeIndex.set(nextIndex);
        });
      }

      scheduleUpdate();
      window.addEventListener("scroll", scheduleUpdate, { passive: true });
      window.addEventListener("resize", scheduleUpdate);

      node.addHook("Remove", () => {
        window.removeEventListener("scroll", scheduleUpdate);
        window.removeEventListener("resize", scheduleUpdate);
        if (animationFrameHandle !== null) window.cancelAnimationFrame(animationFrameHandle);
      });
    },
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: themeSpacing(10),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { stickyScrollReveal };
