// magicui "Hyper Text" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). Text
// whose characters flicker rapidly through random glyphs before locking
// into their true letters one at a time, left to right, so the word
// appears to "resolve" out of noise — a code-breaking/terminal-decrypt
// reveal. Default trigger is hover (replays every time), with an opt-in
// flag to instead (or additionally) trigger once on scroll-into-view.
//
// Each character is its own `<span>` so it can be swapped independently;
// spaces are rendered as plain, non-animated gaps. This is a JS-driven
// `textContent` swap loop — two `setInterval` timers per play (one fast
// tick that re-randomizes every not-yet-locked character, one slower tick
// that locks the next character in sequence) — not CSS keyframes or SVG,
// per the spec's "interval/frame-driven character substitution" note.
// Per-character DOM refs are captured in each character span's own
// `_onMount`/`_onRemove` rather than routed through reactive `State`, since
// this is a continuous high-frequency effect (same "write straight to the
// DOM node inside the loop" idiom `numberTicker`/`dock` use elsewhere in
// this package).

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";

export interface HyperTextProps {
  /** Text content to animate. Defaults to a short demo phrase. */
  children?: string;
  /** HTML tag the container renders as. Defaults to `"span"`. */
  tag?: string;
  /** Total milliseconds for the full scramble-to-resolve animation. Defaults to `800`. */
  duration?: number;
  /** Milliseconds to wait after the trigger fires before the scramble starts. Defaults to `0`. */
  delay?: number;
  /** Replays the scramble on every mouse hover. Defaults to `true`. */
  hoverTrigger?: boolean;
  /** Also (or instead) plays the scramble once, automatically, the first time the element scrolls
   * into the viewport. Defaults to `false`. */
  viewTrigger?: boolean;
  /** Character pool randomly sampled while a character position is unresolved. Defaults to A-Z. */
  characters?: string;
  /** Passthrough style merged onto the container. */
  style?: StyleObject;
}

const DEFAULT_CHARACTER_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
// How often (ms) unresolved characters are reassigned a fresh random glyph.
// Fast enough to read as a flicker, slow enough to stay legible per-frame.
const SCRAMBLE_TICK_MS = 40;

/**
 * Text that scrambles through random characters before resolving,
 * left-to-right, into its real content — a terminal-decrypt effect.
 * Replays on hover by default; can also (or instead) auto-play once on
 * scroll-into-view. Call with no arguments for a working demo.
 */
function hyperText(props: HyperTextProps = {}): DomphyElement {
  const text = props.children ?? "Hover to Decode";
  const tag = props.tag ?? "span";
  const duration = props.duration ?? 800;
  const delay = props.delay ?? 0;
  const hoverTrigger = props.hoverTrigger ?? true;
  const viewTrigger = props.viewTrigger ?? false;
  const characterPool = props.characters ?? DEFAULT_CHARACTER_POOL;

  const characters = Array.from(text);
  const nonSpaceIndices = characters
    .map((character, index) => index)
    .filter((index) => characters[index] !== " " && characters[index].trim().length > 0);

  const characterElementRefs: (HTMLElement | null)[] = new Array(characters.length).fill(null);

  const characterSpans: DomphyElement<"span">[] = characters.map((character, index) => ({
    span: character === " " ? " " : character,
    _key: `character-${index}`,
    style: { display: "inline-block" },
    _onMount: (node: ElementNode) => {
      characterElementRefs[index] = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      characterElementRefs[index] = null;
    },
  }));

  const randomCharacterGlyph = () => characterPool.charAt(Math.floor(Math.random() * characterPool.length));

  return {
    [tag]: characterSpans,
    // Monospace (upstream's `font-mono`) keeps every character cell a fixed
    // width, so swapping in random glyphs mid-scramble doesn't jitter the
    // surrounding characters left and right — and it suits the terminal-decode
    // aesthetic. A proportional font would visibly reflow on every tick.
    style: { display: "inline-block", fontFamily: "monospace", ...(props.style ?? {}) } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const element = node.domElement as HTMLElement;
      // Bare (non `window.`-qualified) timer functions: with both DOM and
      // Node ambient globals in scope, `window.setInterval`'s return type
      // resolves inconsistently against `ReturnType<typeof window.setInterval>`
      // depending on call-site vs type-query context — the bare globals
      // resolve to a single consistent type instead (same fix already
      // applied to `sparklesText` elsewhere in this package).
      let scrambleIntervalId: ReturnType<typeof setInterval> | null = null;
      let lockIntervalId: ReturnType<typeof setInterval> | null = null;
      let startTimeoutId: ReturnType<typeof setTimeout> | null = null;

      const clearRunningTimers = () => {
        if (scrambleIntervalId !== null) {
          clearInterval(scrambleIntervalId);
          scrambleIntervalId = null;
        }
        if (lockIntervalId !== null) {
          clearInterval(lockIntervalId);
          lockIntervalId = null;
        }
      };

      const play = () => {
        clearRunningTimers();
        const totalSteps = nonSpaceIndices.length;
        if (totalSteps === 0) return;
        let resolvedSteps = 0;
        const stepDurationMs = Math.max(duration / totalSteps, SCRAMBLE_TICK_MS);

        const scrambleTick = () => {
          for (let step = resolvedSteps; step < totalSteps; step += 1) {
            const characterElement = characterElementRefs[nonSpaceIndices[step]];
            if (characterElement) characterElement.textContent = randomCharacterGlyph();
          }
        };

        const lockNextCharacter = () => {
          if (resolvedSteps >= totalSteps) return;
          const charIndex = nonSpaceIndices[resolvedSteps];
          const characterElement = characterElementRefs[charIndex];
          if (characterElement) characterElement.textContent = characters[charIndex];
          resolvedSteps += 1;
          if (resolvedSteps >= totalSteps) clearRunningTimers();
        };

        scrambleIntervalId = setInterval(scrambleTick, SCRAMBLE_TICK_MS);
        lockIntervalId = setInterval(lockNextCharacter, stepDurationMs);
      };

      const trigger = () => {
        if (startTimeoutId !== null) clearTimeout(startTimeoutId);
        startTimeoutId = setTimeout(play, delay);
      };

      let intersectionObserver: IntersectionObserver | null = null;
      if (viewTrigger) {
        if (typeof IntersectionObserver !== "function") {
          trigger();
        } else {
          intersectionObserver = new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                trigger();
                intersectionObserver?.disconnect();
                intersectionObserver = null;
              }
            },
            { threshold: 0.2 },
          );
          intersectionObserver.observe(element);
        }
      }

      const handleMouseEnter = () => trigger();
      if (hoverTrigger) element.addEventListener("mouseenter", handleMouseEnter);

      node.addHook("Remove", () => {
        clearRunningTimers();
        if (startTimeoutId !== null) clearTimeout(startTimeoutId);
        if (hoverTrigger) element.removeEventListener("mouseenter", handleMouseEnter);
        intersectionObserver?.disconnect();
      });
    },
    // The host tag is caller-configurable (`props.tag`), so it can't be
    // narrowed to one arm of the DomphyElement tag union statically — same
    // caveat `terminal.ts`'s typingLineElement()/fadeLineElement() document.
  } as unknown as DomphyElement;
}

export { hyperText };
