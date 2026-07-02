// Aceternity UI "Animated Testimonials" — clean-room reimplementation from
// the public behavior/visual spec only (no upstream source viewed or
// copied). A two-column testimonial section: a stack of overlapping author
// photos on one side, a crossfading quote/name/role block on the other.
//
// Both halves are always-mounted, absolutely-positioned stacks whose style
// is a pure reactive function of `distance = (index - activeIndex) mod
// total` — the same "compute an offset per depth" idiom `cardStack.ts`
// already establishes in this package, reused here for two independent
// stacks (photos + text) instead of one. No `motion()` enter/exit is
// needed since nothing is ever unmounted; a plain CSS `transition` on each
// stack member's `transform`/`opacity` does the crossfade. Per the spec's
// research note, the exact rotation degrees/z-index scheme aren't from
// upstream — this file alternates a small tilt sign by index parity for
// the "organic feel" the spec describes, a qualitative match rather than
// exact numbers.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { avatar, buttonGhost, heading, small, strong } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";

export interface AnimatedTestimonialItem {
  /** Testimonial quote body text. */
  quote: string;
  /** Author's name. */
  name: string;
  /** Author's role/designation. */
  designation: string;
  /** Optional author photo URL. Falls back to initials derived from `name`. */
  imageSrc?: string;
}

export interface AnimatedTestimonialsProps {
  /** Testimonial items. Defaults to 3 generic demo testimonials. */
  testimonials?: AnimatedTestimonialItem[];
  /** Auto-advances on an interval. Defaults to `false`. */
  autoplay?: boolean;
  /** Milliseconds between automatic advances, when `autoplay` is on. Defaults to `5000`. */
  intervalMs?: number;
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

const DEFAULT_TESTIMONIALS: AnimatedTestimonialItem[] = [
  {
    quote:
      "Switching to Domphy cut our animation code in half and our bundle size along with it — no framework tax, just the browser doing what it already does well.",
    name: "Elena Marsh",
    designation: "Staff Engineer, Northlane",
  },
  {
    quote:
      "The theme system is the first one I haven't had to fight. Every color, every spacing value, traces back to one token — dark mode was a non-event.",
    name: "Rafael Costa",
    designation: "Design Systems Lead, Fenwick",
  },
  {
    quote:
      "We onboarded three new engineers in a week. Plain objects and patches read like the DOM itself — there's nothing extra to learn.",
    name: "Priya Nair",
    designation: "Engineering Manager, Solace",
  },
];

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]!.charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : "";
  return (first + last).toUpperCase();
}

let animatedTestimonialsInstanceCounter = 0;

/**
 * A two-column testimonial section that crossfades a stack of author photos
 * with a subtle tilt while the quote/name/role text swaps in sync. Call
 * with no arguments for a working demo with 3 testimonials.
 */
function animatedTestimonials(props: AnimatedTestimonialsProps = {}): DomphyElement<"div"> {
  const instanceId = ++animatedTestimonialsInstanceCounter;
  const testimonials = props.testimonials && props.testimonials.length > 0 ? props.testimonials : DEFAULT_TESTIMONIALS;
  const totalCount = testimonials.length;
  const autoplay = props.autoplay ?? false;
  const intervalMs = Math.max(500, props.intervalMs ?? 5000);

  const activeIndexState = toState(0, `animated-testimonials-active-${instanceId}`);

  const goToIndex = (nextIndex: number) => {
    const wrapped = ((nextIndex % totalCount) + totalCount) % totalCount;
    activeIndexState.set(wrapped);
  };
  const goNext = () => goToIndex(activeIndexState.get() + 1);
  const goPrevious = () => goToIndex(activeIndexState.get() - 1);

  const distanceFor = (listener: Listener, index: number): number =>
    (index - activeIndexState.get(listener) + totalCount) % totalCount;

  const photoStackElements: DomphyElement<"div">[] = testimonials.map((testimonial, index) => {
    const tiltSign = index % 2 === 0 ? 1 : -1;

    const computeTransform = (listener: Listener): string => {
      const distance = distanceFor(listener, index);
      if (distance === 0) return "translateY(0) rotate(0deg) scale(1)";
      const clampedDistance = Math.min(distance, 3);
      return `translateY(${clampedDistance * 10}px) rotate(${tiltSign * clampedDistance * 5}deg) scale(${1 - clampedDistance * 0.06})`;
    };
    const computeOpacity = (listener: Listener): number => {
      const distance = distanceFor(listener, index);
      if (distance === 0) return 1;
      if (distance <= 2) return 0.55 - distance * 0.12;
      return 0;
    };
    const computeZIndex = (listener: Listener): number => totalCount - distanceFor(listener, index);

    const avatarInner: DomphyElement<"span"> = testimonial.imageSrc
      ? ({
          span: [{ img: null, src: testimonial.imageSrc, alt: testimonial.name } as DomphyElement<"img">],
          $: [avatar({ color: "primary" })],
          style: { width: "100%", height: "100%" },
        } as DomphyElement<"span">)
      : ({
          span: initialsFromName(testimonial.name),
          $: [avatar({ color: "primary" })],
          style: { width: "100%", height: "100%" },
        } as DomphyElement<"span">);

    return {
      div: [avatarInner],
      _key: `animated-testimonial-photo-${instanceId}-${index}`,
      ariaHidden: "true",
      style: {
        position: "absolute",
        inset: 0,
        borderRadius: themeSpacing(6),
        transition: "transform 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 400ms ease",
        transform: computeTransform,
        opacity: computeOpacity,
        zIndex: computeZIndex,
      } as StyleObject,
    } as DomphyElement<"div">;
  });

  const textStackElements: DomphyElement<"div">[] = testimonials.map((testimonial, index) => {
    const computeOpacity = (listener: Listener): number => (activeIndexState.get(listener) === index ? 1 : 0);
    const computeTransform = (listener: Listener): string =>
      activeIndexState.get(listener) === index ? "translateY(0)" : "translateY(-0.5em)";
    const computePointerEvents = (listener: Listener): string =>
      activeIndexState.get(listener) === index ? "auto" : "none";

    return {
      div: [
        { h3: testimonial.quote, $: [heading({ color: "neutral" })] } as DomphyElement,
        {
          div: [
            { strong: testimonial.name, $: [strong({ color: "neutral" })] } as DomphyElement,
            { small: testimonial.designation, $: [small({ color: "neutral" })] } as DomphyElement,
          ],
          style: { display: "flex", flexDirection: "column", gap: themeSpacing(1), marginTop: themeSpacing(3) } as StyleObject,
        } as DomphyElement<"div">,
      ],
      _key: `animated-testimonial-text-${instanceId}-${index}`,
      style: {
        position: "absolute",
        inset: 0,
        transition: "opacity 350ms ease, transform 350ms ease",
        opacity: computeOpacity,
        transform: computeTransform,
        pointerEvents: computePointerEvents,
      } as StyleObject,
    } as DomphyElement<"div">;
  });

  const photoColumn: DomphyElement<"div"> = {
    div: photoStackElements,
    style: {
      position: "relative",
      width: "100%",
      aspectRatio: "1 / 1",
    } as StyleObject,
  } as DomphyElement<"div">;

  const textColumn: DomphyElement<"div"> = {
    div: [
      { div: textStackElements, style: { position: "relative", minHeight: themeSpacing(48) } as StyleObject } as DomphyElement<"div">,
      {
        div: [
          {
            button: "‹",
            ariaLabel: "Previous testimonial",
            $: [buttonGhost({ color: "neutral" })],
            onClick: goPrevious,
            style: { borderRadius: "50%", width: themeSpacing(9), height: themeSpacing(9), padding: 0 },
          } as DomphyElement<"button">,
          {
            button: "›",
            ariaLabel: "Next testimonial",
            $: [buttonGhost({ color: "neutral" })],
            onClick: goNext,
            style: { borderRadius: "50%", width: themeSpacing(9), height: themeSpacing(9), padding: 0 },
          } as DomphyElement<"button">,
        ],
        style: { display: "flex", gap: themeSpacing(3), marginTop: themeSpacing(6) } as StyleObject,
      } as DomphyElement<"div">,
    ],
    style: { display: "flex", flexDirection: "column", justifyContent: "center" } as StyleObject,
  } as DomphyElement<"div">;

  return {
    div: [photoColumn, textColumn],
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: themeSpacing(12),
      alignItems: "center",
      width: "100%",
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined" || !autoplay) return;
      const containerElement = node.domElement as HTMLElement | null;
      if (!containerElement) return;

      let intervalId: ReturnType<typeof setInterval> | null = null;
      let intersectionObserver: IntersectionObserver | null = null;

      const startCycle = () => {
        if (intervalId !== null || totalCount <= 1) return;
        intervalId = setInterval(goNext, intervalMs);
      };
      const stopCycle = () => {
        if (intervalId === null) return;
        clearInterval(intervalId);
        intervalId = null;
      };

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

export { animatedTestimonials };
