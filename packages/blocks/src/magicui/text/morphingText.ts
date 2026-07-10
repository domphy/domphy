// magicui "Morphing Text" — direct port of the upstream React component
// (reference/magicui/apps/www/registry/magicui/morphing-text.tsx). A single
// centered line of large display text that liquid-morphs from one phrase to
// the next on a rAF-driven timeline using the SVG "goo" thresholding
// technique: two persistent, absolutely-stacked spans (the current phrase and
// the next one) each get a per-frame CSS `filter: blur()` that ramps from very
// blurry to sharp (and back), while a shared `#threshold` feColorMatrix on the
// container re-thresholds the composited alpha so the two overlapping blurred
// phrases fuse and separate like liquid instead of plainly cross-dissolving.
//
// Timeline (upstream, in seconds): each phrase spends `morphTime` (1.5s)
// actively morphing into the next, then `cooldownTime` (0.5s) fully resolved
// and at rest — so most of every cycle is spent mid-morph, not idle. The
// blur/opacity curves are upstream's verbatim: the incoming span's blur is
// `min(8/fraction - 8, 100)px` with opacity `pow(fraction, 0.4)`, and the
// outgoing span mirrors it against `1 - fraction`. Per-frame styles are
// written straight to each span's DOM node inside the requestAnimationFrame
// loop (same imperative idiom numberTicker/hyperText use in this package),
// not routed through reactive State.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { fixed } from "../../shared/typography.js";

export interface MorphingTextProps {
  /** Phrases cycled through in order, looping back to the first. Defaults to a short demo sequence. */
  phrases?: string[];
  /** Seconds each phrase spends actively morphing into the next. Upstream `morphTime`. Defaults to 1.5. */
  morphTime?: number;
  /** Seconds each phrase rests fully resolved before the next morph begins. Upstream `cooldownTime`. Defaults to 0.5. */
  cooldownTime?: number;
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

let morphingTextInstanceCounter = 0;

/**
 * Hidden SVG holding the shared `#threshold` filter — a single feColorMatrix
 * that steepens alpha contrast (upstream `0 0 0 255 -140`). No blur lives
 * inside the filter; the blur is the per-span CSS `filter: blur()` animated
 * each frame, and the container adds a static `blur(0.6px)` on top.
 */
function thresholdFilterDefs(filterId: string): DomphyElement<"svg"> {
  return {
    svg: [
      {
        defs: [
          {
            filter: [
              {
                feColorMatrix: null,
                in: "SourceGraphic",
                type: "matrix",
                values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 255 -140",
              },
            ],
            id: filterId,
          },
        ],
      },
    ],
    ariaHidden: "true",
    preserveAspectRatio: "xMidYMid slice",
    // Upstream `className="fixed h-0 w-0"`.
    style: { position: "fixed", width: 0, height: 0 },
  } as DomphyElement<"svg">;
}

/**
 * A single line of large display text that automatically, endlessly morphs
 * between phrases with a gooey blur-and-sharpen transition instead of an
 * instant change or plain crossfade. No interaction required. Call with no
 * arguments for a working demo cycling through a short phrase list.
 */
function morphingText(props: MorphingTextProps = {}): DomphyElement<"div"> {
  const phrases = props.phrases ?? ["Build", "Ship", "Scale", "Repeat"];
  const morphTime = props.morphTime ?? 1.5;
  const cooldownTime = props.cooldownTime ?? 0.5;

  const instanceId = ++morphingTextInstanceCounter;
  const filterId = `domphy-morphing-text-threshold-${instanceId}`;

  const count = phrases.length;
  const firstPhrase = count > 0 ? phrases[0] : "";
  const secondPhrase = count > 0 ? phrases[1 % count] : "";

  // Refs captured on mount; the rAF loop reads them each frame and no-ops
  // until both are set (upstream's `if (!current1 || !current2) return`).
  let currentSpanElement: HTMLElement | null = null;
  let nextSpanElement: HTMLElement | null = null;

  // Upstream span classes: `absolute inset-x-0 top-0 m-auto inline-block w-full`.
  const spanStyle: StyleObject = {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    margin: "auto",
    display: "inline-block",
    width: "100%",
  };

  const currentSpan: DomphyElement<"span"> = {
    span: firstPhrase,
    style: spanStyle,
    _onMount: (node: ElementNode) => {
      currentSpanElement = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      currentSpanElement = null;
    },
  };

  const nextSpan: DomphyElement<"span"> = {
    span: secondPhrase,
    // Hidden until the loop takes over, so pre-JS/no-JS shows only the first
    // phrase rather than both stacked phrases at once.
    style: { ...spanStyle, opacity: 0 },
    _onMount: (node: ElementNode) => {
      nextSpanElement = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      nextSpanElement = null;
    },
  };

  return {
    div: [currentSpan, nextSpan, thresholdFilterDefs(filterId)],
    // Upstream container: `relative mx-auto h-16 w-full max-w-3xl text-center
    // font-sans text-[40pt] leading-none font-bold
    // filter-[url(#threshold)_blur(0.6px)] md:h-24 lg:text-[6rem]`.
    style: {
      position: "relative",
      marginLeft: "auto",
      marginRight: "auto",
      height: "4rem",
      width: "100%",
      maxWidth: "48rem",
      textAlign: "center",
      fontFamily: fixed("ui-sans-serif, system-ui, sans-serif"),
      fontSize: fixed("40pt"),
      lineHeight: fixed("1"),
      fontWeight: fixed("700"),
      filter: `url(#${filterId}) blur(0.6px)`,
      "@media (min-width: 768px)": { height: "6rem" },
      "@media (min-width: 1024px)": { fontSize: fixed("6rem") },
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      // Nothing to morph with 0 or 1 phrase — both spans are already seeded,
      // so skip the perpetual rAF loop entirely.
      if (typeof window === "undefined" || count <= 1) return;

      let textIndex = 0;
      let morph = 0;
      let cooldown = 0;
      let lastTime = performance.now();
      let frameHandle = 0;

      const setStyles = (fraction: number) => {
        const current = currentSpanElement;
        const next = nextSpanElement;
        if (!current || !next) return;

        next.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
        next.style.opacity = `${fraction ** 0.4 * 100}%`;

        const invertedFraction = 1 - fraction;
        current.style.filter = `blur(${Math.min(8 / invertedFraction - 8, 100)}px)`;
        current.style.opacity = `${invertedFraction ** 0.4 * 100}%`;

        current.textContent = phrases[textIndex % count];
        next.textContent = phrases[(textIndex + 1) % count];
      };

      const doMorph = () => {
        morph -= cooldown;
        cooldown = 0;

        let fraction = morph / morphTime;
        if (fraction > 1) {
          cooldown = cooldownTime;
          fraction = 1;
        }

        setStyles(fraction);

        if (fraction === 1) textIndex += 1;
      };

      const doCooldown = () => {
        morph = 0;
        const current = currentSpanElement;
        const next = nextSpanElement;
        if (current && next) {
          next.style.filter = "none";
          next.style.opacity = "100%";
          current.style.filter = "none";
          current.style.opacity = "0%";
        }
      };

      const animate = () => {
        frameHandle = requestAnimationFrame(animate);

        const now = performance.now();
        const deltaSeconds = (now - lastTime) / 1000;
        lastTime = now;

        cooldown -= deltaSeconds;
        if (cooldown <= 0) doMorph();
        else doCooldown();
      };

      frameHandle = requestAnimationFrame(animate);
      node.addHook("Remove", () => cancelAnimationFrame(frameHandle));
    },
  };
}

export { morphingText };
