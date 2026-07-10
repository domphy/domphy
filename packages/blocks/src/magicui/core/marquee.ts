// magicui "Marquee" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). An
// infinite, seamlessly looping horizontal/vertical strip of repeated content.
// The item set is duplicated `repeat` times so the strip always spans wider
// (or taller) than its viewport regardless of duration,
// and each group runs the same linear (no-easing) CSS keyframe loop that
// translates it by exactly one group-pitch (its own width/height + the
// inter-group gap); since consecutive groups are identical and offset by that
// same pitch, the reset point is seamless.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";
import { avatar, paragraph, small, strong } from "@domphy/ui";

export interface MarqueeReviewItem {
  name: string;
  username: string;
  body: string;
  initials: string;
  color?: ThemeColor;
}

export interface MarqueeProps {
  /** Repeating unit rendered inside the strip. Defaults to a set of demo review chips. */
  items?: DomphyElement[];
  /** Scroll axis. Defaults to "horizontal". */
  orientation?: "horizontal" | "vertical";
  /** Flips the scroll direction (right-to-left becomes left-to-right, etc.). Defaults to false. */
  reverse?: boolean;
  /** Freezes the animation on pointer-hover, resuming from the same position on pointer-leave. Defaults to false. */
  pauseOnHover?: boolean;
  /** Seconds per loop. Defaults to 40. */
  duration?: number;
  /** How many times the item set is duplicated inside the track. Defaults to 4, minimum 2. */
  repeat?: number;
  /** Gap between items, in `themeSpacing` units. Defaults to 4. */
  gap?: number;
  /** Opt-in gradient edge-fade scrims. Upstream's Marquee renders none — the fade in Magic UI's demo comes from the demo-page wrapper, not the component. Defaults to false. */
  fade?: boolean;
  /** Passthrough style merged onto the outer (overflow-hidden) container. */
  style?: StyleObject;
  /** Passthrough style merged onto the scrolling track. */
  trackStyle?: StyleObject;
}

const DEFAULT_REVIEWS: MarqueeReviewItem[] = [
  {
    name: "Ally Chen",
    username: "@allychen",
    initials: "AC",
    color: "primary",
    body: "This completely changed how our team ships. Setup took minutes.",
  },
  {
    name: "Marco Diaz",
    username: "@marcodiaz",
    initials: "MD",
    color: "secondary",
    body: "The best developer experience I've had in years. Highly recommend.",
  },
  {
    name: "Priya Nair",
    username: "@priyanair",
    initials: "PN",
    color: "success",
    body: "Rock solid and beautifully documented. Our whole stack relies on it now.",
  },
  {
    name: "Owen Baxter",
    username: "@owenb",
    initials: "OB",
    color: "info",
    body: "Support answered in minutes and the fix shipped the same day.",
  },
  {
    name: "Sana Yusuf",
    username: "@sanayusuf",
    initials: "SY",
    color: "attention",
    body: "Clean API, sensible defaults, and it just keeps getting better.",
  },
];

/** Small bordered "testimonial chip" — the default repeating unit. */
function reviewChip(item: MarqueeReviewItem): DomphyElement<"div"> {
  return {
    div: [
      {
        div: [
          {
            span: item.initials,
            $: [avatar({ color: item.color ?? "primary" })],
          },
          {
            div: [
              { strong: item.name, $: [strong({ color: "neutral" })] },
              { small: item.username, $: [small()] },
            ],
            style: {
              display: "flex",
              flexDirection: "column",
              gap: themeSpacing(0.5),
            },
          },
        ],
        style: { display: "flex", alignItems: "center", gap: themeSpacing(2) },
      },
      { p: item.body, $: [paragraph()] },
    ],
    dataTone: "shift-1",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(2),
      width: themeSpacing(72),
      flexShrink: 0,
      padding: themeSpacing(4),
      borderRadius: themeSpacing(3),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      outline: (listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      outlineOffset: "-1px",
    },
  };
}

/** Decorative edge-fade overlay — pure gradient, no text content. */
function fadeOverlay(
  orientation: "horizontal" | "vertical",
  edge: "start" | "end",
): DomphyElement<"div"> {
  const toDirection =
    orientation === "horizontal"
      ? edge === "start"
        ? "to right"
        : "to left"
      : edge === "start"
        ? "to bottom"
        : "to top";

  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors verticalDivider() in the
  // shadcn sidebar family).
  const element = {
    div: null,
    ariaHidden: "true",
    // Decorative gradient scrim with no text of its own — exempt from the
    // missing-color contract.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      pointerEvents: "none",
      zIndex: 1,
      insetBlockStart: orientation === "horizontal" ? 0 : undefined,
      insetBlockEnd: orientation === "horizontal" ? 0 : undefined,
      insetInlineStart:
        orientation === "vertical" ? 0 : edge === "start" ? 0 : undefined,
      insetInlineEnd:
        orientation === "vertical" ? 0 : edge === "end" ? 0 : undefined,
      width: orientation === "horizontal" ? themeSpacing(24) : "100%",
      height: orientation === "vertical" ? themeSpacing(24) : "100%",
      background: (listener: Listener) =>
        `linear-gradient(${toDirection}, ${themeColor(listener, "inherit")}, transparent)`,
    },
  };
  return element as DomphyElement<"div">;
}

/**
 * Infinite, seamlessly looping horizontal/vertical strip of repeated content
 * (e.g. logo or testimonial cards). Call with no arguments for a working demo
 * — a row of testimonial chips scrolling right-to-left.
 */
function marquee(props: MarqueeProps = {}): DomphyElement<"div"> {
  const orientation = props.orientation ?? "horizontal";
  const reverse = props.reverse ?? false;
  const pauseOnHover = props.pauseOnHover ?? false;
  const duration = props.duration ?? 40;
  const repeatCount = Math.max(2, Math.round(props.repeat ?? 4));
  const gapUnits = props.gap ?? 4;
  const fade = props.fade ?? false;
  const sourceItems =
    props.items ?? DEFAULT_REVIEWS.map((review) => reviewChip(review));

  const axis = orientation === "vertical" ? "Y" : "X";
  // One group-pitch = the group's own extent (100%) + one inter-group gap.
  // Translating each group by exactly this makes the loop truly seamless;
  // translating the whole track by -100%/repeat instead leaves a gap/repeat
  // discontinuity at the reset (the gap between groups never divides evenly).
  const keyframes = {
    from: { transform: `translate${axis}(0)` },
    to: {
      transform: `translate${axis}(calc(-100% - ${themeSpacing(gapUnits)}))`,
    },
  };
  const animationName = `marquee-track-${hashString(JSON.stringify(keyframes))}`;
  const animation = `${animationName} ${duration}s linear infinite ${reverse ? "reverse" : "normal"}`;

  const groupStyle: StyleObject = {
    display: "flex",
    flexDirection: orientation === "vertical" ? "column" : "row",
    flexShrink: 0,
    // Upstream group class is `flex shrink-0 justify-around gap-(--gap)`.
    justifyContent: "space-around",
    gap: themeSpacing(gapUnits),
    animation,
    [`@keyframes ${animationName}`]: keyframes,
    // The repeated groups are the scrolling elements upstream, so the
    // `trackStyle` passthrough is merged onto each of them.
    ...(props.trackStyle ?? {}),
  } as StyleObject;

  const groups: DomphyElement<"div">[] = Array.from(
    { length: repeatCount },
    (_unused, groupIndex) => ({
      div: sourceItems.map((item, itemIndex) => ({
        ...item,
        _key: `item-${groupIndex}-${itemIndex}`,
      })) as DomphyElement[],
      _key: `group-${groupIndex}`,
      // Duplicate groups after the first exist purely for the seamless loop —
      // screen readers should only announce the content once.
      ariaHidden: groupIndex === 0 ? undefined : "true",
      style: groupStyle,
    }),
  );

  // Upstream renders the repeated groups as DIRECT children of the single
  // outer `group` overflow-hidden container — there is no intermediate track
  // wrapper element.
  return {
    div: [
      ...groups,
      ...(fade
        ? [fadeOverlay(orientation, "start"), fadeOverlay(orientation, "end")]
        : []),
    ],
    style: {
      display: "flex",
      flexDirection: orientation === "vertical" ? "column" : "row",
      overflow: "hidden",
      gap: themeSpacing(gapUnits),
      padding: themeSpacing(2),
      width: orientation === "horizontal" ? "100%" : undefined,
      height: orientation === "vertical" ? themeSpacing(96) : undefined,
      // Only needed to anchor the opt-in, absolutely-positioned fade scrims.
      ...(fade ? { position: "relative" } : {}),
      ...(pauseOnHover
        ? { "&:hover > div": { animationPlayState: "paused" } }
        : {}),
      ...(props.style ?? {}),
    },
  };
}

export { marquee, reviewChip };
