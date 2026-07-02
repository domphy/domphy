// magicui "Animated List" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// vertically stacked feed of notification-style cards that enter one after
// another on an interval timer, giving a live activity-feed feel. New cards
// fade/slide/scale in via the Web Animations API (`motion()`), existing cards
// smoothly shift position as new ones are inserted (`transitionGroup()`'s
// FLIP reflow), and a bottom gradient mask dissolves cards that scroll past
// the visible edge instead of clipping them abruptly.

import type { DomphyElement, Listener } from "@domphy/core";
import { toState } from "@domphy/core";
import { motion, small, strong, transitionGroup } from "@domphy/ui";
import { type ThemeColor, themeColor, themeDensity, themeSize, themeSpacing } from "@domphy/theme";

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
  /** Max items kept mounted before the oldest are recycled out. Defaults to 5. */
  maxItems?: number;
  /** Insertion edge: "top" pushes new items in above (list grows downward), "bottom" appends below (list grows upward). Defaults to "top". */
  direction?: "top" | "bottom";
  /** Wrap back to the start of `items` once exhausted. Defaults to true. */
  loop?: boolean;
  /** Container max-height, in `themeSpacing` units. Defaults to 112 (~28em). */
  maxHeightUnits?: number;
}

const DEFAULT_ITEMS: AnimatedListItem[] = [
  { icon: "💸", color: "info", title: "Payment received", time: "2m ago", description: "$249.00 from Aiden Cole" },
  { icon: "👤", color: "success", title: "New signup", time: "5m ago", description: "Priya Shah joined the workspace" },
  { icon: "💬", color: "secondary", title: "New comment", time: "9m ago", description: "\"Looks great, ship it!\" on Q3 report" },
  { icon: "⭐", color: "warning", title: "5-star review", time: "14m ago", description: "Marcus left feedback on your app" },
  { icon: "📦", color: "info", title: "Order shipped", time: "21m ago", description: "Order #4821 is on its way" },
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
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", item.color),
      color: (listener: Listener) => themeColor(listener, "shift-11", item.color),
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
        style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: themeSpacing(3) },
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
function notificationEntry(item: AnimatedListItem, renderKey: string): DomphyElement<"div"> {
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
          padding: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
          borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
          backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
          color: (listener: Listener) => themeColor(listener, "shift-10"),
          boxShadow: (listener: Listener) =>
            `0 ${themeSpacing(2)} ${themeSpacing(8)} ${themeColor(listener, "shift-4")}`,
          backdropFilter: (listener: Listener) => `blur(${themeSpacing(3)})`,
          cursor: "default",
          transition: "transform 150ms ease",
          "&:hover": { transform: "scale(1.02)" },
        },
      },
    ],
    _key: renderKey,
    style: { width: "100%" },
    $: [
      motion({
        initial: { opacity: 0, y: -16, scale: 0.92 },
        animate: { opacity: 1, y: 0, scale: 1 },
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
 * a time on an interval timer, each animating in with a fade/slide/scale
 * entrance while older cards reflow to make room. Call with no arguments for
 * a working demo — a sample activity stream cycling every second.
 */
function animatedList(props: AnimatedListProps = {}): DomphyElement<"div"> {
  const items = props.items ?? DEFAULT_ITEMS;
  const intervalDelay = props.intervalDelay ?? 1000;
  const maxItems = Math.max(1, props.maxItems ?? 5);
  const direction = props.direction ?? "top";
  const loop = props.loop ?? true;
  const maxHeightUnits = props.maxHeightUnits ?? 112;

  interface Entry {
    item: AnimatedListItem;
    key: string;
  }

  const visibleEntries = toState<Entry[]>([]);
  let sourceIndex = 0;
  let insertCount = 0;

  const pushNext = () => {
    if (sourceIndex >= items.length) {
      if (!loop) return;
      sourceIndex = 0;
    }
    const nextItem = items[sourceIndex];
    sourceIndex += 1;
    insertCount += 1;
    const entry: Entry = { item: nextItem, key: `entry-${insertCount}` };

    const current = visibleEntries.get();
    const next = direction === "top" ? [entry, ...current] : [...current, entry];
    // Keep a small buffer beyond `maxItems` so the oldest card visually
    // scrolls under the fade mask before being trimmed, instead of popping
    // abruptly the instant the limit is reached.
    const bufferedMax = maxItems + 2;
    const trimmed =
      next.length > bufferedMax
        ? direction === "top"
          ? next.slice(0, bufferedMax)
          : next.slice(next.length - bufferedMax)
        : next;
    visibleEntries.set(trimmed);
  };

  return {
    div: [
      {
        div: (listener: Listener) =>
          visibleEntries.get(listener).map((entry) => notificationEntry(entry.item, entry.key)),
        $: [transitionGroup({ duration: 350 })],
        style: {
          display: "flex",
          flexDirection: direction === "top" ? "column" : "column-reverse",
          gap: (listenerValue: Listener) => themeSpacing(themeDensity(listenerValue) * 3),
          padding: (listenerValue: Listener) => themeSpacing(themeDensity(listenerValue) * 3),
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
    _onMount: (node) => {
      pushNext();
      const timer = setInterval(pushNext, intervalDelay);
      node.addHook("Remove", () => clearInterval(timer));
    },
  };
}

export { animatedList };
