// magicui "Animated List" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// vertically stacked feed of notification-style cards that enter one after
// another on an interval timer, giving a live activity-feed feel. New cards
// zoom in (scale-from-zero + fade, anchored to their top edge) via the Web
// Animations API (`motion()`), existing cards smoothly shift position as new
// ones are inserted (`transitionGroup()`'s FLIP reflow), and a bottom gradient
// mask dissolves cards that scroll past the visible edge instead of clipping
// them abruptly. By default each source item is revealed once and the feed
// halts (matching upstream); loop/maxItems opt into a bounded recycling feed.

import type {
  BehaviorInstance,
  DomphyElement,
  ElementNode,
  Listener,
  State,
} from "@domphy/core";
import { behavior, toState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeDensity,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { motion, small, strong, transitionGroup } from "@domphy/ui";

export interface AnimatedListItem {
  /** Emoji or short glyph rendered inside the colored badge square. */
  icon: string;
  /** Badge/accent color for this notification type. */
  color: ThemeColor;
  title: string;
  time: string;
  description: string;
}

export interface AnimatedListProps {
  /** Source notifications cycled one at a time into the feed. Defaults to a sample activity stream. */
  items?: AnimatedListItem[];
  /** Milliseconds between each new item's insertion. Defaults to 1000. */
  intervalDelay?: number;
  /** Cap on mounted cards in the bounded recycling feed. Only applies while looping; setting it turns looping on. Defaults to 5. */
  maxItems?: number;
  /** Insertion edge: "top" pushes new items in above (list grows downward), "bottom" appends below (list grows upward). Defaults to "top". */
  direction?: "top" | "bottom";
  /** Recycle the source endlessly as a bounded live feed. When off (the default) each item is revealed once and the feed halts, matching upstream. Defaults to false, or true when `maxItems` is set. */
  loop?: boolean;
  /** Container max-height, in `themeSpacing` units. Defaults to 112 (~28em). */
  maxHeightUnits?: number;
}

const ANIMATED_LIST_BEHAVIOR_KEY = "magicui-animated-list";

interface AnimatedListEntry {
  item: AnimatedListItem;
  key: string;
}

interface AnimatedListBehaviorProps {
  visibleEntries: State<AnimatedListEntry[]>;
  items: AnimatedListItem[];
  intervalDelay: number;
  maxItems: number;
  direction: "top" | "bottom";
  loop: boolean;
}

interface AnimatedListBehavior
  extends BehaviorInstance<AnimatedListBehaviorProps> {
  visibleEntries: State<AnimatedListEntry[]>;
}

function attachAnimatedList(
  _node: ElementNode,
  initialProps: AnimatedListBehaviorProps,
): AnimatedListBehavior {
  const visibleEntries = initialProps.visibleEntries;
  let props = initialProps;
  let sourceIndex = 0;
  let insertCount = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const pushNext = () => {
    if (sourceIndex >= props.items.length) {
      if (!props.loop) return;
      sourceIndex = 0;
    }
    const nextItem = props.items[sourceIndex];
    sourceIndex += 1;
    insertCount += 1;
    const entry: AnimatedListEntry = {
      item: nextItem,
      key: `entry-${insertCount}`,
    };

    const current = visibleEntries.get();
    const next =
      props.direction === "top" ? [entry, ...current] : [...current, entry];
    // Only the bounded recycling feed (loop) trims. The default once-through
    // reveal keeps every card mounted — old ones just clip under overflow:hidden,
    // matching upstream. A small buffer beyond `maxItems` lets the oldest card
    // scroll under the fade mask before it's removed, instead of popping away.
    const bufferedMax = props.maxItems + 2;
    const trimmed =
      props.loop && next.length > bufferedMax
        ? props.direction === "top"
          ? next.slice(0, bufferedMax)
          : next.slice(next.length - bufferedMax)
        : next;
    visibleEntries.set(trimmed);
  };

  const startTimer = () => {
    if (timer !== null) clearInterval(timer);
    timer = setInterval(() => {
      pushNext();
      if (!props.loop && sourceIndex >= props.items.length && timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    }, props.intervalDelay);
  };

  pushNext();
  startTimer();

  return {
    visibleEntries,
    update(next) {
      const delayChanged = next.intervalDelay !== props.intervalDelay;
      props = { ...next, visibleEntries };
      if (delayChanged) startTimer();
    },
    destroy() {
      if (timer !== null) clearInterval(timer);
      timer = null;
    },
  };
}

function elementNodeOf(listener: Listener): ElementNode | null {
  const fromListener = (listener as { elementNode?: ElementNode }).elementNode;
  if (fromListener && typeof fromListener.getBehavior === "function") {
    return fromListener;
  }
  if (
    typeof (listener as unknown as ElementNode).getBehavior === "function"
  ) {
    return listener as unknown as ElementNode;
  }
  return null;
}

function entriesFromListener(
  listener: Listener,
  fallback: State<AnimatedListEntry[]>,
): State<AnimatedListEntry[]> {
  const instance = elementNodeOf(listener)?.getBehavior<AnimatedListBehavior>(
    ANIMATED_LIST_BEHAVIOR_KEY,
  );
  if (instance?.visibleEntries) return instance.visibleEntries;
  return fallback;
}

const DEFAULT_ITEMS: AnimatedListItem[] = [
  {
    icon: "💸",
    color: "info",
    title: "Payment received",
    time: "2m ago",
    description: "$249.00 from Aiden Cole",
  },
  {
    icon: "👤",
    color: "success",
    title: "New signup",
    time: "5m ago",
    description: "Priya Shah joined the workspace",
  },
  {
    icon: "💬",
    color: "secondary",
    title: "New comment",
    time: "9m ago",
    description: '"Looks great, ship it!" on Q3 report',
  },
  {
    icon: "⭐",
    color: "warning",
    title: "5-star review",
    time: "14m ago",
    description: "Marcus left feedback on your app",
  },
  {
    icon: "📦",
    color: "info",
    title: "Order shipped",
    time: "21m ago",
    description: "Order #4821 is on its way",
  },
];

/** Small colored square badge holding the notification's emoji/icon glyph. */
function iconBadge(item: AnimatedListItem): DomphyElement<"span"> {
  return {
    span: item.icon,
    ariaHidden: "true",
    dataTone: "shift-2",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: "0",
      width: themeSpacing(10),
      height: themeSpacing(10),
      borderRadius: themeSpacing(2.5),
      fontSize: (listener: Listener) => themeSize(listener, "increase-2"),
      backgroundColor: (listener: Listener) =>
        themeColor(listener, "inherit", item.color),
      color: (listener: Listener) =>
        themeColor(listener, "shift-11", item.color),
    },
  };
}

/** Title + timestamp row, and a muted description line below it. */
function textColumn(item: AnimatedListItem): DomphyElement<"div"> {
  return {
    div: [
      {
        div: [
          { strong: item.title, $: [strong()] },
          { small: item.time, $: [small()] },
        ],
        style: {
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: themeSpacing(3),
        },
      },
      { small: item.description, $: [small()] },
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(1),
      minWidth: "0",
      overflow: "hidden",
      flex: "1 1 auto",
    },
  };
}

/**
 * One notification card, wrapped in an outer keyed entry that carries the
 * mount (`motion()`) transition. The hover scale-up lives on the inner card
 * chrome instead, so it doesn't fight the outer element's WAAPI-driven enter
 * transform (Web Animations composite above CSS transitions on the same
 * property/element, which would otherwise suppress the hover effect once the
 * entrance animation settles).
 */
function notificationEntry(
  item: AnimatedListItem,
  renderKey: string,
): DomphyElement<"div"> {
  return {
    div: [
      {
        div: [iconBadge(item), textColumn(item)],
        dataTone: "shift-1",
        style: {
          display: "flex",
          alignItems: "center",
          width: "100%",
          gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
          padding: (listener: Listener) =>
            themeSpacing(themeDensity(listener) * 3),
          borderRadius: (listener: Listener) =>
            themeSpacing(themeDensity(listener) * 3),
          backgroundColor: (listener: Listener) =>
            themeColor(listener, "inherit"),
          color: (listener: Listener) => themeColor(listener, "shift-10"),
          boxShadow: (listener: Listener) =>
            `0 ${themeSpacing(2)} ${themeSpacing(8)} ${themeColor(listener, "shift-4")}`,
          backdropFilter: (_listener: Listener) => `blur(${themeSpacing(3)})`,
          cursor: "default",
          transition: "transform 150ms ease",
          "&:hover": { transform: "scale(1.02)" },
        },
      },
    ],
    _key: renderKey,
    // `mx-auto w-full max-w-[400px]`: a full-width-but-capped card, centered in
    // the column. `transformOrigin: "top"` mirrors upstream's `originY: 0` so
    // the zoom grows from the card's top edge, not its center.
    style: {
      width: "100%",
      maxWidth: themeSpacing(100),
      marginInline: "auto",
      transformOrigin: "top",
    },
    $: [
      motion({
        // Upstream: initial {scale:0,opacity:0} -> animate {scale:1,opacity:1}
        // (a pop from nothing, no vertical translation); exit {scale:0,opacity:0}
        // (collapse to nothing). The spring is approximated with a cubic-bezier
        // ease-out curve (Domphy's motion() has no mass/stiffness/damping).
        initial: { scale: 0, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0, opacity: 0 },
        transition: { duration: 420, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
      }),
    ],
  };
}

/** Decorative bottom (or top, for `direction: "bottom"`) fade-to-background mask. */
function edgeFadeMask(fadeAtBottom: boolean): DomphyElement<"div"> {
  return {
    div: null,
    ariaHidden: "true",
    style: {
      position: "absolute",
      insetInline: "0",
      top: fadeAtBottom ? undefined : "0",
      bottom: fadeAtBottom ? "0" : undefined,
      height: themeSpacing(28),
      pointerEvents: "none",
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      backgroundImage: (listener: Listener) =>
        `linear-gradient(${fadeAtBottom ? "to bottom" : "to top"}, transparent, ${themeColor(listener, "inherit")})`,
    },
  };
}

/**
 * Vertically stacked feed of notification-style cards that stream in one at
 * a time on an interval timer, each zooming in (scale-from-zero + fade) from
 * its top edge while older cards reflow to make room. Call with no arguments
 * for a working demo — a sample activity stream revealing one card per second.
 */
function animatedList(props: AnimatedListProps = {}): DomphyElement<"div"> {
  // Upstream's demo repeats its notification set to prolong the once-through
  // reveal; mirror that for the zero-arg demo so it runs a while before halting.
  const items =
    props.items ?? Array.from({ length: 10 }, () => DEFAULT_ITEMS).flat();
  const intervalDelay = props.intervalDelay ?? 1000;
  const maxItems = Math.max(1, props.maxItems ?? 5);
  const direction = props.direction ?? "top";
  // Default contract (upstream): reveal each item once, then stop — never loop,
  // never trim. Passing `loop` or `maxItems` opts into a bounded recycling feed.
  const loop = props.loop ?? props.maxItems !== undefined;
  const maxHeightUnits = props.maxHeightUnits ?? 112;

  const visibleEntries = toState<AnimatedListEntry[]>([]);

  return {
    div: [
      {
        div: (listener: Listener) =>
          entriesFromListener(listener, visibleEntries)
            .get(listener)
            .map((entry) => notificationEntry(entry.item, entry.key)),
        $: [transitionGroup({ duration: 350 })],
        style: {
          display: "flex",
          flexDirection: direction === "top" ? "column" : "column-reverse",
          alignItems: "center",
          gap: (listenerValue: Listener) =>
            themeSpacing(themeDensity(listenerValue) * 3),
          padding: (listenerValue: Listener) =>
            themeSpacing(themeDensity(listenerValue) * 3),
        },
      },
      edgeFadeMask(direction === "top"),
    ],
    style: {
      position: "relative",
      overflow: "hidden",
      width: "100%",
      maxHeight: themeSpacing(maxHeightUnits),
    },
    ...behavior<AnimatedListBehaviorProps>(
      ANIMATED_LIST_BEHAVIOR_KEY,
      attachAnimatedList,
      {
        visibleEntries,
        items,
        intervalDelay,
        maxItems,
        direction,
        loop,
      },
    ),
  };
}

export { animatedList };
