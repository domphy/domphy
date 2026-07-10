// magicui "Hyper Text" — direct port of magicui's hyper-text.tsx. Text whose
// characters flicker through random glyphs before resolving into their true
// letters, left to right, so the word appears to decode out of noise. By
// default the scramble auto-plays once on mount (after `delay` ms) and then
// replays on hover; an opt-in flag instead plays it once on scroll-into-view.
// Every character renders uppercase — upstream renders each letter via
// `letter.toUpperCase()`, so both the scramble glyphs and the final resolved
// text read uppercase, matching the terminal-decode look.
//
// Each character is its own `<span>` so it can be swapped independently;
// spaces render as fixed-width (upstream's `w-3` = 0.75rem) non-animated gaps.
// Resolution is driven by a single requestAnimationFrame loop that, each
// frame, computes `progress = elapsed / duration` and rewrites every
// character whose index is past `progress * characters.length` to a fresh
// random glyph — the exact rAF/progress model upstream uses (its
// `maxIterations = children.length` counts spaces, so the reveal is paced
// over the full string, not just the non-space characters). Refs to each
// character's DOM node are captured in the span's own `_onMount`/`_onRemove`
// and written to directly inside the loop rather than routed through reactive
// `State`, since this is a continuous high-frequency effect (same idiom
// numberTicker/dock use elsewhere in this package).

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { fixed } from "../../shared/typography.js";

export interface HyperTextProps {
  /** Text content to animate. Defaults to a short demo phrase. */
  children?: string;
  /** HTML tag the container renders as. Defaults to `"div"`. */
  tag?: string;
  /** Total milliseconds for the full scramble-to-resolve animation. Defaults to `800`. */
  duration?: number;
  /** Milliseconds to wait after the auto/view trigger fires before the scramble starts. Defaults to `0`. */
  delay?: number;
  /** Replays the scramble on every mouse hover. Defaults to `true`. */
  hoverTrigger?: boolean;
  /** Plays the scramble once on scroll-into-view instead of automatically on mount. Defaults to `false`. */
  viewTrigger?: boolean;
  /** Character pool randomly sampled while a character position is unresolved. Defaults to A-Z. */
  characters?: string;
  /** Passthrough style merged onto the container. */
  style?: StyleObject;
}

const DEFAULT_CHARACTER_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Text that scrambles through random characters before resolving,
 * left-to-right, into its real content — a terminal-decrypt effect. Auto-plays
 * once on mount and replays on hover by default; can instead play once on
 * scroll-into-view. Call with no arguments for a working demo.
 */
function hyperText(props: HyperTextProps = {}): DomphyElement {
  const text = props.children ?? "Hover to Decode";
  const tag = props.tag ?? "div";
  const duration = props.duration ?? 800;
  const delay = props.delay ?? 0;
  const hoverTrigger = props.hoverTrigger ?? true;
  const viewTrigger = props.viewTrigger ?? false;
  const characterPool = props.characters ?? DEFAULT_CHARACTER_POOL;

  const characters = Array.from(text);

  const characterElementRefs: (HTMLElement | null)[] = new Array(
    characters.length,
  ).fill(null);

  const characterSpans: DomphyElement<"span">[] = characters.map(
    (character, index) => ({
      // Upstream renders every character via `letter.toUpperCase()`, so the
      // initial (pre-scramble) glyph reads uppercase too.
      span: character === " " ? " " : character.toUpperCase(),
      _key: `character-${index}`,
      // Space cells get upstream's fixed `w-3` (0.75rem) width so gaps don't
      // depend on the font's space-glyph width.
      style:
        character === " "
          ? { display: "inline-block", width: "0.75rem" }
          : { display: "inline-block" },
      _onMount: (node: ElementNode) => {
        characterElementRefs[index] = node.domElement as HTMLElement;
      },
      _onRemove: () => {
        characterElementRefs[index] = null;
      },
    }),
  );

  const randomCharacterGlyph = () =>
    characterPool.charAt(Math.floor(Math.random() * characterPool.length));

  return {
    [tag]: characterSpans,
    // Container mirrors upstream's `overflow-hidden py-2 text-4xl font-bold`.
    // Monospace (upstream's per-span `font-mono`) is hoisted to the container
    // so it cascades to every character cell, keeping each cell a fixed width
    // so random glyphs swapped in mid-scramble don't reflow their neighbours.
    //
    // paddingTop/paddingBottom stay upstream's literal 0.5rem (root-relative)
    // rather than themeSpacing(2) (0.5em, relative to THIS element's own
    // font-size) — this container's own font-size is pinned to a fixed
    // 2.25rem two lines below, so an em-based padding would resolve against
    // that (18px) instead of upstream's constant 8px, breaking pixel fidelity.
    _doctorDisable: "raw-spacing-value",
    style: {
      overflow: "hidden",
      paddingTop: "0.5rem",
      paddingBottom: "0.5rem",
      fontFamily: fixed("monospace"),
      fontSize: fixed("2.25rem"),
      fontWeight: fixed("700"),
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const element = node.domElement as HTMLElement;
      let animationFrameId: number | null = null;
      let startTimeoutId: ReturnType<typeof setTimeout> | null = null;
      let isAnimating = false;

      const stopAnimationFrame = () => {
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      };

      // Single rAF loop mirroring upstream: each frame resolves every
      // character whose index has been passed by `progress * characters.length`
      // (spaces counted, per upstream's `maxIterations = children.length`) and
      // re-randomizes the rest, forcing every glyph uppercase.
      const runScramble = () => {
        stopAnimationFrame();
        if (characters.length === 0) return;
        isAnimating = true;
        const maxIterations = characters.length;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
          const progress = Math.min((currentTime - startTime) / duration, 1);
          const iteration = progress * maxIterations;

          for (let index = 0; index < characters.length; index += 1) {
            if (characters[index] === " ") continue;
            const characterElement = characterElementRefs[index];
            if (!characterElement) continue;
            const resolved =
              index <= iteration ? characters[index] : randomCharacterGlyph();
            characterElement.textContent = resolved.toUpperCase();
          }

          if (progress < 1) {
            animationFrameId = requestAnimationFrame(animate);
          } else {
            animationFrameId = null;
            isAnimating = false;
          }
        };

        animationFrameId = requestAnimationFrame(animate);
      };

      // Auto-start (on mount) and view-start honour `delay`; a hover
      // re-trigger starts immediately, matching upstream.
      const startAfterDelay = () => {
        if (startTimeoutId !== null) clearTimeout(startTimeoutId);
        startTimeoutId = setTimeout(runScramble, delay);
      };

      let intersectionObserver: IntersectionObserver | null = null;
      if (viewTrigger) {
        if (typeof IntersectionObserver !== "function") {
          startAfterDelay();
        } else {
          intersectionObserver = new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                startAfterDelay();
                intersectionObserver?.disconnect();
                intersectionObserver = null;
              }
            },
            // Upstream only fires once the element is ~30% into the viewport.
            { threshold: 0.1, rootMargin: "-30% 0 -30% 0" },
          );
          intersectionObserver.observe(element);
        }
      } else {
        // Upstream default (startOnView=false): auto-play once on mount.
        startAfterDelay();
      }

      // Upstream's handleAnimationTrigger early-returns while a scramble is
      // already running, so a hover mid-animation is ignored.
      const handleMouseEnter = () => {
        if (!isAnimating) runScramble();
      };
      if (hoverTrigger)
        element.addEventListener("mouseenter", handleMouseEnter);

      node.addHook("Remove", () => {
        stopAnimationFrame();
        if (startTimeoutId !== null) clearTimeout(startTimeoutId);
        if (hoverTrigger)
          element.removeEventListener("mouseenter", handleMouseEnter);
        intersectionObserver?.disconnect();
      });
    },
    // The host tag is caller-configurable (`props.tag`), so it can't be
    // narrowed to one arm of the DomphyElement tag union statically — same
    // caveat `terminal.ts`'s typingLineElement()/fadeLineElement() document.
  } as unknown as DomphyElement;
}

export { hyperText };
