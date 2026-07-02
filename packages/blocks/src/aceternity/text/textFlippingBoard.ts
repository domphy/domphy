// Aceternity UI "Text Flipping Board" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). An
// airport/train-station split-flap character board: a grid of dark tiles
// spells out a message, each tile rapidly cycling through random glyphs
// before mechanically settling on its target letter, staggered across the
// grid so the board resolves in a cascading ripple rather than all at once.
//
// Each tile's flip is a JS timer/queue (not a single WAAPI keyframe, since
// different tiles need a different number of intermediate stops to reach
// their own target glyph): a chained `setTimeout` sequence toggles the
// character element's own `rotateX` between `0deg` and `±90deg` via a plain
// CSS `transition`, swapping the displayed glyph at the midpoint of each
// half-step — the classic flip-clock trick: jump straight to the opposite
// `+90deg` with the transition briefly disabled, force a reflow (the same
// "read `offsetHeight` to commit a style change before re-enabling the
// transition" idiom `directionAwareHover.ts` already uses elsewhere in this
// package), then transition back to `0deg` so the new glyph appears to
// rotate INTO place. This needs no Web Animations API support at all
// (unlike this package's own `motion()` patch), so it works even in
// headless/test DOM environments with no real `Element.animate` — the same
// portability tradeoff `hyperText.ts`'s own `setInterval`-driven scramble
// loop makes elsewhere in this package.
//
// Per-tile step COUNT is derived from a fixed glyph cycling sequence: every
// tile runs a couple of full loops through the sequence plus however many
// extra steps its own target glyph sits further along that sequence — so
// "further away" glyphs genuinely take more steps, per the spec. Because
// each tile's own flip TIME budget is a fixed share of the total `duration`
// (after its own staggered start delay), a tile with more steps just flips
// through them faster (shorter per-step duration) so every tile still
// settles around the same overall moment.
//
// The optional "clack" sound is synthesized on the fly with the Web Audio
// API (a short decaying square-wave burst) rather than an audio file — the
// spec's own prop description ("boolean to enable synthesized flap sound
// effects") calls for exactly this, and this package ships no audio assets.
//
// FIDELITY NOTE (per the task's own researchNote): exact default colors,
// tile size/gap, and font could not be pixel-verified (client-rendered demo,
// only the props table/description were retrievable) — this implementation
// uses this package's own dark-tile idiom (edge-anchored `dataTone`) and a
// monospace display face, which is a reasonable default for the described
// Vestaboard-style look, not a confirmed 1:1 visual match. The `{tag}` inline
// per-tile accent syntax within `rows` is this implementation's own concrete
// reading of the docs' "`{O}`-style" note — wrap any run of characters in
// `{}` to tint just those tiles `accentColor` instead of the default color.

import type { DomphyElement, ElementNode, StyleObject } from "@domphy/core";
import { type ThemeColor, themeColor, themeSize, themeSpacing } from "@domphy/theme";

export interface TextFlippingBoardProps {
  /** Message to spell out. Supports `\n` for explicit line breaks and is automatically
   * word-wrapped onto further rows past `columns`. Ignored when `rows` is given. Defaults to a
   * short demo message. */
  text?: string;
  /** Manual per-row content, taking precedence over `text`. Wrap a run of characters in `{}` to
   * tint just those tiles `accentColor` instead of the default color, e.g. `"WELCOME {HOME}"`. */
  rows?: string[];
  /** Maximum characters per row before `text` word-wraps onto the next row. Only used when
   * wrapping `text` (ignored when `rows` is given). Defaults to `16`. */
  columns?: number;
  /** Total ms budget for the whole board's cascading settle. Defaults to `1200`. */
  duration?: number;
  /** Plays a short synthesized mechanical "clack" on flip steps via the Web Audio API. Defaults to `false`. */
  sound?: boolean;
  /** Theme color family for `{}`-tagged accent tiles. Defaults to `"warning"` (reads as orange). */
  accentColor?: ThemeColor;
  /** Extra class name merged onto the outer board's native `class` attribute. */
  className?: string;
  /** Passthrough style merged onto the outer board container. */
  style?: StyleObject;
}

interface TileSpec {
  char: string;
  accent: boolean;
  blank: boolean;
}

const GLYPH_SEQUENCE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?'-";
const FULL_CYCLES_BEFORE_SETTLE = 2;
const MIN_STEP_DURATION_MS = 30;
const STAGGER_FRACTION_OF_DURATION = 0.4;
const SOUND_THROTTLE_MS = 35;
const DEFAULT_TEXT = "DOMPHY BLOCKS ARE HERE";

let textFlippingBoardInstanceCounter = 0;

/** Splits a row string into tiles, treating any run of characters wrapped in `{}` as
 * accent-tagged (the braces themselves are markers, not rendered as their own tiles). */
function parseTaggedRow(row: string): TileSpec[] {
  const tiles: TileSpec[] = [];
  let insideAccent = false;
  for (const character of row.toUpperCase()) {
    if (character === "{") {
      insideAccent = true;
      continue;
    }
    if (character === "}") {
      insideAccent = false;
      continue;
    }
    tiles.push({ char: character, accent: insideAccent, blank: character === " " });
  }
  return tiles;
}

/** Greedy word-wrap: explicit `\n` breaks are always honored; each resulting line is then
 * further split so no row exceeds `maxColumns` characters. */
function wrapTextIntoRows(text: string, maxColumns: number): string[] {
  const rows: string[] = [];
  for (const explicitLine of text.split("\n")) {
    const words = explicitLine.split(" ").filter((word) => word.length > 0);
    if (words.length === 0) {
      rows.push("");
      continue;
    }
    let currentRow = "";
    for (const word of words) {
      const candidate = currentRow.length === 0 ? word : `${currentRow} ${word}`;
      if (candidate.length > maxColumns && currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = word;
      } else {
        currentRow = candidate;
      }
    }
    rows.push(currentRow);
  }
  return rows;
}

let sharedFlapAudioContext: AudioContext | null = null;
let lastFlapSoundAt = 0;

/** Synthesizes one short mechanical "clack" via a decaying square-wave burst. Best-effort:
 * silently no-ops on unsupported/non-browser environments or autoplay-policy rejections. */
function playFlapClackSound(): void {
  if (typeof window === "undefined") return;
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (now - lastFlapSoundAt < SOUND_THROTTLE_MS) return;
  lastFlapSoundAt = now;
  try {
    const AudioContextConstructor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    sharedFlapAudioContext = sharedFlapAudioContext ?? new AudioContextConstructor();
    const audioContext = sharedFlapAudioContext;
    const startTime = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(190, startTime);
    gainNode.gain.setValueAtTime(0.04, startTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.035);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + 0.035);
  } catch {
    // Best-effort only — ignore autoplay-policy rejections or unsupported environments.
  }
}

function randomGlyph(): string {
  return GLYPH_SEQUENCE.charAt(Math.floor(Math.random() * GLYPH_SEQUENCE.length));
}

/** Runs one tile's staggered scramble-then-settle flip sequence, registering every timeout it
 * schedules into `pendingTimeouts` so the board can cancel them all on unmount. */
function scheduleTileFlip(
  characterElement: HTMLElement,
  targetChar: string,
  startDelayMs: number,
  flipBudgetMs: number,
  sound: boolean,
  pendingTimeouts: Set<ReturnType<typeof setTimeout>>,
): void {
  const targetIndex = GLYPH_SEQUENCE.indexOf(targetChar);
  const distanceSteps = targetIndex === -1 ? 0 : targetIndex;
  const totalSteps = Math.max(1, FULL_CYCLES_BEFORE_SETTLE * GLYPH_SEQUENCE.length + distanceSteps);
  const halfStepMs = Math.max(MIN_STEP_DURATION_MS / 2, flipBudgetMs / totalSteps / 2);

  const startTimeout = setTimeout(() => {
    let completedSteps = 0;

    function runStep(): void {
      const isFinalStep = completedSteps === totalSteps - 1;
      const nextChar = isFinalStep ? targetChar : randomGlyph();

      characterElement.style.transitionDuration = `${halfStepMs}ms`;
      characterElement.style.transform = "rotateX(-90deg)";

      const flipDownTimeout = setTimeout(() => {
        characterElement.textContent = nextChar;
        if (sound) playFlapClackSound();
        // Jump straight to the mirrored +90deg with the transition disabled,
        // force a reflow to commit that jump, THEN restore the transition
        // and animate back to 0deg — otherwise the browser would animate
        // straight through the jump instead of appearing to flip INTO place.
        characterElement.style.transitionDuration = "0ms";
        characterElement.style.transform = "rotateX(90deg)";
        void characterElement.offsetHeight;
        characterElement.style.transitionDuration = `${halfStepMs}ms`;
        characterElement.style.transform = "rotateX(0deg)";

        const flipUpTimeout = setTimeout(() => {
          completedSteps += 1;
          if (completedSteps < totalSteps) runStep();
        }, halfStepMs);
        pendingTimeouts.add(flipUpTimeout);
      }, halfStepMs);
      pendingTimeouts.add(flipDownTimeout);
    }

    runStep();
  }, startDelayMs);
  pendingTimeouts.add(startTimeout);
}

function tileElement(
  tile: TileSpec,
  tileKey: string,
  startDelayMs: number,
  flipBudgetMs: number,
  sound: boolean,
  accentColor: ThemeColor,
  pendingTimeouts: Set<ReturnType<typeof setTimeout>>,
): DomphyElement<"div"> {
  const initialGlyph = tile.blank ? null : randomGlyph();

  // `_doctorDisable` is a doctor-only annotation not present in core's
  // strict `PartialElement` type — build through an untyped literal, then
  // assert, so the excess-property check doesn't fire (mirrors
  // `dottedGlowBackground.ts`/`flickeringGrid.ts`).
  const characterElement = {
    div: initialGlyph,
    // Bold, uppercase, fixed-width glyph display — `@domphy/theme` has no
    // font-family token (AGENTS.md: "fontFamily -> remove entirely, theme
    // owns the font stack"), so the monospace face is a narrow, documented
    // exception, same as `evervaultCard.ts`'s character grid. Also exempt
    // from missing-color: this glyph inherits its `color` from the tile
    // wrapper's own `dataTone`-contract color one level up, by design.
    _doctorDisable: ["inline-typography", "missing-color"],
    style: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      fontWeight: 700,
      fontSize: (listener) => themeSize(listener, "increase-1"),
      lineHeight: "1",
      transformOrigin: "center",
      transitionProperty: "transform",
      transitionTimingFunction: "linear",
      willChange: "transform",
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (tile.blank) return;
      const domElement = node.domElement as HTMLElement;
      scheduleTileFlip(domElement, tile.char, startDelayMs, flipBudgetMs, sound, pendingTimeouts);
    },
  } as DomphyElement<"div">;

  const seamLine = {
    div: null,
    ariaHidden: "true",
    // Decorative hinge seam line with no text of its own — exempt from the
    // missing-color contract, matching this package's other purely
    // decorative accent lines (e.g. `heroHighlight.ts`'s marker bar). Also
    // exempt from tone-background-inherit: the seam's fixed accent tint is
    // intentional, not a surface (same reasoning `glowingStars.ts`/
    // `shootingStars.ts` document for their own decorative accents).
    _doctorDisable: ["missing-color", "tone-background-inherit"],
    style: {
      position: "absolute",
      insetInline: 0,
      top: "50%",
      height: "1px",
      opacity: 0.6,
      backgroundColor: (listener) => themeColor(listener, "shift-14"),
    } as StyleObject,
  } as DomphyElement<"div">;

  return {
    div: [characterElement, seamLine],
    _key: tileKey,
    // Edge-anchored dark tile surface — this package's standard convention
    // for a small elevated dark card (see `evervaultCard.ts`/`spotlightDual.ts`).
    dataTone: "shift-17",
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      perspective: "300px",
      width: themeSpacing(9),
      height: themeSpacing(11),
      borderRadius: themeSpacing(1),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-11", tile.accent ? accentColor : "neutral"),
    } as StyleObject,
  };
}

/**
 * An airport/train-station split-flap character board: a grid of dark tiles
 * spells out a message, each tile scrambling through random glyphs before
 * mechanically settling on its target letter, staggered across the grid so
 * the board resolves in a cascading ripple. Call with no arguments for a
 * working demo — a short two-row message.
 */
function textFlippingBoard(props: TextFlippingBoardProps = {}): DomphyElement<"div"> {
  const durationMs = Math.max(200, props.duration ?? 1200);
  const sound = props.sound ?? false;
  const accentColor = props.accentColor ?? "warning";
  const columns = Math.max(4, Math.round(props.columns ?? 16));

  const rowStrings = props.rows && props.rows.length > 0 ? props.rows : wrapTextIntoRows((props.text ?? DEFAULT_TEXT).toUpperCase(), columns);

  const rows: TileSpec[][] = rowStrings.map(parseTaggedRow);
  const totalTiles = rows.reduce((sum, row) => sum + row.length, 0);
  const staggerWindowMs = durationMs * STAGGER_FRACTION_OF_DURATION;
  const perTileStaggerMs = totalTiles > 1 ? staggerWindowMs / (totalTiles - 1) : 0;
  const flipBudgetMs = Math.max(durationMs - staggerWindowMs, durationMs * 0.3);

  const instanceId = ++textFlippingBoardInstanceCounter;
  const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();
  let tileSequenceIndex = 0;

  const rowElements: DomphyElement<"div">[] = rows.map((row, rowIndex) => ({
    div: row.map((tile, columnIndex) => {
      const startDelayMs = tileSequenceIndex * perTileStaggerMs;
      tileSequenceIndex += 1;
      return tileElement(tile, `tile-${instanceId}-${rowIndex}-${columnIndex}`, startDelayMs, flipBudgetMs, sound, accentColor, pendingTimeouts);
    }),
    _key: `row-${instanceId}-${rowIndex}`,
    style: { display: "flex", justifyContent: "center", gap: themeSpacing(1) } as StyleObject,
  }));

  return {
    div: rowElements,
    class: props.className,
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: themeSpacing(1),
      ...(props.style ?? {}),
    } as StyleObject,
    _onRemove: () => {
      for (const timeoutId of pendingTimeouts) clearTimeout(timeoutId);
      pendingTimeouts.clear();
    },
  } as DomphyElement<"div">;
}

export { textFlippingBoard };
