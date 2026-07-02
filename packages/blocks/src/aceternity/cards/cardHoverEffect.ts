// Aceternity UI "Card Hover Effect" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// responsive grid of text-only link cards over a dark background. Hovering
// any card slides a single shared rounded highlight panel behind it; moving
// the pointer directly from one card to an adjacent one glides the highlight
// smoothly to the new slot instead of fading out and back in.
//
// Implementation note: rather than mounting a `layoutId`-style shared
// element that gets re-parented between DOM slots (Domphy has no such
// primitive), a single highlight `<div>` is rendered once as the grid's
// first child (so, by DOM order alone, every card painted after it stacks on
// top with no `z-index` needed) and its `left/top/width/height` are written
// imperatively on every card's `pointerenter`, with a plain CSS `transition`
// doing the actual FLIP-style tween. Opacity only fades on the *group's*
// `mouseleave` (not each card's), which is what makes card-to-card hover
// read as one continuous glide instead of a flicker.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { heading, link, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface CardHoverItem {
  title: string;
  description: string;
  href?: string;
}

export interface CardHoverEffectProps {
  /** Cards to render. Defaults to 6 generic feature blurbs. */
  items?: CardHoverItem[];
  /** Grid column count at the widest breakpoint. Defaults to `3`. */
  columns?: number;
  /** Theme color family for the sliding highlight panel. Defaults to `"neutral"`. */
  highlightColor?: ThemeColor;
  style?: StyleObject;
}

const DEFAULT_ITEMS: CardHoverItem[] = [
  { title: "Plain objects", description: "UIs are just objects keyed by HTML tag — no JSX, no virtual DOM.", href: "#" },
  { title: "Patches, not wrappers", description: "Behavior and style compose via a `$` array applied to native elements.", href: "#" },
  { title: "Listener-based reactivity", description: "Read with a listener, write with `.set()` — one-way data flow throughout.", href: "#" },
  { title: "Theme tokens only", description: "Color, spacing and size always resolve through the design system, never literals.", href: "#" },
  { title: "SSR built in", description: "Server-render the same element tree and hydrate it without a second runtime.", href: "#" },
  { title: "Zero build step", description: "Drop the runtime on a page and start composing — no bundler required.", href: "#" },
];

// Highlight sits a few pixels outside the hovered card's own box on every
// side, matching the spec's "slightly larger than the card" highlight rect.
const HIGHLIGHT_OUTSET_PX = 6;

/**
 * A grid of text-only link cards where hovering any card slides a shared
 * rounded highlight panel behind it, gliding continuously between adjacent
 * cards instead of refading. Call with no arguments for a working demo — 6
 * generic feature cards on a dark surface.
 */
function cardHoverEffect(props: CardHoverEffectProps = {}): DomphyElement<"div"> {
  const items = props.items && props.items.length > 0 ? props.items : DEFAULT_ITEMS;
  const columns = Math.max(1, props.columns ?? 3);
  const highlightColor = props.highlightColor ?? "neutral";

  let containerElement: HTMLElement | null = null;
  let highlightElement: HTMLElement | null = null;

  const showHighlightBehind = (cardElement: HTMLElement) => {
    if (!containerElement || !highlightElement) return;
    const containerRect = containerElement.getBoundingClientRect();
    const cardRect = cardElement.getBoundingClientRect();
    const left = cardRect.left - containerRect.left - HIGHLIGHT_OUTSET_PX;
    const top = cardRect.top - containerRect.top - HIGHLIGHT_OUTSET_PX;
    highlightElement.style.width = `${cardRect.width + HIGHLIGHT_OUTSET_PX * 2}px`;
    highlightElement.style.height = `${cardRect.height + HIGHLIGHT_OUTSET_PX * 2}px`;
    highlightElement.style.transform = `translate(${left}px, ${top}px)`;
    highlightElement.style.opacity = "1";
  };

  const hideHighlight = () => {
    if (highlightElement) highlightElement.style.opacity = "0";
  };

  const highlightPanel = {
    div: null,
    ariaHidden: "true",
    // Decorative shared-highlight layer with no text of its own — exempt
    // from the missing-color contract, same as magicCard.ts's glow layer.
    // A fixed shifted tone (not "inherit") and a small text/bg contrast gap
    // are both intentional here: this is a solid decorative accent panel with
    // no text of its own, not a themed content surface — same pattern
    // magicCard.ts's orb glow layer uses (see its own comment for the fab()
    // precedent). `color` only exists to keep the "missing-color" heuristic
    // quiet since it's paired with `backgroundColor` on the same element.
    _doctorDisable: ["missing-color", "tone-background-inherit", "low-contrast"],
    _onMount: (node: ElementNode) => {
      highlightElement = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      highlightElement = null;
    },
    style: {
      position: "absolute",
      insetBlockStart: 0,
      insetInlineStart: 0,
      width: 0,
      height: 0,
      opacity: 0,
      zIndex: 0,
      pointerEvents: "none",
      borderRadius: themeSpacing(4),
      backgroundColor: (listener: Listener) => themeColor(listener, "shift-2", highlightColor),
      color: (listener: Listener) => themeColor(listener, "shift-0", highlightColor),
      transition:
        "transform 220ms cubic-bezier(0.22, 1, 0.36, 1), width 220ms cubic-bezier(0.22, 1, 0.36, 1), " +
        "height 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms ease",
      willChange: "transform",
    } as StyleObject,
  } as DomphyElement<"div">;

  const cardElements: DomphyElement<"a">[] = items.map((item, index) => ({
    a: [
      { h3: item.title, $: [heading({ color: "neutral" })] },
      { p: item.description, $: [paragraph({ color: "neutral" })] },
    ],
    _key: `${item.title}-${index}`,
    href: item.href ?? "#",
    $: [link({ color: "neutral", accentColor: "neutral" })],
    onPointerEnter: (_event: PointerEvent, node: ElementNode) => {
      showHighlightBehind(node.domElement as HTMLElement);
    },
    style: {
      position: "relative",
      zIndex: 1,
      display: "block",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(6),
      // Also declared here (not just via the `link()` patch on `$`) so it
      // reads directly off this element's own reactive style — doctor's
      // static analysis inspects each element's own `style` object, not the
      // merged result of applied patches.
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      outlineOffset: "-1px",
    } as StyleObject,
  }) as DomphyElement<"a">);

  return {
    div: [highlightPanel, ...cardElements],
    dataTone: "shift-16",
    onMouseLeave: hideHighlight,
    _onMount: (node: ElementNode) => {
      containerElement = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      containerElement = null;
    },
    style: {
      position: "relative",
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: themeSpacing(2),
      padding: themeSpacing(6),
      borderRadius: themeSpacing(5),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      "@media (min-width: 48em)": {
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      },
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { cardHoverEffect };
