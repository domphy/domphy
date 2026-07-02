// Aceternity UI "Glowing Stars" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// dark card background made of a compact grid of tiny dot "stars" that idly
// flicker a random handful at a time and burst into a unified glow together
// while the pointer hovers the card.
//
// Each dot owns its own reactive boolean `State` ("active"), read by that
// dot's own `style.backgroundColor`/`boxShadow`/`transform` functions — no
// canvas, no imperative DOM writes per frame. Two independent triggers flip
// those states: (1) an idle `setInterval` that, every few seconds, picks a
// small random subset of dot indices and turns each on with a staggered
// `setTimeout` delay, then off again after a hold period (skipped while
// hovering, so a stray idle burst can't fight the hover state); (2) a
// `pointerenter`/`pointerleave` pair on the card's own DOM element that turns
// every dot on together (near-zero stagger) while hovered, and off again on
// leave. The visual fade itself is a plain CSS `transition` on each dot — no
// WAAPI needed since only a two-state (on/off) toggle is required, not
// intermediate keyframes.

import type { DomphyElement, ElementNode, Listener, State, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { button, heading, paragraph } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface GlowingStarsProps {
  /** Card content (title/description). Defaults to a small demo blurb. */
  children?: DomphyElement | DomphyElement[];
  /** Glyph for the corner icon button. Defaults to a diagonal arrow. */
  icon?: DomphyElement;
  /** Grid column count. Defaults to `18`. */
  columns?: number;
  /** Grid row count. Defaults to `6`. */
  rows?: number;
  /** Milliseconds between each idle ambient burst. Defaults to `3000`. */
  idleIntervalMs?: number;
  /** How many stars light up per idle burst. Defaults to `5`. */
  idleStarCount?: number;
  /** Per-star stagger within one idle burst, in ms. Defaults to `100`. */
  idleStaggerMs?: number;
  /** How long a lit star stays lit before fading back out, in ms (also the
   * CSS transition duration for the fade itself). Defaults to `2000`. */
  glowDurationMs?: number;
  /** Theme color family for the lit glow. Defaults to `"info"` (blue-tinted). */
  glowColor?: ThemeColor;
  /** Disables the hover-lights-everything trigger; the idle ambient burst
   * keeps running regardless. Defaults to `false`. */
  disableHover?: boolean;
  style?: StyleObject;
}

let glowingStarsInstanceCounter = 0;

/** Simple diagonal arrow glyph (no specific icon library's path data). */
function arrowGlyph(): DomphyElement {
  return {
    svg: [
      {
        path: null,
        d: "M7 17L17 7M17 7H9M17 7V15",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        strokeLinejoin: "round",
      },
    ],
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg",
    role: "img",
    ariaHidden: "true",
  } as DomphyElement;
}

/** Fisher-Yates partial shuffle — returns up to `count` distinct indices in `[0, total)`. */
function pickRandomIndices(total: number, count: number): number[] {
  const pool = Array.from({ length: total }, (_unused, index) => index);
  const picked = Math.min(Math.max(0, count), total);
  for (let index = pool.length - 1; index > pool.length - 1 - picked; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temp = pool[index];
    pool[index] = pool[swapIndex];
    pool[swapIndex] = temp;
  }
  return pool.slice(pool.length - picked);
}

function defaultGlowingStarsContent(): DomphyElement[] {
  return [
    { h3: "Glowing Stars", $: [heading()] } as DomphyElement,
    {
      p: "A quiet field of stars that flicker on their own — and light up together when you hover.",
      $: [paragraph({ color: "neutral" })],
    } as DomphyElement,
  ];
}

/**
 * A card background made of a compact grid of dot "stars" that idly flicker
 * a random handful every few seconds and burst into a unified glow together
 * on hover. Call with no arguments for a working demo — an 18×6 star grid
 * over a dark card with a title, description, and corner icon button.
 */
function glowingStars(props: GlowingStarsProps = {}): DomphyElement<"div"> {
  const instanceId = ++glowingStarsInstanceCounter;
  const columns = Math.max(1, Math.round(props.columns ?? 18));
  const rows = Math.max(1, Math.round(props.rows ?? 6));
  const idleIntervalMs = Math.max(200, props.idleIntervalMs ?? 3000);
  const idleStarCount = Math.max(0, Math.round(props.idleStarCount ?? 5));
  const idleStaggerMs = Math.max(0, props.idleStaggerMs ?? 100);
  const glowDurationMs = Math.max(100, props.glowDurationMs ?? 2000);
  const glowColor = props.glowColor ?? "info";
  const disableHover = props.disableHover ?? false;
  const icon = props.icon ?? arrowGlyph();

  const totalStars = columns * rows;
  const starActiveStates: State<boolean>[] = Array.from({ length: totalStars }, (_unused, index) =>
    toState(false, `glowing-star-${instanceId}-${index}`),
  );

  const starElements: DomphyElement[] = starActiveStates.map((activeState, index) => ({
    div: null,
    _key: `star-${instanceId}-${index}`,
    ariaHidden: "true",
    // Decorative dot with no text of its own — exempt from the missing-color
    // contract (mirrors meteors.ts's dot spans elsewhere in this package).
    // Also exempt from tone-background-inherit: a star's idle/lit color is
    // intentionally a fixed dim/bright pair, not a surface that should track
    // the ambient dataTone context (same reasoning as meteors.ts's dots).
    _doctorDisable: ["missing-color", "tone-background-inherit"],
    style: {
      width: themeSpacing(1.5),
      height: themeSpacing(1.5),
      borderRadius: (listener: Listener) => (activeState.get(listener) ? "999px" : "2px"),
      transform: (listener: Listener) => (activeState.get(listener) ? "scale(1.7)" : "scale(1)"),
      backgroundColor: (listener: Listener) =>
        activeState.get(listener)
          ? themeColor(listener, "shift-17", glowColor)
          : themeColor(listener, "shift-6"),
      boxShadow: (listener: Listener) =>
        activeState.get(listener)
          ? `0 0 ${themeSpacing(2.5)} ${themeColor(listener, "shift-11", glowColor)}`
          : "none",
      transition: `background-color ${glowDurationMs}ms ease, box-shadow ${glowDurationMs}ms ease, transform ${glowDurationMs}ms ease, border-radius ${glowDurationMs}ms ease`,
    } as StyleObject,
  } as DomphyElement));

  const starGrid: DomphyElement<"div"> = {
    div: starElements,
    ariaHidden: "true",
    style: {
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: themeSpacing(1),
      marginBottom: themeSpacing(6),
    } as StyleObject,
  };

  const contentChildren = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultGlowingStarsContent();

  const cornerButton: DomphyElement<"button"> = {
    button: [icon],
    type: "button",
    ariaLabel: "Open",
    $: [button({ color: "neutral" })],
    style: {
      position: "absolute",
      insetBlockEnd: themeSpacing(4),
      insetInlineEnd: themeSpacing(4),
      width: themeSpacing(9),
      height: themeSpacing(9),
      paddingBlock: 0,
      paddingInline: 0,
      borderRadius: "50%",
    } as StyleObject,
  } as DomphyElement<"button">;

  return {
    div: [
      starGrid,
      {
        div: contentChildren,
        style: { position: "relative", zIndex: 1, maxWidth: themeSpacing(72) },
      } as DomphyElement,
      cornerButton,
    ],
    dataTone: "shift-16",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(6),
      maxWidth: themeSpacing(110),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      let hovering = false;
      let idleTimer: ReturnType<typeof setInterval> | null = null;
      const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();

      const scheduleTimeout = (callback: () => void, delay: number) => {
        const handle = setTimeout(() => {
          pendingTimeouts.delete(handle);
          callback();
        }, delay);
        pendingTimeouts.add(handle);
        return handle;
      };

      function igniteTemporarily(indices: number[], staggerMs: number, holdMs: number) {
        indices.forEach((starIndex, order) => {
          scheduleTimeout(() => {
            starActiveStates[starIndex].set(true);
            scheduleTimeout(() => {
              // A hover that started mid-burst owns the star's state instead —
              // don't let a queued idle "off" fight the hover-lit state.
              if (!hovering) starActiveStates[starIndex].set(false);
            }, holdMs);
          }, order * staggerMs);
        });
      }

      function idleBurst() {
        if (hovering) return;
        igniteTemporarily(pickRandomIndices(totalStars, idleStarCount), idleStaggerMs, glowDurationMs * 0.6);
      }

      idleBurst();
      idleTimer = setInterval(idleBurst, idleIntervalMs);

      let handlePointerEnter: (() => void) | null = null;
      let handlePointerLeave: (() => void) | null = null;
      const hostElement = node.domElement as HTMLElement | null;

      if (!disableHover && hostElement) {
        handlePointerEnter = () => {
          hovering = true;
          for (const activeState of starActiveStates) activeState.set(true);
        };
        handlePointerLeave = () => {
          hovering = false;
          for (const activeState of starActiveStates) activeState.set(false);
        };
        hostElement.addEventListener("pointerenter", handlePointerEnter);
        hostElement.addEventListener("pointerleave", handlePointerLeave);
      }

      node.addHook("Remove", () => {
        if (idleTimer !== null) clearInterval(idleTimer);
        for (const handle of pendingTimeouts) clearTimeout(handle);
        pendingTimeouts.clear();
        if (handlePointerEnter) hostElement?.removeEventListener("pointerenter", handlePointerEnter);
        if (handlePointerLeave) hostElement?.removeEventListener("pointerleave", handlePointerLeave);
      });
    },
  };
}

export { glowingStars };
