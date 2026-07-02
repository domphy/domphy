// Aceternity UI "Focus Cards" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A row of
// full-bleed photo cards where hovering one sharpens/scales it up while
// every sibling blurs and dims, spotlighting the hovered image.
//
// The "single hovered-index value" the spec's research note describes is
// tracked as a plain closure variable (not a Domphy `State`) and applied by
// writing `transform`/`filter` straight to each card's inline style — the
// same imperative-on-pointer-move tradeoff magicCard.ts/wobbleCard.ts make
// for continuous, purely visual pointer-driven effects. A plain CSS
// `transition` declared once in each card's static style does the actual
// animating. Only the group's own `mouseleave` clears the hovered index (not
// each card's `mouseleave`), so moving between adjacent cards re-targets the
// spotlight without a flicker back to "all sharp" in between — the same
// trick cardHoverEffect.ts uses for its sliding highlight.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { heading } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface FocusCardItem {
  title: string;
  /** Photo source. Defaults to a themed gradient placeholder when omitted. */
  imageSrc?: string;
}

export interface FocusCardsProps {
  cards?: FocusCardItem[];
  onSelect?: (index: number) => void;
  style?: StyleObject;
}

const PLACEHOLDER_COLORS: ThemeColor[] = ["primary", "secondary", "info", "success", "attention"];

const DEFAULT_CARDS: FocusCardItem[] = [
  { title: "Whitehaven Beach" },
  { title: "Fjords of Norway" },
  { title: "Sahara Dunes" },
  { title: "Kyoto in Autumn" },
];

function focusCardMedia(card: FocusCardItem, index: number): DomphyElement {
  if (card.imageSrc) {
    return {
      img: null,
      src: card.imageSrc,
      alt: card.title,
      style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" },
    } as DomphyElement<"img">;
  }
  const familyColor = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length];
  const element = {
    div: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      backgroundImage: (listener: Listener) =>
        `linear-gradient(160deg, ${themeColor(listener, "shift-8", familyColor)}, ${themeColor(listener, "shift-14", familyColor)})`,
    },
  };
  return element as DomphyElement<"div">;
}

/**
 * A row of full-bleed photo cards where hovering one sharpens/scales it up
 * while its siblings blur and dim. Call with no arguments for a working demo
 * — 4 generic themed placeholder tiles.
 */
function focusCards(props: FocusCardsProps = {}): DomphyElement<"div"> {
  const cards = props.cards && props.cards.length > 0 ? props.cards : DEFAULT_CARDS;
  const cardElements: (HTMLElement | null)[] = cards.map(() => null);

  const applyFocusState = (hoveredIndex: number | null) => {
    cards.forEach((_card, index) => {
      const element = cardElements[index];
      if (!element) return;
      const isHovered = hoveredIndex === index;
      const isDimmed = hoveredIndex !== null && !isHovered;
      element.style.transform = isHovered ? "scale(1.04)" : "scale(1)";
      element.style.filter = isDimmed ? "blur(4px) brightness(0.6)" : "blur(0) brightness(1)";
    });
  };

  const cardTrees: DomphyElement<"div">[] = cards.map((card, index) => ({
    div: [
      focusCardMedia(card, index),
      {
        div: [{ h3: card.title, $: [heading({ color: "neutral" })] }],
        ariaHidden: "true",
        _doctorDisable: "missing-color",
        style: {
          position: "absolute",
          insetBlockEnd: 0,
          insetInlineStart: 0,
          insetInlineEnd: 0,
          padding: themeSpacing(4),
          backgroundImage: (listener: Listener) =>
            `linear-gradient(to top, ${themeColor(listener, "inherit")} 10%, transparent 80%)`,
        },
      } as DomphyElement<"div">,
    ],
    _key: `${card.title}-${index}`,
    _onMount: (node: ElementNode) => {
      cardElements[index] = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      cardElements[index] = null;
    },
    onMouseEnter: () => applyFocusState(index),
    onClick: () => props.onSelect?.(index),
    role: "button",
    tabindex: 0,
    ariaLabel: card.title,
    dataTone: "shift-16",
    style: {
      position: "relative",
      flex: "1 1 16em",
      minWidth: themeSpacing(56),
      aspectRatio: "3 / 4",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      cursor: "pointer",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      transition: "transform 300ms cubic-bezier(0.22, 1, 0.36, 1), filter 300ms ease",
      transform: "scale(1)",
      filter: "blur(0) brightness(1)",
    } as StyleObject,
  }) as DomphyElement<"div">);

  return {
    div: cardTrees,
    onMouseLeave: () => applyFocusState(null),
    style: {
      display: "flex",
      flexWrap: "wrap",
      gap: themeSpacing(3),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { focusCards };
