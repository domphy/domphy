// Aceternity UI "Keyboard" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// skeuomorphic on-screen Mac-style keyboard that lights up each key in sync
// with the visitor's real keystrokes, with an optional floating keystroke
// preview and an optional mechanical click sound.
//
// One `State<boolean>` per physical key (keyed by `KeyboardEvent.code`),
// read reactively by that key's own `<kbd>` background/shadow/transform so
// each press/release is a pure CSS transition — no per-frame loop needed.
// Wide keys (space, shift, return, tab, caps lock, command) reuse the same
// key renderer with a larger `flex-grow` weight, so the whole board is one
// flexbox layout (rows in a column, keys in a row) rather than hand-placed
// pixel coordinates; the Mac arrow cluster's stacked up/down pair is just
// two more key renderers inside a column flex sub-container occupying one
// row slot.
//
// Real `document`-level `keydown`/`keyup` listeners are gated by an
// `IntersectionObserver` on the outer wrapper — attached only while the
// board is scrolled into view, and fully detached (with every key state
// reset) once it scrolls out — so this never hijacks typing elsewhere on
// the page, matching this package's other visibility-gated loops
// (`dottedGlowBackground`, `hyperText`'s view-trigger).
//
// Every on-screen key reuses `@domphy/ui`'s `keyboard()` primitive patch
// (host tag `<kbd>`) for its base keystroke-hint styling — background,
// border, radius, themed text — and layers the flex sizing/raised-shadow/
// press-transform on top via `style`, which deep-merges over the patch's
// own style object.
//
// The optional click sound has no bundled audio asset: by default it
// synthesizes a short filtered noise burst via the Web Audio API (a
// self-contained "thock", no network fetch); passing `soundSrc` instead
// plays a real sample through a pooled `<audio>` element (`cloneNode` per
// hit so rapid keystrokes can overlap).

import type { DomphyElement, ElementNode, Listener, State, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { keyboard as keyboardKeyPatch } from "@domphy/ui";
import { themeColor, themeDensity, themeSize, themeSpacing } from "@domphy/theme";

export interface KeyboardShowcaseResponsiveScale {
  /** Scale factor from `640px` viewport width upward. */
  sm?: number;
  /** Scale factor from `768px` viewport width upward. */
  md?: number;
  /** Scale factor from `1024px` viewport width upward. */
  lg?: number;
}

export interface KeyboardShowcaseProps {
  /** Shows the floating "last keys typed" strip above the board. Defaults to `true`. */
  showPreview?: boolean;
  /** Plays a click sound on every mapped keydown. Defaults to `false`. */
  playSound?: boolean;
  /** Sample audio file to play instead of the built-in synthesized click. Only used when `playSound` is `true`. */
  soundSrc?: string;
  /** Uniform CSS `scale()` factor applied to the whole board. Defaults to `1`. */
  scale?: number;
  /** Per-breakpoint scale overrides (min-width media queries), applied on top of `scale`. */
  responsiveScale?: KeyboardShowcaseResponsiveScale;
  /** Passthrough style merged onto the outer wrapper. */
  style?: StyleObject;
}

interface KeySpec {
  /** Glyph(s) shown on the keycap. Empty string for the blank space bar. */
  label: string;
  /** `KeyboardEvent.code` this on-screen key mirrors. */
  code: string;
  /** Flex-grow weight relative to a standard 1-unit key. Defaults to `1`. */
  width?: number;
}

function letterRow(letters: string): KeySpec[] {
  return Array.from(letters).map((letter) => ({ label: letter, code: `Key${letter}` }));
}

function digitRow(): KeySpec[] {
  return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((digit) => ({
    label: digit,
    code: `Digit${digit}`,
  }));
}

function functionKeyRow(): KeySpec[] {
  const row: KeySpec[] = [{ label: "esc", code: "Escape", width: 1.2 }];
  for (let index = 1; index <= 12; index += 1) {
    // F10/F11/F12's 3-character label needs a touch more room than the
    // single-digit F1..F9 to avoid clipping at this row's per-key width.
    row.push({ label: `F${index}`, code: `F${index}`, width: index >= 10 ? 1.4 : 1 });
  }
  return row;
}

const UPPER_ROWS: KeySpec[][] = [
  functionKeyRow(),
  [
    { label: "`", code: "Backquote" },
    ...digitRow(),
    { label: "-", code: "Minus" },
    { label: "=", code: "Equal" },
    { label: "delete", code: "Backspace", width: 3.4 },
  ],
  [
    { label: "tab", code: "Tab", width: 2 },
    ...letterRow("QWERTYUIOP"),
    { label: "[", code: "BracketLeft" },
    { label: "]", code: "BracketRight" },
    { label: "\\", code: "Backslash", width: 1.5 },
  ],
  [
    { label: "caps lock", code: "CapsLock", width: 5.4 },
    ...letterRow("ASDFGHJKL"),
    { label: ";", code: "Semicolon" },
    { label: "'", code: "Quote" },
    { label: "return", code: "Enter", width: 3.5 },
  ],
  [
    { label: "shift", code: "ShiftLeft", width: 2.6 },
    ...letterRow("ZXCVBNM"),
    { label: ",", code: "Comma" },
    { label: ".", code: "Period" },
    { label: "/", code: "Slash" },
    { label: "shift", code: "ShiftRight", width: 3 },
  ],
];

const BOTTOM_ROW_LEFT: KeySpec[] = [
  // Real hardware fn keys are firmware-intercepted on most OSes/browsers and
  // never dispatch a DOM `keydown` — this cap never lights up. See
  // fidelityNotes below; it's still drawn for visual completeness.
  { label: "fn", code: "Fn" },
  { label: "control", code: "ControlLeft", width: 3.7 },
  { label: "option", code: "AltLeft", width: 3.1 },
  { label: "command", code: "MetaLeft", width: 3.8 },
];
const SPACE_KEY: KeySpec = { label: "", code: "Space", width: 6 };
const BOTTOM_ROW_RIGHT: KeySpec[] = [
  { label: "command", code: "MetaRight", width: 3.8 },
  { label: "option", code: "AltRight", width: 3.1 },
];
const ARROW_KEYS = {
  left: { label: "←", code: "ArrowLeft" } as KeySpec,
  up: { label: "↑", code: "ArrowUp" } as KeySpec,
  down: { label: "↓", code: "ArrowDown" } as KeySpec,
  right: { label: "→", code: "ArrowRight" } as KeySpec,
};

const RESPONSIVE_BREAKPOINTS: Array<{ minWidth: number; key: keyof KeyboardShowcaseResponsiveScale }> = [
  { minWidth: 640, key: "sm" },
  { minWidth: 768, key: "md" },
  { minWidth: 1024, key: "lg" },
];

// Wide word labels ("delete", "control", "command", …) and the arrow glyphs
// (single characters, but visually wide at full size) need a smaller face
// than plain single-character keys (letters/digits/punctuation) to fit their
// `flex`-computed key width without clipping — matching the reference's own
// noticeably-smaller lettering on these keys, not just an arbitrary shrink.
const ARROW_LABELS = new Set(["←", "↑", "↓", "→"]);

function isCompactLabel(label: string): boolean {
  return label.length !== 1 || ARROW_LABELS.has(label);
}

function renderKey(spec: KeySpec, pressedState: State<boolean>): DomphyElement<"kbd"> {
  const compact = isCompactLabel(spec.label);
  return {
    kbd: spec.label,
    _key: `key-${spec.code}`,
    ariaHidden: "true",
    $: [keyboardKeyPatch({ color: "neutral" })],
    style: {
      flex: `${spec.width ?? 1} 0 0`,
      minWidth: 0,
      display: "flex",
      alignItems: "center",
      // `flex-start` (not `center`) for word/glyph labels: with `overflow:
      // hidden` on a `justify-content: center` flex box, this engine paints
      // centered content that's wider than the box past both edges instead
      // of clipping it (an "unsafe centering" overflow quirk) — verified by
      // toggling justify-content on a live long-label key and watching the
      // overflow disappear only with `flex-start`. Single-character keys
      // never overflow their box, so they keep `center` for the balanced
      // look the reference uses.
      justifyContent: compact ? "flex-start" : "center",
      textAlign: "center",
      userSelect: "none",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      fontSize: (listener: Listener) => themeSize(listener, compact ? "decrease-2" : "inherit"),
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 1),
      backgroundColor: (listener: Listener) =>
        themeColor(listener, pressedState.get(listener) ? "increase-1" : "inherit", "neutral"),
      color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
      boxShadow: (listener: Listener) =>
        pressedState.get(listener)
          ? `inset 0 0 0 ${themeColor(listener, "shift-4")}`
          : `0 ${themeSpacing(1)} 0 ${themeColor(listener, "shift-5")}, 0 ${themeSpacing(1.5)} ${themeSpacing(2)} ${themeColor(listener, "shift-3")}`,
      transform: (listener: Listener) =>
        pressedState.get(listener) ? `translateY(${themeSpacing(1)})` : "translateY(0)",
      transition: "transform 110ms ease-out, box-shadow 110ms ease-out, background-color 110ms ease-out",
    } as StyleObject,
  } as DomphyElement<"kbd">;
}

function renderArrowCluster(pressedStates: Map<string, State<boolean>>): DomphyElement<"div"> {
  return {
    div: [
      renderKey(ARROW_KEYS.left, pressedStates.get(ARROW_KEYS.left.code)!),
      {
        div: [
          renderKey(ARROW_KEYS.up, pressedStates.get(ARROW_KEYS.up.code)!),
          renderKey(ARROW_KEYS.down, pressedStates.get(ARROW_KEYS.down.code)!),
        ],
        _key: "arrow-updown-stack",
        style: {
          display: "flex",
          flexDirection: "column",
          gap: themeSpacing(0.5),
          flex: "1.8 0 0",
          minWidth: 0,
        } as StyleObject,
      } as DomphyElement<"div">,
      renderKey(ARROW_KEYS.right, pressedStates.get(ARROW_KEYS.right.code)!),
    ],
    _key: "arrow-cluster",
    // More than the "3.8 units" a literal sum of its 3 slots (left=1,
    // up-down-stack=1.8, right=1) would suggest — the arrow glyphs render
    // wider than a letter at the same font-size, so a bare 1:1 share clipped
    // them against their neighbors.
    style: { display: "flex", gap: themeSpacing(0.5), flex: "4.4 0 0", minWidth: 0 } as StyleObject,
  } as DomphyElement<"div">;
}

/** Synthesizes a short filtered-noise "mechanical click" via the Web Audio API, or plays a supplied sample. */
function createClickPlayer(soundSrc: string | undefined): () => void {
  if (typeof window === "undefined") return () => {};

  let sampleAudio: HTMLAudioElement | null = null;
  if (soundSrc) {
    try {
      sampleAudio = new Audio(soundSrc);
      sampleAudio.preload = "auto";
    } catch {
      sampleAudio = null;
    }
  }

  let audioContext: AudioContext | null = null;

  return () => {
    if (sampleAudio) {
      try {
        const instance = sampleAudio.cloneNode(true) as HTMLAudioElement;
        instance.volume = 0.5;
        void instance.play().catch(() => {});
      } catch {
        // Playback blocked by autoplay policy or the sample failed to load — skip silently.
      }
      return;
    }

    try {
      const AudioContextConstructor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return;
      if (!audioContext) audioContext = new AudioContextConstructor();
      const context = audioContext;

      const durationSeconds = 0.045;
      const bufferSize = Math.max(1, Math.floor(context.sampleRate * durationSeconds));
      const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < bufferSize; index += 1) {
        data[index] = (Math.random() * 2 - 1) * (1 - index / bufferSize);
      }

      const noiseSource = context.createBufferSource();
      noiseSource.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1800;
      const gainNode = context.createGain();
      gainNode.gain.value = 0.25;
      noiseSource.connect(filter).connect(gainNode).connect(context.destination);
      noiseSource.start();
    } catch {
      // Web Audio unavailable or blocked — skip silently.
    }
  };
}

let keyboardShowcaseInstanceCounter = 0;

/**
 * A skeuomorphic on-screen Mac-style keyboard that lights up each key as the
 * visitor types on their real keyboard (only while scrolled into view), with
 * an optional floating keystroke preview and click sound. Call with no
 * arguments for a working demo.
 */
function keyboard(props: KeyboardShowcaseProps = {}): DomphyElement<"div"> {
  const instanceId = ++keyboardShowcaseInstanceCounter;
  const showPreview = props.showPreview ?? true;
  const playSound = props.playSound ?? false;
  const scale = props.scale ?? 1;
  const responsiveScale = props.responsiveScale ?? {};

  const pressedStates = new Map<string, State<boolean>>();
  const codeToLabel = new Map<string, string>();
  const registerKey = (spec: KeySpec) => {
    pressedStates.set(spec.code, toState(false, `keyboard-${instanceId}-${spec.code}`));
    codeToLabel.set(spec.code, spec.label || "space");
  };
  for (const row of UPPER_ROWS) for (const spec of row) registerKey(spec);
  for (const spec of BOTTOM_ROW_LEFT) registerKey(spec);
  registerKey(SPACE_KEY);
  for (const spec of BOTTOM_ROW_RIGHT) registerKey(spec);
  for (const spec of Object.values(ARROW_KEYS)) registerKey(spec);

  const previewText = toState("", `keyboard-preview-text-${instanceId}`);
  const previewVisible = toState(false, `keyboard-preview-visible-${instanceId}`);

  const playClick = playSound ? createClickPlayer(props.soundSrc) : null;

  const bottomRow: DomphyElement<"div"> = {
    div: [
      ...BOTTOM_ROW_LEFT.map((spec) => renderKey(spec, pressedStates.get(spec.code)!)),
      renderKey(SPACE_KEY, pressedStates.get(SPACE_KEY.code)!),
      ...BOTTOM_ROW_RIGHT.map((spec) => renderKey(spec, pressedStates.get(spec.code)!)),
      renderArrowCluster(pressedStates),
    ],
    _key: "row-bottom",
    style: { display: "flex", gap: themeSpacing(1), width: "100%" } as StyleObject,
  } as DomphyElement<"div">;

  const rows: DomphyElement<"div">[] = [
    ...UPPER_ROWS.map(
      (row, rowIndex) =>
        ({
          div: row.map((spec) => renderKey(spec, pressedStates.get(spec.code)!)),
          _key: `row-${rowIndex}`,
          style: { display: "flex", gap: themeSpacing(1), width: "100%" } as StyleObject,
        }) as DomphyElement<"div">,
    ),
    bottomRow,
  ];

  const responsiveScaleStyle: StyleObject = {};
  for (const breakpoint of RESPONSIVE_BREAKPOINTS) {
    const breakpointScale = responsiveScale[breakpoint.key];
    if (breakpointScale === undefined) continue;
    (responsiveScaleStyle as Record<string, unknown>)[`@media (min-width: ${breakpoint.minWidth}px)`] = {
      transform: `scale(${breakpointScale})`,
      transformOrigin: "top center",
    };
  }

  const trayElement: DomphyElement<"div"> = {
    div: rows,
    dataTone: "shift-1",
    style: {
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(1),
      padding: themeSpacing(4),
      borderRadius: themeSpacing(4),
      marginTop: themeSpacing(14),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      boxShadow: (listener: Listener) => `0 ${themeSpacing(3)} ${themeSpacing(8)} ${themeColor(listener, "shift-3")}`,
      transform: `scale(${scale})`,
      transformOrigin: "top center",
      ...responsiveScaleStyle,
    } as StyleObject,
  } as DomphyElement<"div">;

  const previewLabelElement: DomphyElement<"div"> = {
    div: [
      {
        kbd: (listener: Listener) => previewText.get(listener) || " ",
        $: [keyboardKeyPatch({ color: "primary" })],
        style: { minWidth: themeSpacing(10), textAlign: "center" } as StyleObject,
      } as DomphyElement<"kbd">,
    ],
    ariaHidden: "true",
    style: {
      position: "absolute",
      top: 0,
      left: "50%",
      transform: (listener: Listener) =>
        previewVisible.get(listener) ? "translate(-50%, 0)" : `translate(-50%, ${themeSpacing(-1.5)})`,
      opacity: (listener: Listener) => (previewVisible.get(listener) ? 1 : 0),
      transition: "opacity 180ms ease-out, transform 180ms ease-out",
      pointerEvents: "none",
    } as StyleObject,
  } as DomphyElement<"div">;

  const wrapperChildren: DomphyElement[] = [];
  if (showPreview) wrapperChildren.push(previewLabelElement);
  wrapperChildren.push(trayElement);

  return {
    div: wrapperChildren,
    ariaHidden: "true",
    style: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      width: "100%",
      maxWidth: themeSpacing(220),
      marginInline: "auto",
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const wrapperElement = node.domElement as HTMLElement | null;
      if (!wrapperElement) return;

      let documentListenersAttached = false;
      let previewHideTimeoutId: ReturnType<typeof setTimeout> | null = null;
      let recentCharacters: string[] = [];

      const resetAllPressedStates = () => {
        for (const state of pressedStates.values()) state.set(false);
      };

      const pushPreviewCharacter = (displayName: string) => {
        recentCharacters.push(displayName === "space" ? "␣" : displayName);
        if (recentCharacters.length > 18) recentCharacters.shift();
        previewText.set(recentCharacters.join(""));
        previewVisible.set(true);
        if (previewHideTimeoutId !== null) clearTimeout(previewHideTimeoutId);
        previewHideTimeoutId = setTimeout(() => {
          previewVisible.set(false);
          recentCharacters = [];
        }, 1500);
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        const pressedState = pressedStates.get(event.code);
        if (!pressedState) return;
        if (!pressedState.get()) {
          playClick?.();
          if (showPreview) pushPreviewCharacter(codeToLabel.get(event.code) ?? "");
        }
        pressedState.set(true);
      };
      const handleKeyUp = (event: KeyboardEvent) => {
        pressedStates.get(event.code)?.set(false);
      };

      const attachDocumentListeners = () => {
        if (documentListenersAttached) return;
        documentListenersAttached = true;
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("keyup", handleKeyUp);
      };
      const detachDocumentListeners = () => {
        if (!documentListenersAttached) return;
        documentListenersAttached = false;
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("keyup", handleKeyUp);
        resetAllPressedStates();
      };

      let intersectionObserver: IntersectionObserver | null = null;
      if (typeof IntersectionObserver === "function") {
        intersectionObserver = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) attachDocumentListeners();
              else detachDocumentListeners();
            }
          },
          { threshold: 0.2 },
        );
        intersectionObserver.observe(wrapperElement);
      } else {
        attachDocumentListeners();
      }

      node.addHook("Remove", () => {
        intersectionObserver?.disconnect();
        detachDocumentListeners();
        if (previewHideTimeoutId !== null) clearTimeout(previewHideTimeoutId);
      });
    },
  } as DomphyElement<"div">;
}

export { keyboard };
