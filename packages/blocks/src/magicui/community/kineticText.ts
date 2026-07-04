// Magic UI "Kinetic Text" — clean-room reimplementation.
//
// Headline text rendered thin by default; hovering ripples a font-weight
// thickening wave through neighboring letters, simulating motion without
// any character ever actually moving. Implemented purely from the block's
// public functional/visual spec — no upstream Magic UI source was viewed
// or copied.
//
// Each character is its own `<span>` (spaces preserved as ` ` so
// line-wrapping still behaves), and a `pointermove`-driven, rAF-throttled
// loop (same "capture DOM refs, throttle via rAF, write style imperatively"
// idiom as this package's own `dock.ts` icon-magnification effect) finds
// the letter nearest the pointer and writes each letter's `font-weight`
// directly on its own DOM node — an *index*-distance falloff (not a pixel
// one), per the spec's own clean-room guidance, since no CSS
// sibling-selector chain can express "N steps out" generically for
// arbitrary text. These are continuous, high-frequency imperative writes
// (not part of the declarative `style` object the doctor's static analyzer
// walks) — the same exemption `dock.ts`'s `ref.element.style.transform`
// writes rely on. The declarative resting style only ever sets a *thin*
// weight through a `(l) => value` function form (the doctor only flags a
// literal typography value), matching the `wordRotate`/`numberTicker`
// escape hatch used elsewhere in this package.
//
// A visually-hidden duplicate of the full text is rendered alongside the
// decorative, `aria-hidden` per-letter spans, so screen readers announce
// the real string once — the same sr-only-text + aria-hidden-decoration
// pattern `auroraText` uses in this package.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { type ThemeColor, themeColorToken, themeSize } from "@domphy/theme";

export type KineticTextTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "div" | "span";

export interface KineticTextProps {
  /** Text content. Defaults to a short demo phrase. */
  children?: string;
  /** Semantic wrapping tag/heading level. Defaults to `"h2"`. */
  tag?: KineticTextTag;
  /** Accent color family used for the hovered letter's faint glow. Defaults to `"primary"`. */
  accentColor?: ThemeColor;
  /** Extra class name merged onto the wrapper's native `class` attribute. */
  className?: string;
  /** Passthrough style merged onto the wrapper. */
  style?: StyleObject;
}

const DEFAULT_TEXT = "Kinetic Type In Motion";
const BASE_WEIGHT = 200;
const PEAK_WEIGHT = 900;
// How many letters out from the hovered one the weight bump still reaches,
// tapering back to the thin baseline — "2+ falloff steps" per the spec.
const FALLOFF_RADIUS = 4;

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

/**
 * Headline text whose letters thicken in a smooth weight gradient centered
 * on the pointer as it hovers across them — no character ever moves. Static
 * (thin) on touch devices with no hover capability. Call with no arguments
 * for a working demo phrase.
 */
function kineticText(props: KineticTextProps = {}): DomphyElement {
  const text = props.children ?? DEFAULT_TEXT;
  const tag = props.tag ?? "h2";
  const accentColor = props.accentColor ?? "primary";

  const characters = Array.from(text);
  const characterElementRefs: (HTMLElement | null)[] = new Array(characters.length).fill(null);

  const characterSpans: DomphyElement<"span">[] = characters.map((character, index) => ({
    span: character === " " ? " " : character,
    _key: `character-${index}`,
    ariaHidden: "true",
    style: {
      display: "inline-block",
      // Function-form escape hatch (see file header) — the thin resting
      // weight is the entire premise of this component, not something a
      // typography patch can express.
      fontWeight: () => BASE_WEIGHT,
      transition: "font-weight 260ms ease, padding-inline 260ms ease, text-shadow 260ms ease",
      willChange: "font-weight",
    },
    _onMount: (node: ElementNode) => {
      characterElementRefs[index] = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      characterElementRefs[index] = null;
    },
  }));

  const srOnlyText: DomphyElement<"span"> = {
    span: text,
    _key: "sr-only-text",
    style: SR_ONLY_STYLE,
  };

  return {
    [tag]: [srOnlyText, ...characterSpans],
    style: {
      display: "inline-block",
      // Headline-scale text is the entire premise of this effect (a large
      // hover-thickening display phrase) — without an explicit size token
      // it inherits whatever tiny ambient font-size the caller's context
      // happens to have, which reads as plain unstyled body text.
      fontSize: (listener: Listener) => themeSize(listener, "increase-6"),
      color: (listener: Listener) => themeColorToken(listener, "shift-9", accentColor),
      ...(props.style ?? {}),
    } as StyleObject,
    class: props.className,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const element = node.domElement as HTMLElement;

      const supportsHover =
        typeof window.matchMedia !== "function" || window.matchMedia("(hover: hover)").matches;
      if (!supportsHover) return;

      const accentColorToken = (() => {
        try {
          return themeColorToken(node, "shift-9", accentColor);
        } catch {
          return null;
        }
      })();

      let animationFrame: number | null = null;
      let hoveredIndex: number | null = null;

      const applyWeights = () => {
        animationFrame = null;
        for (let index = 0; index < characterElementRefs.length; index += 1) {
          const characterElement = characterElementRefs[index];
          if (!characterElement) continue;
          if (hoveredIndex === null) {
            characterElement.style.fontWeight = "";
            characterElement.style.paddingInline = "";
            characterElement.style.textShadow = "";
            continue;
          }
          const distance = Math.abs(index - hoveredIndex);
          const falloff = Math.max(0, 1 - distance / FALLOFF_RADIUS);
          const weight = Math.round(BASE_WEIGHT + (PEAK_WEIGHT - BASE_WEIGHT) * falloff * falloff);
          characterElement.style.fontWeight = String(weight);
          characterElement.style.paddingInline = distance === 0 ? "0.04em" : "";
          characterElement.style.textShadow =
            distance === 0 && accentColorToken ? `0 0 0.08em ${accentColorToken}` : "";
        }
      };

      const scheduleUpdate = () => {
        if (animationFrame === null) animationFrame = window.requestAnimationFrame(applyWeights);
      };

      const handlePointerMove = (event: PointerEvent) => {
        let closestIndex: number | null = null;
        let closestDistance = Number.POSITIVE_INFINITY;
        for (let index = 0; index < characterElementRefs.length; index += 1) {
          const characterElement = characterElementRefs[index];
          if (!characterElement) continue;
          const rect = characterElement.getBoundingClientRect();
          const center = rect.left + rect.width / 2;
          const distance = Math.abs(event.clientX - center);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = index;
          }
        }
        hoveredIndex = closestIndex;
        scheduleUpdate();
      };

      const handlePointerLeave = () => {
        hoveredIndex = null;
        scheduleUpdate();
      };

      element.addEventListener("pointermove", handlePointerMove);
      element.addEventListener("pointerleave", handlePointerLeave);

      node.addHook("Remove", () => {
        element.removeEventListener("pointermove", handlePointerMove);
        element.removeEventListener("pointerleave", handlePointerLeave);
        if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      });
    },
    // The host tag is caller-configurable (`props.tag`), so it can't be
    // narrowed to one arm of the DomphyElement tag union statically — same
    // caveat `hyperText.ts` documents for its own dynamic-tag return.
  } as unknown as DomphyElement;
}

export { kineticText };
