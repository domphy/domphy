// magicui "Morphing Text" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A single
// centered line of display text that liquid-morphs from one phrase to the
// next on a fixed timer, using the classic SVG "goo" filter technique
// (heavy Gaussian blur re-thresholded by a contrast-boosting color matrix)
// so two overlapping soft-edged phrases visually fuse and separate like
// liquid instead of cross-dissolving. See Codrops' "Morphing Gooey Text
// Hover Effect" and similar tutorials for the general, framework-agnostic
// technique this is built from.
//
// Only the phrase layers' opacity is actually animated (via `motion()`'s
// enter/exit, driven by a reactive keyed list); the blur+matrix filter,
// applied once and left static on the shared container, is what turns a
// plain crossfade of two overlapping shapes into a gooey merge — and turns
// a single resting shape back into crisp, readable text once settled.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { heading, motion } from "@domphy/ui";

export interface MorphingTextProps {
  /** Phrases cycled through in order, looping back to the first. Defaults to a short demo sequence. */
  phrases?: string[];
  /** Milliseconds each phrase is shown before morphing to the next. Defaults to 2500. */
  interval?: number;
  /** Milliseconds the morph (opacity cross-animation) itself takes. Defaults to 600. */
  transitionDuration?: number;
  /** CSS easing for the morph. Defaults to "ease-in-out". */
  easing?: string;
  /** Passthrough style merged onto the outer container. */
  style?: StyleObject;
}

let morphingTextInstanceCounter = 0;

interface PhraseEntry {
  key: string;
  text: string;
}

/** Hidden SVG holding the shared "goo" filter definition — blur then re-threshold via a steep alpha contrast matrix. */
function gooFilterDefs(filterId: string): DomphyElement<"svg"> {
  return {
    svg: [
      {
        defs: [
          {
            filter: [
              {
                feGaussianBlur: null,
                in: "SourceGraphic",
                stdDeviation: "8",
                result: "blurred",
              },
              {
                feColorMatrix: null,
                in: "blurred",
                mode: "matrix",
                values: "1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9",
                result: "goo",
              },
            ],
            id: filterId,
          },
        ],
      },
    ],
    ariaHidden: "true",
    style: { position: "absolute", width: 0, height: 0, overflow: "hidden" },
  } as DomphyElement<"svg">;
}

function phraseLayer(
  entry: PhraseEntry,
  transitionDuration: number,
  easing: string,
): DomphyElement<"div"> {
  return {
    div: [
      {
        h2: entry.text,
        $: [heading()],
        style: { margin: 0, textAlign: "center" },
      },
    ],
    _key: entry.key,
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    $: [
      motion({
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: transitionDuration, easing },
      }),
    ],
  };
}

/**
 * A single line of display text that automatically, endlessly morphs
 * between phrases with a gooey blur-and-sharpen transition instead of an
 * instant change or plain crossfade. No interaction required. Call with no
 * arguments for a working demo cycling through a short phrase list.
 */
function morphingText(props: MorphingTextProps = {}): DomphyElement<"div"> {
  const phrases = props.phrases ?? ["Build", "Ship", "Scale", "Repeat"];
  const interval = props.interval ?? 2500;
  const transitionDuration = props.transitionDuration ?? 600;
  const easing = props.easing ?? "ease-in-out";

  const instanceId = ++morphingTextInstanceCounter;
  const filterId = `domphy-morphing-text-goo-${instanceId}`;

  const layers = toState<PhraseEntry[]>(
    phrases.length > 0 ? [{ key: "phrase-0", text: phrases[0] }] : [],
  );
  let phraseIndex = 0;
  let insertCount = 0;

  const advance = () => {
    if (phrases.length <= 1) return;
    phraseIndex = (phraseIndex + 1) % phrases.length;
    insertCount += 1;
    // Replacing the whole (single-item) array in one `set()` call lets the
    // reconciler run both halves of the crossfade at once: the new key
    // mounts immediately (`motion()`'s enter), while the old key's
    // `_onBeforeRemove` plays its exit and only unmounts once finished —
    // both layers are absolutely stacked, so they visibly overlap while the
    // shared goo filter fuses their soft edges together.
    layers.set([{ key: `phrase-${insertCount}`, text: phrases[phraseIndex] }]);
  };

  return {
    div: [
      gooFilterDefs(filterId),
      {
        div: (listener) =>
          layers
            .get(listener)
            .map((entry) => phraseLayer(entry, transitionDuration, easing)),
        style: {
          position: "relative",
          width: "100%",
          height: "100%",
          filter: `url(#${filterId})`,
        },
      },
    ],
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      minHeight: "1.5em",
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined" || phrases.length <= 1) return;
      const timer = setInterval(advance, interval);
      node.addHook("Remove", () => clearInterval(timer));
    },
  };
}

export { morphingText };
