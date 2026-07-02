// Aceternity UI "Interface Crafts Cards" — clean-room reimplementation from
// the public behavior/visual spec only (no upstream source viewed or
// copied). A loosely scattered grid of colorful poster cards that
// straighten and scale up into an enlarged, centered state on interaction.
//
// The spec's own research note flags the expand mechanics as inferred (the
// live demo's interaction never finished loading during research) — a
// "measure both rects and hand-roll a FLIP tween" implementation (the
// technique expandableCard.ts uses to morph a card into a dialog) was
// deliberately NOT used here, because that technique exists to bridge two
// otherwise-unrelated DOM subtrees (a card and a portal-ed dialog). Here the
// "before" and "after" states are the *same* element, and both are fully
// known in advance (`restLeftPercent`/`restTopPercent`/`restRotationDeg` vs.
// dead-center), so a single `applyActiveState` writes `left`/`top`/`transform`/
// `opacity`/`zIndex` straight to each card's DOM node — the same imperative-
// on-interaction tradeoff focusCards.ts/cardHoverEffect.ts make elsewhere in
// this package for continuous, purely visual pointer-driven state, backed by
// one static CSS `transition` declared once per card. `transform` alone
// carries scale + rotation + the final centering nudge, so all of it reads
// as one continuous move, matching the spec's "position, rotation and size
// animate together" framing. `activeIndex` stays the single source of truth
// (so a caller-controlled `State` — or `onActiveChange` — works too) via one
// listener subscription that re-runs the same `applyActiveState` sweep.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { toState, type ValueOrState } from "@domphy/core";
import { heading } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface LayoutMotionCardItem {
  id: string;
  title: string;
  /** Photo/thumbnail source. Defaults to a themed gradient placeholder when omitted. */
  imageSrc?: string;
  /** Flat accent family for the card surface. Defaults to a themed rotation of families. */
  colorFamily?: ThemeColor;
  /** Edge-anchor tone for the card surface (`shift-0`-`shift-3` for a light chip, `shift-14`-`shift-17`
   * for a dark one). Defaults to a themed rotation matching `colorFamily`. */
  surfaceTone?: `shift-${number}`;
  /** Resting position, as a percentage of the scene box. */
  restLeftPercent?: number;
  restTopPercent?: number;
  /** Resting rotation, in degrees. */
  restRotationDeg?: number;
}

export interface LayoutMotionCardsProps {
  items?: LayoutMotionCardItem[];
  /** Which card (if any) is expanded. Pass a `State<number|null>` for controlled external control
   * (hover/click still update it). Defaults to `null` (nothing expanded). */
  activeIndex?: ValueOrState<number | null>;
  /** What activates a card. Defaults to `"hover"`. */
  trigger?: "hover" | "click";
  /** Resting card width, in `themeSpacing` units. Defaults to `26` (portrait, `3 / 4` aspect ratio). */
  cardWidthUnits?: number;
  /** Expanded card scale, relative to its resting width. Defaults to `1.8`. */
  expandedScale?: number;
  onActiveChange?: (index: number | null) => void;
  style?: StyleObject;
}

interface ResolvedSurface {
  family: ThemeColor;
  tone: `shift-${number}`;
}

interface ResolvedCard {
  item: LayoutMotionCardItem;
  surface: ResolvedSurface;
  restLeft: number;
  restTop: number;
  restRotation: number;
}

const SURFACE_ROTATION: ResolvedSurface[] = [
  { family: "attention", tone: "shift-2" },
  { family: "neutral", tone: "shift-1" },
  { family: "info", tone: "shift-15" },
  { family: "secondary", tone: "shift-14" },
  { family: "neutral", tone: "shift-16" },
];

const DEFAULT_ITEMS: LayoutMotionCardItem[] = [
  { id: "working-knowledge", title: "Working Knowledge", restLeftPercent: 4, restTopPercent: 12, restRotationDeg: -8 },
  { id: "practical-demonstration", title: "Practical Demonstration", restLeftPercent: 22, restTopPercent: 4, restRotationDeg: 5 },
  { id: "collaborate-with-ai", title: "Collaborate with AI", restLeftPercent: 41, restTopPercent: 15, restRotationDeg: -3 },
  { id: "means-and-methods", title: "Means & Methods", restLeftPercent: 59, restTopPercent: 3, restRotationDeg: 8 },
  { id: "interface-kit", title: "Interface Kit", restLeftPercent: 76, restTopPercent: 13, restRotationDeg: -6 },
];

function cardMedia(item: LayoutMotionCardItem): DomphyElement<"div"> {
  if (item.imageSrc) {
    return {
      div: null,
      style: { position: "absolute", inset: 0, backgroundImage: `url(${item.imageSrc})`, backgroundSize: "cover", backgroundPosition: "center" },
    } as DomphyElement<"div">;
  }
  return {
    div: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      insetBlockStart: 0,
      insetInlineStart: 0,
      insetInlineEnd: 0,
      blockSize: "66%",
      backgroundImage: (listener: Listener) => `linear-gradient(150deg, transparent, ${themeColor(listener, "shift-6", "neutral")})`,
    },
  } as DomphyElement<"div">;
}

function restTransform(card: ResolvedCard, dimmed: boolean): string {
  const scale = dimmed ? 0.94 : 1;
  return `translate(0, 0) scale(${scale}) rotate(${card.restRotation}deg)`;
}

/**
 * A loosely scattered grid of colorful poster cards that straighten and
 * scale up into an enlarged, centered state on hover or click. Call with no
 * arguments for a working demo — 5 generic themed cards.
 */
function layoutMotionCards(props: LayoutMotionCardsProps = {}): DomphyElement<"div"> {
  const items = props.items && props.items.length > 0 ? props.items : DEFAULT_ITEMS;
  const trigger = props.trigger ?? "hover";
  const cardWidthUnits = props.cardWidthUnits ?? 26;
  const expandedScale = props.expandedScale ?? 1.8;

  const activeIndex = toState<number | null>(props.activeIndex ?? null);
  const cardElements: (HTMLElement | null)[] = items.map(() => null);

  const resolvedCards: ResolvedCard[] = items.map((item, index) => ({
    item,
    surface: { ...SURFACE_ROTATION[index % SURFACE_ROTATION.length], ...(item.colorFamily ? { family: item.colorFamily } : {}), ...(item.surfaceTone ? { tone: item.surfaceTone } : {}) },
    restLeft: item.restLeftPercent ?? 0,
    restTop: item.restTopPercent ?? 0,
    restRotation: item.restRotationDeg ?? 0,
  }));

  const applyActiveState = (active: number | null) => {
    resolvedCards.forEach((card, index) => {
      const element = cardElements[index];
      if (!element) return;
      const isActive = active === index;
      const isDimmed = active !== null && !isActive;
      element.style.left = isActive ? "50%" : `${card.restLeft}%`;
      element.style.top = isActive ? "50%" : `${card.restTop}%`;
      element.style.zIndex = isActive ? "30" : String(index + 1);
      element.style.opacity = isDimmed ? "0.6" : "1";
      element.style.transform = isActive ? `translate(-50%, -50%) scale(${expandedScale}) rotate(0deg)` : restTransform(card, isDimmed);
    });
  };

  const setActive = (index: number | null) => {
    activeIndex.set(index);
    // Applied synchronously too (not just via the `addListener` subscription below, which
    // flushes on a microtask) so hover/click feels immediate — re-applying the same value
    // a tick later via the listener is a harmless no-op, and keeps a caller-controlled
    // `State` (mutated directly, bypassing `setActive`) in sync as well.
    applyActiveState(index);
    props.onActiveChange?.(index);
  };

  const cardTrees: DomphyElement<"div">[] = resolvedCards.map((card, index) => ({
    div: [
      cardMedia(card.item),
      {
        div: [{ h3: card.item.title, $: [heading({ color: "neutral" })] }],
        ariaHidden: "true",
        _doctorDisable: "missing-color",
        style: {
          position: "absolute",
          insetBlockEnd: 0,
          insetInlineStart: 0,
          insetInlineEnd: 0,
          padding: themeSpacing(3),
        },
      } as DomphyElement<"div">,
    ],
    _key: card.item.id,
    role: "button",
    tabindex: 0,
    ariaLabel: card.item.title,
    onMouseEnter: () => {
      if (trigger === "hover") setActive(index);
    },
    onClick: () => {
      if (trigger !== "click") return;
      setActive(activeIndex.get() === index ? null : index);
    },
    dataTone: card.surface.tone,
    _onMount: (node: ElementNode) => {
      const element = node.domElement as HTMLElement;
      cardElements[index] = element;
      element.style.left = `${card.restLeft}%`;
      element.style.top = `${card.restTop}%`;
      element.style.zIndex = String(index + 1);
      element.style.transform = restTransform(card, false);
    },
    _onRemove: () => {
      cardElements[index] = null;
    },
    style: {
      position: "absolute",
      inlineSize: themeSpacing(cardWidthUnits),
      aspectRatio: "3 / 4",
      overflow: "hidden",
      cursor: "pointer",
      borderRadius: themeSpacing(4),
      opacity: 1,
      transition:
        "left 420ms cubic-bezier(0.22, 1, 0.36, 1), top 420ms cubic-bezier(0.22, 1, 0.36, 1), " +
        "transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", card.surface.family),
      color: (listener: Listener) => themeColor(listener, "shift-9", card.surface.family),
    } as StyleObject,
  })) as DomphyElement<"div">[];

  return {
    div: cardTrees,
    onMouseLeave: () => {
      if (trigger === "hover") setActive(null);
    },
    _onMount: (node: ElementNode) => {
      const release = activeIndex.addListener((active: number | null) => applyActiveState(active));
      node.addHook("Remove", () => release());
    },
    style: {
      position: "relative",
      width: "100%",
      minBlockSize: themeSpacing(90),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { layoutMotionCards };
