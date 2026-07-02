// Aceternity UI "Evervault Card" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied).
// A hover-reactive card whose background is a dense field of random
// characters that visually "decrypts" into a colorful reveal wherever the
// cursor hovers, with a persistent title layered on top.
//
// The character grid is a single static-looking layer (muted, low-contrast
// text) that a periodic `setInterval` re-randomizes a small random subset
// of every tick — the same imperative-DOM-write "swap `textContent` on
// captured refs" idiom `hyperText.ts` uses for its scramble loop, just
// running forever instead of resolving.
//
// The "decrypt spotlight" itself needs no second character layer or JS
// per-frame work: a blurred, colorful radial-gradient blob is layered
// *above* the character grid with `mix-blend-mode: color`, so wherever it
// overlaps the muted text it recolors those glyphs in place. The blob's
// position is written straight to CSS custom properties on `mousemove`
// (same 1:1, no-easing tracking `magicCard.ts` uses) and both the grid and
// the blob live inside their own `isolation: isolate` group so the blend
// mode never bleeds onto the title layer stacked on top of it.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { heading } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSize, themeSpacing } from "@domphy/theme";

export interface EvervaultCardProps {
  /** Persistent title/label text, always legible above the character field. Defaults to `"Hover me"`. */
  title?: string;
  /** Character pool the noise grid is drawn from. Defaults to alphanumerics + a few symbols. */
  characters?: string;
  /** Grid column count. Defaults to `22`. */
  columns?: number;
  /** Grid row count. Defaults to `13`. */
  rows?: number;
  /** Spotlight diameter, in px. Defaults to `260`. */
  spotlightSize?: number;
  /** How often (ms) a random subset of characters re-rolls. Defaults to `140`. */
  shuffleIntervalMs?: number;
  /** Fraction (0-1) of cells re-rolled per shuffle tick. Defaults to `0.05`. */
  shuffleFraction?: number;
  /** Passthrough style merged onto the outer card. */
  style?: StyleObject;
}

const DEFAULT_CHARACTER_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";

function randomCharacter(pool: string): string {
  return pool.charAt(Math.floor(Math.random() * pool.length));
}

function cornerPlus(cornerStyle: StyleObject): DomphyElement<"span"> {
  return {
    span: "+",
    ariaHidden: "true",
    style: {
      position: "absolute",
      color: (listener: Listener) => themeColor(listener, "shift-6"),
      fontSize: (listener: Listener) => themeSize(listener, "decrease-1"),
      // No lineHeight override needed — this is a single absolutely-positioned
      // decorative glyph, not a text block, so the browser's default line box
      // doesn't affect legibility or layout here.
      userSelect: "none",
      ...cornerStyle,
    } as StyleObject,
  } as DomphyElement<"span">;
}

let evervaultCardInstanceCounter = 0;

/**
 * A hover-reactive card whose background is a dense field of random
 * characters that recolors into focus wherever the cursor hovers, with a
 * persistent title layered on top. Call with no arguments for a working
 * demo card.
 */
function evervaultCard(props: EvervaultCardProps = {}): DomphyElement<"div"> {
  const instanceId = ++evervaultCardInstanceCounter;
  const title = props.title ?? "Hover me";
  const characterPool = props.characters ?? DEFAULT_CHARACTER_POOL;
  const columns = Math.max(2, Math.round(props.columns ?? 22));
  const rows = Math.max(2, Math.round(props.rows ?? 13));
  const spotlightSize = props.spotlightSize ?? 260;
  const shuffleIntervalMs = props.shuffleIntervalMs ?? 140;
  const shuffleFraction = Math.min(1, Math.max(0, props.shuffleFraction ?? 0.05));

  const totalCells = columns * rows;
  const characterElementRefs: (HTMLElement | null)[] = new Array(totalCells).fill(null);

  const cells: DomphyElement<"span">[] = [];
  for (let index = 0; index < totalCells; index += 1) {
    cells.push({
      span: randomCharacter(characterPool),
      _key: `evervault-cell-${instanceId}-${index}`,
      _onMount: (node: ElementNode) => {
        characterElementRefs[index] = node.domElement as HTMLElement;
      },
      _onRemove: () => {
        characterElementRefs[index] = null;
      },
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
      } as StyleObject,
    } as DomphyElement<"span">);
  }

  let spotlightElement: HTMLElement | null = null;

  const characterGrid: DomphyElement<"div"> = {
    div: cells,
    ariaHidden: "true",
    // Monospace alignment is fundamental to this grid's uniform character
    // cells, and `@domphy/theme` has no font-family token (AGENTS.md:
    // "fontFamily -> remove entirely, theme owns the font stack") — there
    // is no theme-native way to request a fixed-width face, so this one
    // property pair (fontFamily/lineHeight) is a narrow, documented
    // exception, same as `asciiArt.ts`'s grid.
    _doctorDisable: "inline-typography",
    style: {
      position: "absolute",
      inset: 0,
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      alignContent: "center",
      justifyItems: "center",
      overflow: "hidden",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      lineHeight: "1.4",
      fontSize: (listener: Listener) => themeSize(listener, "decrease-1"),
      color: (listener: Listener) => themeColor(listener, "shift-6"),
    } as StyleObject,
  } as DomphyElement<"div">;

  const spotlightBlob: DomphyElement<"div"> = {
    div: null,
    ariaHidden: "true",
    // A decorative blend-mode blob with no text of its own — exempt from
    // the missing-color contract, matching this package's other purely
    // decorative canvas/glow elements (e.g. `particles.ts`).
    _doctorDisable: "missing-color",
    _onMount: (node: ElementNode) => {
      spotlightElement = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      spotlightElement = null;
    },
    style: {
      position: "absolute",
      top: "var(--evervault-y, 50%)",
      left: "var(--evervault-x, 50%)",
      width: `${spotlightSize}px`,
      height: `${spotlightSize}px`,
      transform: "translate(-50%, -50%)",
      borderRadius: "50%",
      opacity: 0,
      transition: "opacity 200ms ease",
      mixBlendMode: "color",
      pointerEvents: "none",
      background: (listener: Listener) =>
        `radial-gradient(circle, ${themeColor(listener, "shift-9", "primary")} 0%, ${themeColor(listener, "shift-9", "info")} 45%, ${themeColor(listener, "shift-9", "secondary")} 75%, transparent 100%)`,
      filter: `blur(${themeSpacing(4)})`,
    } as StyleObject,
  } as DomphyElement<"div">;

  const isolatedLayer: DomphyElement<"div"> = {
    div: [characterGrid, spotlightBlob],
    style: { position: "absolute", inset: 0, isolation: "isolate", overflow: "hidden" } as StyleObject,
  } as DomphyElement<"div">;

  const titleLayer: DomphyElement<"div"> = {
    div: [{ h3: title, $: [heading()] } as DomphyElement],
    style: {
      position: "relative",
      zIndex: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
    } as StyleObject,
  } as DomphyElement<"div">;

  return {
    div: [
      isolatedLayer,
      titleLayer,
      cornerPlus({ top: themeSpacing(2), left: themeSpacing(2) }),
      cornerPlus({ top: themeSpacing(2), right: themeSpacing(2) }),
      cornerPlus({ bottom: themeSpacing(2), left: themeSpacing(2) }),
      cornerPlus({ bottom: themeSpacing(2), right: themeSpacing(2) }),
    ],
    dataTone: "shift-16",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      minHeight: themeSpacing(56),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      outlineOffset: "-1px",
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const cardElement = node.domElement as HTMLElement | null;
      if (!cardElement) return;

      const handlePointerMove = (event: MouseEvent) => {
        const rect = cardElement.getBoundingClientRect();
        cardElement.style.setProperty("--evervault-x", `${event.clientX - rect.left}px`);
        cardElement.style.setProperty("--evervault-y", `${event.clientY - rect.top}px`);
        if (spotlightElement) spotlightElement.style.opacity = "1";
      };
      const handlePointerLeave = () => {
        if (spotlightElement) spotlightElement.style.opacity = "0";
      };
      cardElement.addEventListener("mousemove", handlePointerMove);
      cardElement.addEventListener("mouseleave", handlePointerLeave);

      const shuffleCount = Math.max(1, Math.round(totalCells * shuffleFraction));
      const shuffleIntervalId = setInterval(() => {
        for (let tick = 0; tick < shuffleCount; tick += 1) {
          const index = Math.floor(Math.random() * totalCells);
          const element = characterElementRefs[index];
          if (element) element.textContent = randomCharacter(characterPool);
        }
      }, shuffleIntervalMs);

      node.addHook("Remove", () => {
        cardElement.removeEventListener("mousemove", handlePointerMove);
        cardElement.removeEventListener("mouseleave", handlePointerLeave);
        clearInterval(shuffleIntervalId);
      });
    },
  } as DomphyElement<"div">;
}

export { evervaultCard };
