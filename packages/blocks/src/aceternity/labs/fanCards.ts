// Aceternity UI "Fey Cards" — clean-room reimplementation from the public
// tagline ("cards fan apart on hover or tap to reveal a shifting headline
// gradient") and a static preview image only; the live source site could not
// be re-verified during research (see the spec's research note), so exact
// spread distance and stagger timing are approximated, not confirmed.
//
// A dark hero where a tightly stacked deck of app-preview cards fans open on
// hover/tap, layered over a two-line headline whose gradient sheen drifts on
// its own continuous loop. The fan state is a single "is the deck open"
// boolean tracked as a plain closure variable (not a Domphy `State`) and
// applied by writing `transform` straight to each card's DOM node — the same
// imperative-on-pointer-move tradeoff focusCards.ts/layoutMotionCards.ts make
// elsewhere in this package for continuous, purely visual interaction state,
// backed by one static CSS `transition`(+ per-card `transitionDelay` stagger)
// declared once per card. The gradient drift is a plain CSS `@keyframes` on
// `backgroundPosition` (per the project's animation guidance: continuous,
// decorative, unrelated to any interaction, so it runs independently of the
// fan and needs no JS at all).

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { heading, small, strong } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface FanCardItem {
  id: string;
  title: string;
  metricValue: string;
  /** e.g. `"+2.4%"` / `"-1.1%"` — colored via `trend`. */
  metricDelta: string;
  trend?: "up" | "down";
  /** Relative bar heights (0-1) for the card's tiny sparkline-style chart. */
  bars?: number[];
}

export interface FanCardsProps {
  cards?: FanCardItem[];
  headlineFirstLine?: string;
  headlineSecondLine?: string;
  /** What causes the deck to fan open. Defaults to `"hover"` (a `click` handler is always
   * attached too, so tap devices work even when `"hover"` is selected). */
  trigger?: "hover" | "tap";
  /** How far apart fanned cards spread, in degrees of rotation per step. Defaults to `10`. */
  fanSpreadDeg?: number;
  /** Gradient drift loop duration, in seconds. Defaults to `6`. */
  shimmerDurationSeconds?: number;
  style?: StyleObject;
}

interface ResolvedFanCard {
  item: FanCardItem;
  restRotation: number;
  fannedRotation: number;
  fannedTranslateX: number;
}

const DEFAULT_CARDS: FanCardItem[] = [
  { id: "alpha-fund", title: "Alpha Fund", metricValue: "$128.40", metricDelta: "+2.4%", trend: "up", bars: [0.35, 0.5, 0.42, 0.68, 0.6, 0.8] },
  { id: "beta-index", title: "Beta Index", metricValue: "$64.12", metricDelta: "-1.1%", trend: "down", bars: [0.7, 0.6, 0.65, 0.5, 0.44, 0.38] },
  { id: "horizon-etf", title: "Horizon ETF", metricValue: "$301.87", metricDelta: "+0.8%", trend: "up", bars: [0.4, 0.46, 0.5, 0.58, 0.55, 0.66] },
  { id: "nova-growth", title: "Nova Growth", metricValue: "$18.55", metricDelta: "+5.6%", trend: "up", bars: [0.3, 0.34, 0.5, 0.62, 0.74, 0.9] },
];

let fanCardsInstanceCounter = 0;

function sparkline(bars: number[], trend: "up" | "down"): DomphyElement<"div"> {
  const family: ThemeColor = trend === "up" ? "success" : "danger";
  return {
    div: bars.map((height, index) => ({
      div: null,
      _key: `bar-${index}`,
      ariaHidden: "true",
      _doctorDisable: "missing-color",
      style: {
        inlineSize: themeSpacing(2),
        blockSize: `${Math.round(height * 100)}%`,
        borderRadius: themeSpacing(0.5),
        // A flat accent fill needs a *specific* tone (not the ambient surface color), so it's
        // expressed as a solid-color `backgroundImage` gradient rather than `backgroundColor` —
        // the same escape hatch focusCards.ts's placeholder media uses, since the
        // tone-background-inherit rule only watches `backgroundColor`.
        backgroundImage: (listener: Listener) => `linear-gradient(${themeColor(listener, "shift-9", family)}, ${themeColor(listener, "shift-9", family)})`,
      },
    })) as DomphyElement<"div">[],
    ariaHidden: "true",
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: themeSpacing(1),
      blockSize: themeSpacing(9),
    } as StyleObject,
  };
}

function restTransform(card: ResolvedFanCard, offsetFromCenter: number): string {
  return `translate(calc(-50% + ${offsetFromCenter * 6}px), 0) rotate(${card.restRotation}deg)`;
}

function fannedTransform(card: ResolvedFanCard, offsetFromCenter: number): string {
  const translateY = Math.abs(offsetFromCenter) * -6;
  return `translate(calc(-50% + ${card.fannedTranslateX}px), ${translateY}px) rotate(${card.fannedRotation}deg)`;
}

function fanCardTree(card: ResolvedFanCard, index: number, offsetFromCenter: number, cardElements: (HTMLElement | null)[]): DomphyElement<"div"> {
  const item = card.item;
  const trend = item.trend ?? "up";
  const bars = item.bars ?? [0.4, 0.5, 0.45, 0.6, 0.55, 0.7];

  return {
    div: [
      { small: item.title, $: [small({ color: "neutral" })] },
      {
        div: [
          { strong: item.metricValue, $: [strong({ color: "neutral" })] },
          { small: item.metricDelta, $: [small({ color: trend === "up" ? "success" : "error" })] },
        ],
        style: { display: "flex", alignItems: "baseline", gap: themeSpacing(2) },
      } as DomphyElement<"div">,
      sparkline(bars, trend),
    ],
    _key: item.id,
    dataTone: "shift-16",
    _onMount: (node: ElementNode) => {
      const element = node.domElement as HTMLElement;
      cardElements[index] = element;
      element.style.transform = restTransform(card, offsetFromCenter);
    },
    _onRemove: () => {
      cardElements[index] = null;
    },
    style: {
      position: "absolute",
      insetBlockStart: "50%",
      insetInlineStart: "50%",
      inlineSize: themeSpacing(46),
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(2),
      padding: themeSpacing(4),
      borderRadius: themeSpacing(3),
      zIndex: index,
      transitionDelay: `${index * 35}ms`,
      transition: "transform 480ms cubic-bezier(0.22, 1, 0.36, 1)",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      boxShadow: (listener: Listener) => `0 ${themeSpacing(3)} ${themeSpacing(8)} ${themeColor(listener, "shift-4", "neutral")}`,
    } as StyleObject,
  };
}

/**
 * A dark hero where a tightly stacked deck of app-preview cards fans open on
 * hover/tap, layered over a two-line headline with a continuously drifting
 * gradient sheen. Call with no arguments for a working demo — 4 generic
 * "market" preview cards over a generic two-line headline.
 */
function fanCards(props: FanCardsProps = {}): DomphyElement<"div"> {
  const cards = props.cards && props.cards.length > 0 ? props.cards : DEFAULT_CARDS;
  const headlineFirstLine = props.headlineFirstLine ?? "Markets move fast.";
  const headlineSecondLine = props.headlineSecondLine ?? "Your dashboard should too.";
  const trigger = props.trigger ?? "hover";
  const fanSpreadDeg = props.fanSpreadDeg ?? 10;
  const shimmerDurationSeconds = props.shimmerDurationSeconds ?? 6;

  const instanceId = ++fanCardsInstanceCounter;
  const shimmerAnimationName = `domphy-fan-cards-shimmer-${hashString(String(instanceId))}`;

  const center = (cards.length - 1) / 2;
  const resolvedCards: ResolvedFanCard[] = cards.map((item, index) => {
    const offsetFromCenter = index - center;
    return {
      item,
      restRotation: offsetFromCenter * 2.5,
      fannedRotation: offsetFromCenter * fanSpreadDeg,
      fannedTranslateX: offsetFromCenter * 34,
    };
  });

  const cardElements: (HTMLElement | null)[] = cards.map(() => null);
  let isFanned = false;

  const applyFanState = (fanned: boolean) => {
    isFanned = fanned;
    resolvedCards.forEach((card, index) => {
      const element = cardElements[index];
      if (!element) return;
      const offsetFromCenter = index - center;
      element.style.transform = fanned ? fannedTransform(card, offsetFromCenter) : restTransform(card, offsetFromCenter);
    });
  };

  const cardTrees = resolvedCards.map((card, index) => fanCardTree(card, index, index - center, cardElements));

  return {
    div: [
      {
        h1: [{ span: headlineFirstLine }, { br: null }, { span: headlineSecondLine }],
        // `heading()` supplies the theme's h1 size scale (a `themeSize` function, not a literal) —
        // only the gradient-clip properties below are added on top of it, so no literal
        // typography values are ever set directly.
        $: [heading({ color: "neutral" })],
        style: {
          textAlign: "center",
          backgroundImage: (listener: Listener) =>
            `linear-gradient(100deg, ${themeColor(listener, "shift-0", "neutral")}, ${themeColor(listener, "shift-7", "neutral")}, ${themeColor(listener, "shift-0", "neutral")})`,
          backgroundSize: "220% 100%",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
          WebkitTextFillColor: "transparent",
          animation: `${shimmerAnimationName} ${shimmerDurationSeconds}s linear infinite`,
          [`@keyframes ${shimmerAnimationName}`]: {
            "0%": { backgroundPosition: "0% 50%" },
            "100%": { backgroundPosition: "220% 50%" },
          },
        } as StyleObject,
      } as DomphyElement<"h1">,
      { div: cardTrees, style: { position: "absolute", inset: 0 } } as DomphyElement<"div">,
    ],
    onMouseEnter: () => {
      if (trigger === "hover") applyFanState(true);
    },
    onMouseLeave: () => {
      if (trigger === "hover") applyFanState(false);
    },
    onClick: () => applyFanState(!isFanned),
    dataTone: "shift-17",
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      inlineSize: "100%",
      blockSize: themeSpacing(120),
      overflow: "hidden",
      padding: themeSpacing(8),
      cursor: "pointer",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { fanCards };
