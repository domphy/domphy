// Aceternity UI "Container Cover" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied).
// An inline wrapper (meant to sit inside a heading, around a short phrase)
// that on hover reveals a tight near-black rounded panel behind the text,
// with sweeping light-beam strips and twinkling star sparkles inside, and
// the text itself brightening to white — a compact "warp speed spotlight"
// highlight for a word or two.
//
// The panel's hover-visibility is a pure CSS opacity/scale transition driven
// off a `toState<boolean>` (no imperative DOM writes needed, unlike this
// package's cursor-following effects) so `alwaysOn` can just seed that same
// state to `true` and skip the pointer wiring entirely. The beam strips are
// each a single CSS `@keyframes` `translateX` sweep — declarative and
// continuous, no `requestAnimationFrame` loop — with per-beam duration/delay
// randomized so they desync, the same "static shape, looping keyframe"
// idiom this package's `sparklesText()` uses for its own twinkle animation.
// Sparkles reuse that same file's spawn-timer technique (a self-rescheduling
// timer feeding a reactive list, one CSS keyframe per sparkle, self-retiring
// once its cycle finishes) but the reschedule delay is read fresh off a
// `hovered` flag on every spawn, so the population gets denser while
// hovered without needing two separate timers.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { hashString, toState } from "@domphy/core";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface ContainerCoverProps {
  /** Content wrapped by the effect — typically a short word/phrase inside a
   * heading. Defaults to `"Domphy"`. */
  children?: DomphyElement | DomphyElement[] | string;
  /** Extra class name merged onto the text element. */
  className?: string;
  /** Theme color family tinting the beams and edge glow lines. Defaults to `"info"`. */
  accentColor?: ThemeColor;
  /** Keeps the panel/beams/sparkles visible permanently instead of only on
   * hover. Defaults to `false`. */
  alwaysOn?: boolean;
  /** Roughly how many sparkles are alive at once while hovered. Defaults to `7`. */
  sparkleCount?: number;
  /** Number of sweeping beam strips. Defaults to `4`. */
  beamCount?: number;
  /** Panel corner radius, in `themeSpacing` units. Defaults to `3`. */
  cornerRadius?: number;
  /** Passthrough style merged onto the outer wrapper. */
  style?: StyleObject;
}

const BEAM_SWEEP_KEYFRAMES = {
  "0%": { transform: "translateX(-60%) rotate(16deg)", opacity: 0 },
  "10%": { opacity: 1 },
  "90%": { opacity: 1 },
  "100%": { transform: "translateX(220%) rotate(16deg)", opacity: 0 },
};
const BEAM_SWEEP_ANIMATION_NAME = `container-cover-beam-sweep-${hashString(JSON.stringify(BEAM_SWEEP_KEYFRAMES))}`;

const SPARKLE_TWINKLE_KEYFRAMES = {
  "0%": { transform: "scale(0)", opacity: 0 },
  "40%": { transform: "scale(1)", opacity: 1 },
  "70%": { transform: "scale(1)", opacity: 1 },
  "100%": { transform: "scale(0)", opacity: 0 },
};
const SPARKLE_TWINKLE_ANIMATION_NAME = `container-cover-sparkle-twinkle-${hashString(JSON.stringify(SPARKLE_TWINKLE_KEYFRAMES))}`;

const SPARKLE_CYCLE_DURATION_MS = 1000;
const SPARKLE_IDLE_INTERVAL_MULTIPLIER = 3; // sparser while resting/not `alwaysOn`

interface SparkleEntry {
  key: string;
  topPercent: number;
  leftPercent: number;
  sizeUnits: number;
}

/** Four-pointed star glyph, painted via `fill="currentColor"` — the same
 * generic sparkle shape this package's `sparklesText()` uses. */
function sparkleGlyph(sizeUnits: number): DomphyElement<"svg"> {
  return {
    svg: [{ path: null, d: "M12 0C13.3 6.3 14.4 9.7 21 12C14.4 14.3 13.3 17.7 12 24C10.7 17.7 9.6 14.3 3 12C9.6 9.7 10.7 6.3 12 0Z" }],
    viewBox: "0 0 24 24",
    fill: "currentColor",
    ariaHidden: "true",
    style: {
      display: "block",
      width: themeSpacing(sizeUnits),
      height: themeSpacing(sizeUnits),
    } as StyleObject,
  } as DomphyElement<"svg">;
}

function sparkleElement(entry: SparkleEntry): DomphyElement<"span"> {
  return {
    span: [sparkleGlyph(entry.sizeUnits)],
    _key: entry.key,
    ariaHidden: "true",
    style: {
      position: "absolute",
      insetBlockStart: `${entry.topPercent}%`,
      insetInlineStart: `${entry.leftPercent}%`,
      color: (listener: Listener) => themeColor(listener, "shift-1"),
      animation: `${SPARKLE_TWINKLE_ANIMATION_NAME} ${SPARKLE_CYCLE_DURATION_MS}ms ease-in-out forwards`,
    } as StyleObject,
  };
}

/** One sweeping light-beam strip: a thin diagonal gradient bar that loops a
 * `translateX` sweep across the panel, randomized duration/delay per beam so
 * they don't all travel in lockstep. */
function beamStrip(index: number, accentColor: ThemeColor): DomphyElement<"div"> {
  const durationSeconds = 2.4 + Math.random() * 2.2;
  const delaySeconds = Math.random() * durationSeconds;
  return {
    div: null,
    _key: `beam-${index}`,
    ariaHidden: "true",
    // Decorative gradient strip with no text of its own.
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      insetBlockStart: "-30%",
      insetBlockEnd: "-30%",
      insetInlineStart: 0,
      width: themeSpacing(0.5),
      backgroundImage: (listener: Listener) =>
        `linear-gradient(to bottom, transparent, ${themeColor(listener, "shift-2", accentColor)}, transparent)`,
      animation: `${BEAM_SWEEP_ANIMATION_NAME} ${durationSeconds.toFixed(2)}s linear ${delaySeconds.toFixed(2)}s infinite`,
    } as StyleObject,
  } as DomphyElement<"div">;
}

/**
 * Inline hover-triggered "warp speed spotlight" wrapper: a tight near-black
 * panel with sweeping light beams and twinkling sparkles fades/scales in
 * behind the wrapped content, which brightens to white while it's shown.
 * Meant to sit inside a heading around a short phrase. Call with no
 * arguments for a working demo word.
 */
function containerCover(props: ContainerCoverProps = {}): DomphyElement<"span"> {
  const children = props.children ?? "Domphy";
  const accentColor = props.accentColor ?? "info";
  const alwaysOn = props.alwaysOn ?? false;
  const sparkleCount = Math.max(1, Math.round(props.sparkleCount ?? 7));
  const beamCount = Math.max(1, Math.round(props.beamCount ?? 4));
  const cornerRadius = props.cornerRadius ?? 3;

  const hovered = toState(alwaysOn);
  const sparkles = toState<SparkleEntry[]>([]);

  const isActive = (listener: Listener) => alwaysOn || hovered.get(listener);

  const beams: DomphyElement<"div">[] = Array.from({ length: beamCount }, (_unused, index) => beamStrip(index, accentColor));

  const edgeGlowLine = (edge: "top" | "bottom"): DomphyElement<"div"> =>
    ({
      div: null,
      ariaHidden: "true",
      _doctorDisable: "missing-color",
      style: {
        position: "absolute",
        insetInlineStart: 0,
        insetInlineEnd: 0,
        ...(edge === "top" ? { insetBlockStart: 0 } : { insetBlockEnd: 0 }),
        height: themeSpacing(0.5),
        backgroundImage: (listener: Listener) =>
          `linear-gradient(to right, transparent, ${themeColor(listener, "shift-6", accentColor)}, transparent)`,
      } as StyleObject,
    }) as DomphyElement<"div">;

  const panel: DomphyElement<"div"> = {
    div: [
      { div: beams, ariaHidden: "true", style: { position: "absolute", inset: 0, overflow: "hidden" } as StyleObject } as DomphyElement,
      {
        span: (listener: Listener) => sparkles.get(listener).map(sparkleElement),
        ariaHidden: "true",
        style: { position: "absolute", inset: 0, pointerEvents: "none" } as StyleObject,
      } as DomphyElement,
      edgeGlowLine("top"),
      edgeGlowLine("bottom"),
    ],
    ariaHidden: "true",
    dataTone: "shift-17",
    style: {
      position: "absolute",
      inset: 0,
      overflow: "hidden",
      pointerEvents: "none",
      zIndex: 0,
      borderRadius: themeSpacing(cornerRadius),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      opacity: (listener: Listener) => (isActive(listener) ? 1 : 0),
      transform: (listener: Listener) => (isActive(listener) ? "scale(1)" : "scale(0.94)"),
      transition: "opacity 220ms ease-out, transform 220ms ease-out",
      [`@keyframes ${BEAM_SWEEP_ANIMATION_NAME}`]: BEAM_SWEEP_KEYFRAMES,
      [`@keyframes ${SPARKLE_TWINKLE_ANIMATION_NAME}`]: SPARKLE_TWINKLE_KEYFRAMES,
    } as StyleObject,
  } as DomphyElement<"div">;

  const textContent: DomphyElement<"span"> = {
    span: children,
    // Only set `class` when a className was actually passed — an explicit
    // `class: undefined` would overwrite (not skip) the auto-generated
    // per-node style class ElementNode.merge() seeds at construction,
    // silently dropping this element's own `style: {}` from the DOM.
    ...(props.className ? { class: props.className } : {}),
    style: {
      position: "relative",
      zIndex: 1,
      color: (listener: Listener) => (isActive(listener) ? themeColor(listener, "shift-0") : "inherit"),
      transition: "color 220ms ease-out",
    } as StyleObject,
  } as DomphyElement<"span">;

  return {
    span: [panel, textContent],
    onPointerEnter: () => {
      if (!alwaysOn) hovered.set(true);
    },
    onPointerLeave: () => {
      if (!alwaysOn) hovered.set(false);
    },
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const wrapperElement = node.domElement as HTMLElement | null;
      if (!wrapperElement) return;
      let insertCount = 0;
      let rescheduleTimeout: ReturnType<typeof setTimeout> | null = null;
      const pendingRetireTimeouts = new Set<ReturnType<typeof setTimeout>>();

      const spawnSparkle = () => {
        insertCount += 1;
        const key = `sparkle-${insertCount}`;
        const entry: SparkleEntry = {
          key,
          topPercent: Math.round(10 + Math.random() * 80),
          leftPercent: Math.round(5 + Math.random() * 90),
          sizeUnits: 1.5 + Math.random() * 1.5,
        };
        sparkles.set([...sparkles.get(), entry]);
        const retireTimeout = setTimeout(() => {
          pendingRetireTimeouts.delete(retireTimeout);
          sparkles.set(sparkles.get().filter((item) => item.key !== key));
        }, SPARKLE_CYCLE_DURATION_MS);
        pendingRetireTimeouts.add(retireTimeout);
      };

      const scheduleNext = () => {
        const active = alwaysOn || hovered.get();
        const slotMs = SPARKLE_CYCLE_DURATION_MS / sparkleCount;
        const intervalMs = Math.max(60, active ? slotMs : slotMs * SPARKLE_IDLE_INTERVAL_MULTIPLIER);
        rescheduleTimeout = setTimeout(() => {
          // Belt-and-suspenders stop condition: some hosts (e.g. a test
          // harness that wipes the DOM directly instead of going through the
          // framework's removal lifecycle) never fire the "Remove" hook
          // below. Bailing here once the wrapper is detached prevents the
          // loop from leaking forever across unrelated later tests.
          if (!wrapperElement.isConnected) return;
          spawnSparkle();
          scheduleNext();
        }, intervalMs);
      };

      spawnSparkle();
      scheduleNext();

      node.addHook("Remove", () => {
        if (rescheduleTimeout) clearTimeout(rescheduleTimeout);
        for (const retireTimeout of pendingRetireTimeouts) clearTimeout(retireTimeout);
        pendingRetireTimeouts.clear();
      });
    },
    style: {
      position: "relative",
      display: "inline-block",
      paddingBlock: themeSpacing(1),
      paddingInline: themeSpacing(3),
      cursor: "default",
      ...(props.style ?? {}),
    } as StyleObject,
  } as DomphyElement<"span">;
}

export { containerCover };
