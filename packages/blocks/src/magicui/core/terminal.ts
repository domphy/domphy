// magicui "Terminal" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// decorative macOS-style terminal window that plays back a scripted,
// pre-authored sequence of typed commands and faded-in output lines. This is
// a marketing/decorative widget, not a real shell — no input is read and
// nothing is executed.

import type { DomphyElement, ElementNode, Listener, State, StyleObject } from "@domphy/core";
import { hashString, toState } from "@domphy/core";
import { type MotionKeyframe, motion } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSize, themeSpacing } from "@domphy/theme";

export interface TerminalTypingLine {
  type: "typing";
  /** Full command text, revealed one character at a time. */
  text: string;
  /** Characters revealed per second. Defaults to ~16.7 (≈60ms/character). */
  charsPerSecond?: number;
  /** Explicit start delay in ms — overrides automatic sequencing for this line. */
  delay?: number;
  /** Host tag for the line row. Defaults to "div". */
  tag?: "div" | "p";
  /** Optional color tone override (e.g. a highlighted command). Defaults to "neutral". */
  color?: ThemeColor;
}

export interface TerminalFadeLine {
  type: "fade";
  /** Output text, revealed as one fully-formed block. */
  text: string;
  /** Explicit start delay in ms — overrides automatic sequencing for this line. */
  delay?: number;
  /** Optional color tone override (e.g. success green for a "done" line). Defaults to "neutral". */
  color?: ThemeColor;
  /** Host tag for the line row. Defaults to "div". */
  tag?: "div" | "p";
}

export type TerminalLine = TerminalTypingLine | TerminalFadeLine;

export interface TerminalProps {
  /** Ordered script of typed-command and fade-output lines. Defaults to a demo install script. */
  lines?: TerminalLine[];
  /** Auto-sequence lines one after another (each waits for the previous to finish). Defaults to true. */
  sequence?: boolean;
  /** Only start playback once the window scrolls into view. Defaults to true. */
  startOnView?: boolean;
  style?: StyleObject;
}

// Prompt glyphs (e.g. "> ", "$ ") are literal author content per line, not
// auto-prepended — mirrors upstream TypingAnimation, which types exactly the
// text it is given (output lines carry no prompt).
const DEFAULT_LINES: TerminalLine[] = [
  { type: "typing", text: "> npx domphy@latest init" },
  { type: "fade", text: "Scaffolding your project…" },
  { type: "fade", text: "Installing dependencies…" },
  { type: "typing", text: "> npm run dev" },
  { type: "fade", text: "✔ Ready on http://localhost:3000", color: "success" },
];

const DEFAULT_CHARS_PER_SECOND = 1000 / 60; // ~60ms per character
const FADE_LINE_DURATION_MS = 300;

const CURSOR_KEYFRAMES = { "0%,49%": { opacity: 1 }, "50%,100%": { opacity: 0 } };
const CURSOR_ANIMATION_NAME = `terminal-cursor-${hashString(JSON.stringify(CURSOR_KEYFRAMES))}`;

/** Computes each line's start delay (ms): explicit `delay` wins, otherwise the
 * running total of every previous line's own duration when `sequence` is on. */
function computeSchedule(lines: TerminalLine[], sequence: boolean): number[] {
  const delays: number[] = [];
  let cumulative = 0;
  for (const line of lines) {
    const startDelay = line.delay ?? (sequence ? cumulative : 0);
    delays.push(startDelay);
    const duration =
      line.type === "typing"
        ? (line.text.length / (line.charsPerSecond ?? DEFAULT_CHARS_PER_SECOND)) * 1000
        : FADE_LINE_DURATION_MS;
    // Next line advances the instant the previous completes — no inter-line gap.
    cumulative = startDelay + duration;
  }
  return delays;
}

// A solid-filled circular glyph, not a themed "surface" — painted via `fill:
// currentColor` + a fixed-shift `color` (same idiom as icon()/badge()'s own
// fixed-shift `color`) rather than `backgroundColor`, so it reads as a vivid
// indicator dot without tripping the tone-background-inherit surface rule.
function trafficLightDot(color: ThemeColor): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [{ circle: null, cx: "12", cy: "12", r: "12" }],
        viewBox: "0 0 24 24",
        fill: "currentColor",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    _key: color,
    style: {
      display: "inline-block",
      width: themeSpacing(2),
      height: themeSpacing(2),
      color: (listener: Listener) => themeColor(listener, "shift-9", color),
    },
  };
}

// A solid block glyph (not a `backgroundColor` fill) so its fixed-shift tone
// reads as a text-color glyph rather than a hardcoded surface — same idiom as
// trafficLightDot() above.
function blinkingCursor(): DomphyElement<"span"> {
  const element = {
    span: "▊",
    ariaHidden: "true",
    style: {
      display: "inline-block",
      marginInlineStart: themeSpacing(1),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      animation: `${CURSOR_ANIMATION_NAME} 1s steps(1) infinite`,
      [`@keyframes ${CURSOR_ANIMATION_NAME}`]: CURSOR_KEYFRAMES,
    },
  };
  return element as DomphyElement<"span">;
}

function typingLineElement(
  line: TerminalTypingLine,
  startDelayMs: number,
  started: State<boolean>,
): DomphyElement {
  const revealed = toState("");
  const tag = line.tag ?? "div";
  const charsPerSecond = line.charsPerSecond ?? DEFAULT_CHARS_PER_SECOND;
  const intervalMs = Math.max(16, 1000 / charsPerSecond);

  return {
    [tag]: [
      { span: (listener: Listener) => revealed.get(listener) },
      blinkingCursor(),
    ],
    style: {
      display: "flex",
      alignItems: "center",
      whiteSpace: "pre",
      color: (listener: Listener) => themeColor(listener, "shift-9", line.color ?? "neutral"),
    },
    _onMount: (node: ElementNode) => {
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
      let intervalHandle: ReturnType<typeof setInterval> | null = null;

      const runTyping = () => {
        let index = 0;
        intervalHandle = setInterval(() => {
          index += 1;
          revealed.set(line.text.slice(0, index));
          if (index >= line.text.length && intervalHandle) {
            clearInterval(intervalHandle);
            intervalHandle = null;
          }
        }, intervalMs);
      };
      const schedule = () => {
        timeoutHandle = setTimeout(runTyping, startDelayMs);
      };
      const update = (value: boolean) => {
        if (value) schedule();
      };
      update(started.get());
      const release = started.addListener(update);

      node.addHook("Remove", () => {
        release();
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (intervalHandle) clearInterval(intervalHandle);
      });
    },
    // The host tag is a runtime-computed string (`line.tag ?? "div"`), so it
    // can't be narrowed to one arm of the DomphyElement tag union statically.
  } as unknown as DomphyElement;
}

function fadeLineElement(
  line: TerminalFadeLine,
  startDelayMs: number,
  started: State<boolean>,
): DomphyElement {
  const initialFrame: MotionKeyframe = { opacity: 0, y: -5 };
  const revealFrame: MotionKeyframe = { opacity: 1, y: 0 };
  const frame = toState<MotionKeyframe>(initialFrame);
  const tag = line.tag ?? "div";

  return {
    [tag]: line.text,
    style: {
      color: (listener: Listener) => themeColor(listener, "shift-9", line.color ?? "neutral"),
    },
    $: [motion({ initial: initialFrame, animate: frame, transition: { duration: FADE_LINE_DURATION_MS, easing: "ease-in-out" } })],
    _onMount: (node: ElementNode) => {
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

      const reveal = () => {
        timeoutHandle = setTimeout(() => frame.set(revealFrame), startDelayMs);
      };
      const update = (value: boolean) => {
        if (value) reveal();
      };
      update(started.get());
      const release = started.addListener(update);

      node.addHook("Remove", () => {
        release();
        if (timeoutHandle) clearTimeout(timeoutHandle);
      });
    },
    // Same runtime-computed-tag caveat as typingLineElement() above.
  } as unknown as DomphyElement;
}

/**
 * Decorative macOS-style terminal window that plays back a scripted sequence
 * of typed commands and faded-in output. Call with no arguments for a
 * working demo — a five-line install script that types/fades in on view.
 */
function terminal(props: TerminalProps = {}): DomphyElement<"div"> {
  const lines = props.lines ?? DEFAULT_LINES;
  const sequence = props.sequence ?? true;
  const startOnView = props.startOnView ?? true;

  const started = toState(!startOnView);
  const delays = computeSchedule(lines, sequence);

  const lineElements = lines.map((line, index) => ({
    ...(line.type === "typing"
      ? typingLineElement(line, delays[index], started)
      : fadeLineElement(line, delays[index], started)),
    _key: `line-${index}`,
  }));

  return {
    div: [
      {
        div: [trafficLightDot("danger"), trafficLightDot("warning"), trafficLightDot("success")],
        style: {
          display: "flex",
          gap: themeSpacing(2),
          padding: themeSpacing(4),
          borderBottom: (listener: Listener) => `1px solid ${themeColor(listener, "shift-14")}`,
        },
      },
      {
        div: lineElements as DomphyElement[],
        style: {
          display: "flex",
          flexDirection: "column",
          gap: themeSpacing(1),
          padding: themeSpacing(4),
          overflow: "auto",
          fontFamily: "monospace",
          fontSize: (listener: Listener) => themeSize(listener, "decrease-1"),
          letterSpacing: "-0.025em",
        },
      },
    ],
    dataTone: "shift-17",
    _onMount: (node: ElementNode) => {
      if (!startOnView || started.get()) return;
      if (typeof IntersectionObserver !== "function") {
        // No IntersectionObserver support (e.g. non-browser test runtime) —
        // fail open and start immediately rather than never playing.
        started.set(true);
        return;
      }
      const element = node.domElement as Element;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            started.set(true);
            observer.disconnect();
          }
        },
        { threshold: 0.3 },
      );
      observer.observe(element);
      node.addHook("Remove", () => observer.disconnect());
    },
    style: {
      overflow: "hidden",
      height: "100%",
      maxHeight: themeSpacing(100),
      maxWidth: themeSpacing(128),
      borderRadius: themeSpacing(3),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-14")}`,
      outlineOffset: "-1px",
      ...(props.style ?? {}),
    },
  };
}

export { terminal };
