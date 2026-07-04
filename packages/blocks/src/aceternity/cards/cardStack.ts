// Aceternity UI "Card Stack" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// vertically stacked pile of testimonial-style cards where the front card
// periodically animates to the back, cycling through all items in a
// continuous loop.
//
// Every card is a fixed DOM node (no list reordering/`_key` churn) that
// simply owns a `State<number>` "depth" (0 = front) and a companion
// `State<MotionKeyframe>` fed straight into `@domphy/ui`'s `motion()`
// patch — depth -> `{ y, x, scale, opacity }` via `depthToKeyframe()`. A
// `setInterval` (paused while off-screen via `IntersectionObserver`, same
// idiom this package's other continuous loops use) advances every card's
// depth by one slot each tick, wrapping the front card back to the last
// slot — `motion()`'s Web Animations tween (a slight "back-ease" overshoot
// curve) handles the actual slide/shrink/settle, so this file only ever
// computes target keyframes, never runs its own animation loop. `z-index`
// is a separate, non-animated reactive style bound to the same depth
// state, so stacking order snaps the instant a card starts moving back —
// it reads as "tucking under the deck" rather than a visual glitch.

import type { DomphyElement, ElementNode, Listener, State, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { avatar, motion, paragraph, small, strong } from "@domphy/ui";
import type { MotionKeyframe } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface CardStackItem {
  /** Testimonial/quote body text. */
  quote: string;
  /** Person's name. */
  name: string;
  /** Person's role/designation. */
  role: string;
  /** Optional avatar image URL. Falls back to initials derived from `name`. */
  avatarSrc?: string;
}

export interface CardStackProps {
  /** Testimonial items, front-to-back initial order. Defaults to 4 demo testimonials. */
  items?: CardStackItem[];
  /** Vertical stagger offset per depth level, in px. Defaults to `14`. */
  offsetPx?: number;
  /** Scale-down factor applied per depth level (fraction subtracted from `1`). Defaults to `0.06`. */
  scaleStep?: number;
  /** Milliseconds between automatic cycles. Defaults to `4000`. */
  intervalMs?: number;
  /** Card surface color family. Defaults to `"neutral"`. */
  color?: ThemeColor;
  /** Passthrough style merged onto the outer stack container. */
  style?: StyleObject;
}

const DEFAULT_ITEMS: CardStackItem[] = [
  {
    quote:
      "This is hands-down the smoothest UI toolkit I've shipped with — the depth and motion feel expensive without any of the usual animation-library overhead.",
    name: "Maya Chen",
    role: "Product Designer, Northwind",
  },
  {
    quote:
      "We swapped three different animation libraries for one patch. Onboarding new engineers got a whole lot easier once the UI stopped fighting the framework.",
    name: "Daniel Osei",
    role: "Frontend Lead, Fenwick Labs",
  },
  {
    quote:
      "The stacked-card cycling effect alone sold our design team — it's the kind of detail that makes a landing page feel alive without being distracting.",
    name: "Priya Raman",
    role: "Growth Marketer, Solace",
  },
  {
    quote:
      "Every effect in this library composes cleanly with the rest of our design system instead of fighting it. That's rarer than it should be.",
    name: "Tomás Ibarra",
    role: "Engineering Manager, Vantpoint",
  },
];

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]!.charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : "";
  return (first + last).toUpperCase();
}

function depthToKeyframe(depth: number, offsetPx: number, scaleStep: number, totalCount: number): MotionKeyframe {
  const clampedDepth = Math.min(depth, Math.max(0, totalCount - 1));
  return {
    x: clampedDepth * offsetPx * 0.18,
    y: clampedDepth * offsetPx,
    scale: Math.max(0.7, 1 - clampedDepth * scaleStep),
    opacity: clampedDepth === 0 ? 1 : Math.max(0.35, 1 - clampedDepth * 0.14),
  };
}

interface StackCardRuntime {
  depthState: State<number>;
  motionState: State<MotionKeyframe>;
}

let cardStackInstanceCounter = 0;

/**
 * A vertically stacked pile of testimonial cards that continuously cycles
 * the front card to the back, looping through every item. Call with no
 * arguments for a working demo with 4 testimonials.
 */
function cardStack(props: CardStackProps = {}): DomphyElement<"div"> {
  const instanceId = ++cardStackInstanceCounter;
  const items = props.items && props.items.length > 0 ? props.items : DEFAULT_ITEMS;
  const totalCount = items.length;
  const offsetPx = props.offsetPx ?? 14;
  const scaleStep = props.scaleStep ?? 0.06;
  const intervalMs = Math.max(200, props.intervalMs ?? 4000);
  const color = props.color ?? "neutral";

  const runtimes: StackCardRuntime[] = items.map((_item, index) => {
    const depthState = toState(index, `card-stack-depth-${instanceId}-${index}`);
    const motionState = toState<MotionKeyframe>(
      depthToKeyframe(index, offsetPx, scaleStep, totalCount),
      `card-stack-motion-${instanceId}-${index}`,
    );
    return { depthState, motionState };
  });

  const cardElements: DomphyElement<"article">[] = items.map((item, index) => {
    const runtime = runtimes[index]!;
    const avatarElement: DomphyElement<"span"> = item.avatarSrc
      ? ({
          span: [{ img: null, src: item.avatarSrc, alt: "", ariaHidden: "true" } as DomphyElement<"img">],
          $: [avatar({ color })],
        } as DomphyElement<"span">)
      : ({ span: initialsFromName(item.name), $: [avatar({ color })] } as DomphyElement<"span">);

    return {
      // Each stacked testimonial is self-contained, independently
      // distributable content — the textbook `<article>` case. It also
      // matters for a11y here specifically: nested inside a plain `<div>`,
      // this card's own `<footer>` (the avatar/name/role attribution row)
      // computed as a page-level "contentinfo" landmark, and with 4 stacked
      // cards all having one, that's 4 duplicate unlabeled "contentinfo"
      // landmarks (`landmark-no-duplicate-contentinfo` + `landmark-unique`).
      // `<footer>` nested in sectioning content (`<article>`/`<section>`)
      // loses that implicit landmark role, same as native HTML/ARIA intends.
      article: [
        { p: item.quote, $: [paragraph({ color: "neutral" })] } as DomphyElement,
        {
          footer: [
            avatarElement,
            {
              div: [
                { strong: item.name, $: [strong({ color: "neutral" })] } as DomphyElement,
                { small: item.role, $: [small({ color: "neutral" })] } as DomphyElement,
              ],
              style: { display: "flex", flexDirection: "column", gap: themeSpacing(0.5) } as StyleObject,
            } as DomphyElement<"div">,
          ],
          style: { display: "flex", alignItems: "center", gap: themeSpacing(3) } as StyleObject,
        } as DomphyElement<"footer">,
      ],
      _key: `card-stack-item-${instanceId}-${index}`,
      $: [
        motion({
          animate: runtime.motionState,
          transition: { duration: 700, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
        }),
      ],
      style: {
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: themeSpacing(6),
        borderRadius: themeSpacing(4),
        transformOrigin: "top center",
        backgroundColor: (listener: Listener) => themeColor(listener, "inherit", color),
        color: (listener: Listener) => themeColor(listener, "shift-9", color),
        outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3", color)}`,
        outlineOffset: "-1px",
        boxShadow: (listener: Listener) =>
          `0 ${themeSpacing(3)} ${themeSpacing(8)} ${themeColor(listener, "shift-4", color)}`,
        zIndex: (listener: Listener) => totalCount - runtime.depthState.get(listener),
      } as StyleObject,
    } as DomphyElement<"article">;
  });

  return {
    div: cardElements,
    style: {
      position: "relative",
      width: "100%",
      maxWidth: themeSpacing(120),
      marginInline: "auto",
      height: `calc(${themeSpacing(72)} + ${(totalCount - 1) * offsetPx}px)`,
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const containerElement = node.domElement as HTMLElement | null;
      if (!containerElement) return;

      const advanceStack = () => {
        for (const runtime of runtimes) {
          const currentDepth = runtime.depthState.get();
          const nextDepth = currentDepth === 0 ? totalCount - 1 : currentDepth - 1;
          runtime.depthState.set(nextDepth);
          runtime.motionState.set(depthToKeyframe(nextDepth, offsetPx, scaleStep, totalCount));
        }
      };

      let intervalId: ReturnType<typeof setInterval> | null = null;
      const startCycle = () => {
        if (intervalId !== null || totalCount <= 1) return;
        intervalId = setInterval(advanceStack, intervalMs);
      };
      const stopCycle = () => {
        if (intervalId === null) return;
        clearInterval(intervalId);
        intervalId = null;
      };

      let intersectionObserver: IntersectionObserver | null = null;
      if (typeof IntersectionObserver === "function") {
        intersectionObserver = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) startCycle();
            else stopCycle();
          }
        });
        intersectionObserver.observe(containerElement);
      } else {
        startCycle();
      }

      node.addHook("Remove", () => {
        stopCycle();
        intersectionObserver?.disconnect();
      });
    },
  } as DomphyElement<"div">;
}

export { cardStack };
