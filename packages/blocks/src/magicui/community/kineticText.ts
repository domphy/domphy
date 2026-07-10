// Magic UI "Kinetic Text" — Domphy port of kinetic-text.tsx.
//
// Headline text rendered thin by default; hovering ripples a font-weight
// thickening wave through neighboring letters, simulating motion without
// any character ever actually moving.
//
// Each character is its own `<span>` (spaces preserved as ` ` so
// line-wrapping still behaves), and a `pointermove`-driven, rAF-throttled
// loop (same "capture DOM refs, throttle via rAF, write style imperatively"
// idiom as this package's own `dock.ts` icon-magnification effect) finds
// the letter nearest the pointer and writes each letter's `font-weight`
// directly on its own DOM node, mirroring upstream's CSS sibling chain
// (`hover:` / `has-[+span:hover]` / `[:hover+&]`): the hovered letter reaches
// 900, its ±1 neighbors 600, its ±2 neighbors 400, everything else the 300
// baseline. These are continuous, high-frequency imperative writes
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

import type {
  DomphyElement,
  ElementNode,
  Listener,
  StyleObject,
} from "@domphy/core";
import { themeColor, themeSize } from "@domphy/theme";

export type KineticTextTag =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "p"
  | "div"
  | "span";

export interface KineticTextProps {
  /** Text content. Defaults to a short demo phrase. */
  children?: string;
  /** Semantic wrapping tag/heading level. Defaults to `"h1"`. */
  tag?: KineticTextTag;
  /** Extra class name merged onto the wrapper's native `class` attribute. */
  className?: string;
  /** Passthrough style merged onto the wrapper. */
  style?: StyleObject;
}

const DEFAULT_TEXT = "Kinetic Type In Motion";
const BASE_WEIGHT = 300;
// Discrete weight ramp keyed by index-distance from the hovered letter,
// mirroring upstream's CSS sibling chain: hovered 900, ±1 600, ±2 400.
// Any distance past ±2 falls off the array and reverts to the 300 baseline.
const NEIGHBOR_WEIGHTS = [900, 600, 400];
// Upstream --hover-padding: calc(1em / 12) (~0.083em), applied to the hovered
// letter and both immediate ±1 neighbors.
const HOVER_PADDING = "calc(1em / 12)";
const STROKE_WIDTH_EM = 0.0208;

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
 * Headline text whose letters thicken in a weight wave centered on the
 * pointer as it hovers across them — no character ever moves. Static
 * (thin) on touch devices with no hover capability. Call with no arguments
 * for a working demo phrase.
 */
function kineticText(props: KineticTextProps = {}): DomphyElement {
  const text = props.children ?? DEFAULT_TEXT;
  const tag = props.tag ?? "h1";

  const characters = Array.from(text);
  const characterElementRefs: (HTMLElement | null)[] = new Array(
    characters.length,
  ).fill(null);

  const characterSpans: DomphyElement<"span">[] = characters.map(
    (character, index) => ({
      span: character === " " ? " " : character,
      _key: `character-${index}`,
      ariaHidden: "true",
      style: {
        // Function-form escape hatch (see file header) — the thin resting
        // weight is the entire premise of this component, not something a
        // typography patch can express.
        fontWeight: () => BASE_WEIGHT,
        // Match upstream's transition list exactly: font-weight, stroke-color,
        // and padding (each 0.4s). Stroke-width and shadow are intentionally
        // not transitioned upstream.
        transition:
          "font-weight 0.4s, -webkit-text-stroke-color 0.4s, padding 0.4s",
        willChange: "font-weight, -webkit-text-stroke-width, padding",
        WebkitTextStrokeColor: "transparent",
        WebkitTextStrokeWidth: `${STROKE_WIDTH_EM}em`,
      },
      _onMount: (node: ElementNode) => {
        characterElementRefs[index] = node.domElement as HTMLElement;
      },
      _onRemove: () => {
        characterElementRefs[index] = null;
      },
    }),
  );

  const srOnlyText: DomphyElement<"span"> = {
    span: text,
    _key: "sr-only-text",
    style: SR_ONLY_STYLE,
  };

  return {
    [tag]: [...characterSpans, srOnlyText],
    style: {
      // Upstream container is `flex flex-wrap` so every letter is a flex item
      // that can wrap mid-word; spaces (rendered as   above) hold their cell.
      display: "flex",
      flexWrap: "wrap",
      // Headline-scale text is the entire premise of this effect (a large
      // hover-thickening display phrase) — without an explicit size token
      // it inherits whatever tiny ambient font-size the caller's context
      // happens to have, which reads as plain unstyled body text.
      fontSize: (listener: Listener) => themeSize(listener, "increase-6"),
      // Declared explicitly (not just inherited) so it re-evaluates with the
      // tone context, satisfying the doctor's missing-color contract for the
      // reactive fontSize above.
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
    class: props.className,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const element = node.domElement as HTMLElement;

      const supportsHover =
        typeof window.matchMedia !== "function" ||
        window.matchMedia("(hover: hover)").matches;
      if (!supportsHover) return;

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
            characterElement.style.webkitTextStrokeColor = "";
            characterElement.style.webkitTextStrokeWidth = "";
            continue;
          }
          const distance = Math.abs(index - hoveredIndex);
          // Discrete weights (900 / 600 / 400) for the hovered letter and its
          // ±1, ±2 neighbors; past ±2 the lookup is undefined and reverts to
          // the 300 baseline.
          const weight = NEIGHBOR_WEIGHTS[distance];
          characterElement.style.fontWeight =
            weight === undefined ? "" : String(weight);
          // padding-inline nudges the hovered letter AND both immediate ±1
          // neighbors apart (upstream hover: / has-[+span:hover] / [:hover+&]).
          characterElement.style.paddingInline =
            distance <= 1 ? HOVER_PADDING : "";
          characterElement.style.webkitTextStrokeColor =
            distance === 0 ? "currentColor" : "";
          characterElement.style.webkitTextStrokeWidth =
            distance === 0 ? `${STROKE_WIDTH_EM * 2}em` : "";
        }
      };

      const scheduleUpdate = () => {
        if (animationFrame === null)
          animationFrame = window.requestAnimationFrame(applyWeights);
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
        if (animationFrame !== null)
          window.cancelAnimationFrame(animationFrame);
      });
    },
    // The host tag is caller-configurable (`props.tag`), so it can't be
    // narrowed to one arm of the DomphyElement tag union statically — same
    // caveat `hyperText.ts` documents for its own dynamic-tag return.
  } as unknown as DomphyElement;
}

export { kineticText };
