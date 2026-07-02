// Aceternity UI "Expandable Card" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// row of compact media cards that morph, on click, into an enlarged centered
// panel over a dimmed backdrop.
//
// Built on the `dialog()` ui patch (native `<dialog>`, backdrop, Escape/
// outside-click close, focus trap, scroll lock — the same foundation
// heroVideoDialog.ts uses) rather than a hand-rolled fixed-position overlay,
// so the "outside-click detector" and "body scroll should be locked" bullets
// in the spec's research note come for free. The shared-element "morph" is
// then layered on top: the clicked collapsed card's `getBoundingClientRect()`
// is captured on click, and once the dialog patch has called `showModal()`
// (so the panel has its real, laid-out size), a Web Animations API tween
// plays from a transform that makes the panel exactly overlap the source
// card down to identity — a FLIP animation without a literal shared DOM
// node, since Domphy has no `layoutId`-style primitive to re-parent one.
// Closing reverses the same tween. In a real browser this reads as the small
// card growing into the big panel; under jsdom (all-zero layout rects) the
// scale/translate degrades gracefully to identity — see `computeMorphFrames`.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { dialog, heading, paragraph, small } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";

export interface ExpandableCardItem {
  id: string;
  title: string;
  subtitle: string;
  /** Thumbnail/artwork source. Defaults to a themed placeholder panel when omitted. */
  imageSrc?: string;
  description?: string;
  actionLabel?: string;
}

export interface ExpandableCardProps {
  items?: ExpandableCardItem[];
  onOpen?: (id: string) => void;
  onClose?: () => void;
  style?: StyleObject;
}

const DEFAULT_ITEMS: ExpandableCardItem[] = [
  {
    id: "midnight-transit",
    title: "Midnight Transit",
    subtitle: "Lower Bay Collective",
    description: "A slow-building instrumental set recorded live across three cities over one tour.",
    actionLabel: "Play",
  },
  {
    id: "paper-lanterns",
    title: "Paper Lanterns",
    subtitle: "Nadia Voss",
    description: "Six tracks written during a single rainy week, mixed almost entirely in one take.",
    actionLabel: "Play",
  },
  {
    id: "glass-orchard",
    title: "Glass Orchard",
    subtitle: "Ferro & Wren",
    description: "A collaborative EP blending analog synths with field recordings from an orchard at dawn.",
    actionLabel: "Play",
  },
];

function playGlyph(): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [{ polygon: null, points: "9,6 20,12 9,18" }],
        viewBox: "0 0 24 24",
        fill: "currentColor",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    ariaHidden: "true",
    style: { display: "inline-flex", width: themeSpacing(3.5), height: themeSpacing(3.5) },
  };
}

function closeGlyph(): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [
          { line: null, x1: "6", y1: "6", x2: "18", y2: "18" },
          { line: null, x1: "18", y1: "6", x2: "6", y2: "18" },
        ],
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    ariaHidden: "true",
    style: { display: "inline-flex", width: themeSpacing(4), height: themeSpacing(4) },
  };
}

/** Themed placeholder artwork panel, used whenever an item has no `imageSrc`. */
function placeholderArtwork(item: ExpandableCardItem): DomphyElement<"div"> {
  return {
    div: [{ small: item.title.slice(0, 2).toUpperCase(), $: [small({ color: "neutral" })] }],
    ariaHidden: "true",
    dataTone: "shift-3",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      aspectRatio: "1 / 1",
      borderRadius: themeSpacing(3),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    },
  } as DomphyElement<"div">;
}

function artwork(item: ExpandableCardItem): DomphyElement {
  if (!item.imageSrc) return placeholderArtwork(item);
  return {
    img: null,
    src: item.imageSrc,
    alt: item.title,
    style: {
      display: "block",
      width: "100%",
      aspectRatio: "1 / 1",
      objectFit: "cover",
      borderRadius: themeSpacing(3),
    },
  } as DomphyElement<"img">;
}

/** Distance (px) the morph's initial transform should collapse from — 0 when either
 * rect is degenerate (e.g. jsdom's all-zero layout), which safely falls back to identity. */
function computeMorphFrames(sourceRect: DOMRect, targetRect: DOMRect): { from: string; to: string } {
  const identity = "translate(0px, 0px) scale(1, 1)";
  if (sourceRect.width <= 0 || sourceRect.height <= 0 || targetRect.width <= 0 || targetRect.height <= 0) {
    return { from: identity, to: identity };
  }
  const scaleX = sourceRect.width / targetRect.width;
  const scaleY = sourceRect.height / targetRect.height;
  const sourceCenterX = sourceRect.left + sourceRect.width / 2;
  const sourceCenterY = sourceRect.top + sourceRect.height / 2;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const translateX = sourceCenterX - targetCenterX;
  const translateY = sourceCenterY - targetCenterY;
  return {
    from: `translate(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`,
    to: identity,
  };
}

/**
 * A row of compact media cards that morph into an enlarged centered panel on
 * click, over a dimmed, Escape/outside-click-closeable backdrop. Call with no
 * arguments for a working demo — 3 generic "album" cards.
 */
function expandableCard(props: ExpandableCardProps = {}): DomphyElement<"div"> {
  const items = props.items && props.items.length > 0 ? props.items : DEFAULT_ITEMS;

  const open = toState(false);
  const activeId = toState<string | null>(null);
  let sourcePanelRect: DOMRect | null = null;
  let panelElement: HTMLElement | null = null;

  const activeItem = (listener?: Listener): ExpandableCardItem =>
    items.find((item) => item.id === activeId.get(listener)) ?? items[0];

  const openFromCard = (id: string, cardElement: HTMLElement) => {
    sourcePanelRect = cardElement.getBoundingClientRect();
    activeId.set(id);
    open.set(true);
    props.onOpen?.(id);
  };

  const closePanel = () => {
    open.set(false);
    props.onClose?.();
  };

  const collapsedCards: DomphyElement<"button">[] = items.map((item) => ({
    button: [
      artwork(item),
      {
        div: [
          { small: item.title, $: [small({ color: "neutral" })] },
          { small: item.subtitle, $: [small({ color: "neutral" })] },
        ],
        style: { display: "flex", flexDirection: "column", gap: themeSpacing(0.5), textAlign: "start" },
      } as DomphyElement<"div">,
    ],
    _key: item.id,
    type: "button",
    ariaLabel: `Open ${item.title}`,
    onClick: (_event: MouseEvent, node: ElementNode) => openFromCard(item.id, node.domElement as HTMLElement),
    style: {
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(2),
      width: themeSpacing(36),
      padding: themeSpacing(3),
      border: "none",
      borderRadius: themeSpacing(3),
      cursor: "pointer",
      textAlign: "start",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      transition: "background-color 150ms ease",
      "&:hover": { backgroundColor: (listener: Listener) => themeColor(listener, "increase-1") },
    } as StyleObject,
  }) as DomphyElement<"button">);

  const closeButton: DomphyElement<"button"> = {
    button: [closeGlyph()],
    ariaLabel: "Close",
    type: "button",
    onClick: closePanel,
    dataTone: "shift-0",
    style: {
      position: "absolute",
      insetBlockStart: themeSpacing(3),
      insetInlineEnd: themeSpacing(3),
      width: themeSpacing(9),
      height: themeSpacing(9),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "50%",
      border: "none",
      cursor: "pointer",
      zIndex: 1,
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      boxShadow: (listener: Listener) => `0 ${themeSpacing(1)} ${themeSpacing(4)} ${themeColor(listener, "shift-4", "neutral")}`,
    },
  };

  // Every text node below reads `activeItem(listener)` (forwarding its own
  // listener) so the panel's content stays in sync if a caller re-opens a
  // different item while already open, without needing a fresh dialog mount.
  const expandedBody: DomphyElement<"div"> = {
    div: [
      {
        div: (listener: Listener) => [artwork(activeItem(listener))],
        style: { width: "100%" },
      } as DomphyElement<"div">,
      {
        div: [
          { h3: (listener: Listener) => activeItem(listener).title, $: [heading({ color: "neutral" })] } as DomphyElement,
          { p: (listener: Listener) => activeItem(listener).subtitle, $: [paragraph({ color: "neutral" })] } as DomphyElement,
          {
            p: (listener: Listener) => activeItem(listener).description ?? "",
            $: [paragraph({ color: "neutral" })],
          } as DomphyElement,
        ],
        style: { display: "flex", flexDirection: "column", gap: themeSpacing(2), padding: themeSpacing(6) },
      } as DomphyElement<"div">,
      {
        button: [playGlyph(), { span: (listener: Listener) => activeItem(listener).actionLabel ?? "Play" } as DomphyElement],
        type: "button",
        // Its own edge-anchor surface (rather than inheriting the panel's dark
        // `shift-17` context) so the button reads as a proper filled pill with
        // legible text, not a `shift-0`-on-`shift-17` near-invisible label.
        dataTone: "shift-0",
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: themeSpacing(2),
          alignSelf: "flex-start",
          marginInlineStart: themeSpacing(6),
          marginBlockEnd: themeSpacing(6),
          padding: `${themeSpacing(2)} ${themeSpacing(5)}`,
          border: "none",
          borderRadius: themeSpacing(8),
          cursor: "pointer",
          backgroundColor: (listener: Listener) => themeColor(listener, "inherit", "primary"),
          color: (listener: Listener) => themeColor(listener, "shift-9", "primary"),
        } as StyleObject,
      } as DomphyElement<"button">,
    ],
    style: { position: "relative", display: "flex", flexDirection: "column" },
  } as DomphyElement<"div">;

  const dialogElement: DomphyElement<"dialog"> = {
    dialog: [closeButton, expandedBody],
    $: [dialog({ open, color: "neutral" })],
    ariaLabel: "Expanded card",
    dataTone: "shift-17",
    _onMount: (node: ElementNode) => {
      panelElement = node.domElement as HTMLElement;
      const applyMorph = (isOpen: boolean) => {
        if (!panelElement || typeof panelElement.animate !== "function") return;
        if (isOpen && sourcePanelRect) {
          const targetRect = panelElement.getBoundingClientRect();
          const { from, to } = computeMorphFrames(sourcePanelRect, targetRect);
          panelElement.animate([{ transform: from }, { transform: to }], {
            duration: 320,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "forwards",
          });
        } else if (!isOpen && sourcePanelRect) {
          const currentRect = panelElement.getBoundingClientRect();
          const { from } = computeMorphFrames(sourcePanelRect, currentRect);
          panelElement.animate([{ transform: "translate(0px, 0px) scale(1, 1)" }, { transform: from }], {
            duration: 260,
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
            fill: "forwards",
          });
        }
      };
      // Registered after dialog()'s own `_onMount` listener (patch listeners
      // merge first, native element listeners chain after — see
      // packages/core/src/helpers.ts `addHook`), so `showModal()`/`close()`
      // have already run and the panel is laid out before we measure it.
      const release = open.addListener(applyMorph);
      node.addHook("Remove", () => release());
    },
    style: {
      position: "relative",
      padding: 0,
      border: "none",
      overflow: "hidden",
      borderRadius: themeSpacing(5),
      width: "min(90vw, 32em)",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    },
  };

  return {
    div: [
      { div: collapsedCards, style: { display: "flex", flexWrap: "wrap", gap: themeSpacing(3) } } as DomphyElement<"div">,
      dialogElement,
    ],
    style: { position: "relative", ...(props.style ?? {}) },
  };
}

export { expandableCard };
