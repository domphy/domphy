// Aceternity UI "Hero Highlight" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// full-bleed hero background made of a faint dot grid whose dots light up in
// a soft radius that follows the mouse, paired with a headline where marked
// phrases get an animated highlighter-marker bar swept in behind them.
//
// Two dot-grid layers, both pure CSS `background-image` tiling (a single
// `radial-gradient(circle at 1px 1px, color 1px, transparent 0)` repeated via
// `background-size`) rather than an SVG/canvas grid — no per-dot DOM nodes or
// draw loop are needed here since neither layer needs independent per-dot
// timing (unlike this package's own `dotPattern.ts`/`dottedGlowBackground.ts`).
// The second (overlay) layer is masked to a soft circle bound to two CSS
// custom properties (`--hero-highlight-x/-y`, percentages) that are written
// straight to the DOM on every `pointermove` — pure CSS reacting to those
// custom properties, no animation loop, no easing, 1:1 cursor tracking. This
// is the same "write custom properties imperatively on `mousemove`, read them
// back inside a `radial-gradient`" technique `evervaultCard.ts` uses for its
// own hover spotlight elsewhere in this package.
//
// The highlighter marker (`heroHighlightMark`) is a small colored bar behind
// the marked phrase, absolutely positioned in its own wrapper span and
// animated from `width: 0%` to `100%` once via `motion()` on mount — a
// one-shot sweep, never replayed (no hover listener is ever attached to it).
//
// FIDELITY NOTE (per the task's own researchNote): the exact dot color/
// opacity and the highlighter's accent color could not be pixel-verified
// from the docs-only source (client-rendered demo, only the props table and
// tags were retrievable) — implemented with a light neutral dot grid and a
// warm accent marker as a reasonable default, per the task's own guidance.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { heading, motion, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface HeroHighlightProps {
  /** Hero content rendered above the dot-grid/spotlight background. Defaults to a short demo headline. */
  children?: DomphyElement | DomphyElement[];
  /** Extra class name merged onto the outer section's native `class` attribute. */
  containerClassName?: string;
  /** Extra class name merged onto the inner content wrapper's native `class` attribute. */
  className?: string;
  /** Grid gap between dots, in px. Defaults to `22`. */
  dotSpacing?: number;
  /** Theme color family for the faint base dot grid. Defaults to `"neutral"`. */
  dotColor?: ThemeColor;
  /** Theme color family for the brighter spotlight-revealed dot grid. Defaults to `"primary"`. */
  spotlightColor?: ThemeColor;
  /** Spotlight circle radius, in px. Defaults to `220`. */
  spotlightRadius?: number;
  /** Passthrough style merged onto the outer section. */
  style?: StyleObject;
}

export interface HeroHighlightMarkProps {
  /** The word/phrase marked by the highlighter bar. Defaults to an empty string. */
  children?: string;
  /** Extra class name merged onto the marker wrapper's native `class` attribute. */
  className?: string;
  /** Theme color family for the marker bar. Defaults to `"warning"` (reads as a warm accent). */
  color?: ThemeColor;
  /** Milliseconds the left-to-right sweep takes to reach full width. Defaults to `1800`. */
  sweepDuration?: number;
  /** Passthrough style merged onto the marker wrapper. */
  style?: StyleObject;
}

const MOUSE_X_PROPERTY = "--hero-highlight-x";
const MOUSE_Y_PROPERTY = "--hero-highlight-y";

/**
 * The colored marker bar behind a highlighted word/phrase — sweeps in from
 * zero width to full width once, on mount, like a highlighter pen dragged
 * across the text. Meant to be nested inside a `heroHighlight()` headline
 * (or any other text).
 */
function heroHighlightMark(props: HeroHighlightMarkProps = {}): DomphyElement<"span"> {
  const text = props.children ?? "";
  const color = props.color ?? "warning";
  const sweepDurationMs = Math.max(200, props.sweepDuration ?? 1800);

  // `_doctorDisable` is a doctor-only annotation not present in core's
  // strict `PartialElement` type — build through an untyped literal, then
  // assert, so the excess-property check doesn't fire (mirrors
  // `dottedGlowBackground.ts`/`flickeringGrid.ts`).
  const barElement = {
    span: null,
    ariaHidden: "true",
    // Decorative marker bar with no text of its own — exempt from the
    // missing-color contract, matching this package's other purely
    // decorative glow/accent elements (e.g. `spotlightDual.ts`'s layers).
    // Also exempt from tone-background-inherit: the marker's fixed accent
    // color is intentional, not a surface (same reasoning `glowingStars.ts`/
    // `shootingStars.ts` document for their own decorative accents).
    _doctorDisable: ["missing-color", "tone-background-inherit"],
    style: {
      position: "absolute",
      insetInlineStart: themeSpacing(-1),
      bottom: "0.05em",
      width: "0%",
      height: "0.4em",
      borderRadius: themeSpacing(0.5),
      zIndex: 0,
      backgroundColor: (listener: Listener) => themeColor(listener, "shift-9", color),
    } as StyleObject,
    $: [motion({ initial: { width: "0%" }, animate: { width: "100%" }, transition: { duration: sweepDurationMs, easing: "ease-out" } })],
  } as DomphyElement<"span">;

  return {
    span: [barElement, { span: text, style: { position: "relative", zIndex: 1 } } as DomphyElement],
    class: props.className,
    style: { position: "relative", display: "inline-block", ...(props.style ?? {}) } as StyleObject,
  };
}

function defaultHeroHighlightContent(): DomphyElement[] {
  return [
    {
      h1: ["Design interfaces your users will ", heroHighlightMark({ children: "actually love" }), "."],
      $: [heading()],
    } as DomphyElement,
    {
      p: "Move your cursor around — the dot grid lights up wherever you point.",
      $: [paragraph()],
    } as DomphyElement,
  ];
}

/**
 * A full-bleed hero background: a faint dot grid whose dots light up in a
 * soft radius that follows the cursor 1:1, with headline content (typically
 * including one or more `heroHighlightMark()` phrases) layered on top. Call
 * with no arguments for a working demo.
 */
function heroHighlight(props: HeroHighlightProps = {}): DomphyElement<"section"> {
  const dotSpacing = Math.max(6, Math.round(props.dotSpacing ?? 22));
  const dotColor = props.dotColor ?? "neutral";
  const spotlightColor = props.spotlightColor ?? "primary";
  const spotlightRadius = Math.max(40, props.spotlightRadius ?? 220);

  const contentChildren: DomphyElement[] = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultHeroHighlightContent();

  let spotlightLayerElement: HTMLElement | null = null;

  const baseDotLayer = {
    div: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      backgroundImage: (listener: Listener) => `radial-gradient(circle at 1px 1px, ${themeColor(listener, "shift-4", dotColor)} 1px, transparent 0)`,
      backgroundSize: `${dotSpacing}px ${dotSpacing}px`,
    } as StyleObject,
  } as DomphyElement<"div">;

  const spotlightDotLayer = {
    div: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    _onMount: (node: ElementNode) => {
      spotlightLayerElement = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      spotlightLayerElement = null;
    },
    style: {
      position: "absolute",
      inset: 0,
      opacity: 0,
      transition: "opacity 200ms ease",
      backgroundImage: (listener: Listener) => `radial-gradient(circle at 1px 1px, ${themeColor(listener, "shift-9", spotlightColor)} 1px, transparent 0)`,
      backgroundSize: `${dotSpacing}px ${dotSpacing}px`,
      maskImage: `radial-gradient(circle ${spotlightRadius}px at var(${MOUSE_X_PROPERTY}, 50%) var(${MOUSE_Y_PROPERTY}, 50%), black, transparent 80%)`,
      WebkitMaskImage: `radial-gradient(circle ${spotlightRadius}px at var(${MOUSE_X_PROPERTY}, 50%) var(${MOUSE_Y_PROPERTY}, 50%), black, transparent 80%)`,
    } as StyleObject,
  } as DomphyElement<"div">;

  const contentWrapper: DomphyElement<"div"> = {
    div: contentChildren,
    class: props.className,
    style: {
      position: "relative",
      zIndex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: themeSpacing(4),
      maxWidth: "42em",
      marginInline: "auto",
    } as StyleObject,
  };

  return {
    section: [baseDotLayer, spotlightDotLayer, contentWrapper],
    class: props.containerClassName,
    style: {
      position: "relative",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(10),
      minHeight: themeSpacing(96),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const sectionElement = node.domElement as HTMLElement;
      sectionElement.style.setProperty(MOUSE_X_PROPERTY, "50%");
      sectionElement.style.setProperty(MOUSE_Y_PROPERTY, "50%");

      const handlePointerMove = (event: MouseEvent) => {
        const rect = sectionElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((event.clientY - rect.top) / rect.height) * 100;
        sectionElement.style.setProperty(MOUSE_X_PROPERTY, `${xPercent}%`);
        sectionElement.style.setProperty(MOUSE_Y_PROPERTY, `${yPercent}%`);
      };
      const handlePointerEnter = () => {
        if (spotlightLayerElement) spotlightLayerElement.style.opacity = "1";
      };
      const handlePointerLeave = () => {
        if (spotlightLayerElement) spotlightLayerElement.style.opacity = "0";
      };

      sectionElement.addEventListener("pointermove", handlePointerMove);
      sectionElement.addEventListener("pointerenter", handlePointerEnter);
      sectionElement.addEventListener("pointerleave", handlePointerLeave);

      node.addHook("Remove", () => {
        sectionElement.removeEventListener("pointermove", handlePointerMove);
        sectionElement.removeEventListener("pointerenter", handlePointerEnter);
        sectionElement.removeEventListener("pointerleave", handlePointerLeave);
      });
    },
  } as DomphyElement<"section">;
}

export { heroHighlight, heroHighlightMark };
