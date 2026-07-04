// Aceternity UI "Macbook Scroll" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// laptop shell built entirely from Domphy elements (lid/bezel, keyboard,
// trackpad, sticker) whose screen shows a supplied image; the lid opens and
// the screen image scales up past its own bezel as the page scrolls through
// a tall wrapper, simulating the screen content "bursting free" of the
// device.
//
// Same `position: sticky` pinned-range idiom `textReveal()` uses: a tall
// outer wrapper defines the scroll room, an inner `position: sticky` stage
// stays pinned to the viewport for that whole range, and scroll progress
// (0 at pin-start, 1 at pin-release) is computed from the OUTER wrapper's
// `getBoundingClientRect()` against `window.innerHeight`. That single 0–1
// value is split into two sequential (non-overlapping) phases exactly per
// spec: the first half rotates the lid from a reclined/closed angle to a
// slightly-reclined "open" angle (`rotateX`, hinged at the lid's bottom
// edge via `transform-origin`), the second half scales the screen image up
// from 1x past the bezel's own edges (the bezel/lid stay `overflow:
// visible` so the enlarged image can visibly bleed out over the frame).
// Both phases are rAF-lerped toward their raw scroll target (the same
// smoothing idiom `scrollProgress`/`textReveal` use) and written directly
// to the DOM refs captured in `_onMount`, not routed through reactive
// `State` — this runs every scroll frame and the shell has dozens of static
// child nodes (keyboard keys), so a single imperative paint is cheaper than
// re-running many reactive style functions per tick.
//
// The keyboard and trackpad are NOT decorative flourishes — every key is
// its own small static element in a literal row layout (function row,
// number row, three letter rows, bottom modifier row), matching the
// reference's "authentic detail via many small DOM nodes" technique. Keys
// do not animate individually.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { heading, small, strong } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";

export interface MacbookScrollProps {
  /** Screen content image. Defaults to a generated placeholder screenshot. */
  image?: string;
  /** Accessible label for the screen image. Defaults to `"App screen preview"`. */
  imageAlt?: string;
  /** Heading rendered above the device. Defaults to a short demo line. Pass `null` to omit it. */
  title?: string | DomphyElement | null;
  /** Sticker rendered near the base's bottom-left corner. Defaults to a small "D" logo mark. Pass `null` to omit it. */
  badge?: DomphyElement | null;
  /** Toggles a soft radial gradient backdrop behind the whole scene. Defaults to `true`. */
  showGradient?: boolean;
  /** How tall the scroll wrapper is, in viewport-height units — more height means a slower-feeling
   * open/scale sequence for the same scroll distance. Defaults to `280`, clamped to a minimum of `160`. */
  wrapperHeightVh?: number;
  /** Passthrough style merged onto the outer scroll wrapper. */
  style?: StyleObject;
}

// Lid hinge angle, in degrees, at scroll progress 0 (closed/reclined, mostly
// hidden from the viewer) and at the end of phase 1 (open, angled slightly
// back like a laptop in normal use — matching real hinge travel rather than
// a full 90°).
const LID_CLOSED_ROTATE_X_DEGREES = -90;
const LID_OPEN_ROTATE_X_DEGREES = -8;

// Screen-image scale at the start and end of phase 2.
const SCREEN_SCALE_MIN = 1;
const SCREEN_SCALE_MAX = 1.55;

// Fraction of the overall 0–1 scroll progress where phase 1 (lid opening) ends
// and phase 2 (screen scaling) begins.
const PHASE_SPLIT = 0.5;

interface KeyboardKey {
  label: string;
  grow: number;
}

// Row-by-row QWERTY layout. `grow` is a relative flex-grow weight — wider
// keys (space, shift, tab, return, modifiers) get a larger share of the row.
const KEYBOARD_ROWS: KeyboardKey[][] = [
  ["esc", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12"].map((label) => ({ label, grow: 1 })),
  ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "delete"].map((label) => ({
    label,
    grow: label === "delete" ? 1.6 : 1,
  })),
  ["tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"].map((label) => ({
    label,
    grow: label === "tab" ? 1.5 : 1,
  })),
  ["caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "return"].map((label) => ({
    label,
    grow: label === "caps" || label === "return" ? 1.7 : 1,
  })),
  ["shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "shift"].map((label) => ({
    label,
    grow: label === "shift" ? 2.1 : 1,
  })),
  [
    { label: "fn", grow: 1 },
    { label: "control", grow: 1.3 },
    { label: "option", grow: 1.3 },
    { label: "command", grow: 1.6 },
    { label: "", grow: 6 },
    { label: "command", grow: 1.6 },
    { label: "option", grow: 1.3 },
    { label: "◀", grow: 1 },
    { label: "▲▼", grow: 1 },
    { label: "▶", grow: 1 },
  ],
];

function clampToUnitRange(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Pinned-range progress: 0 when the wrapper's top reaches the viewport top
 * (the sticky stage begins pinning), 1 when its bottom reaches the viewport
 * bottom (the stage is about to release) — same math `textReveal()` uses. */
function computePinnedProgress(wrapperElement: HTMLElement): number {
  const rect = wrapperElement.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const scrollableDistance = rect.height - viewportHeight;
  const raw = scrollableDistance > 0 ? -rect.top / scrollableDistance : rect.top <= 0 ? 1 : 0;
  return clampToUnitRange(raw);
}

function keyElement(key: KeyboardKey, rowIndex: number, keyIndex: number): DomphyElement<"div"> {
  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert,
  // so the excess-property check the function's declared return type would
  // otherwise apply doesn't fire (mirrors `scrollProgress.ts`/`warpBackground.ts`).
  return {
    div: key.label ? [{ small: key.label, $: [small({ color: "neutral" })] } as DomphyElement] : [],
    _key: `macbook-key-${rowIndex}-${keyIndex}`,
    // A keycap is a fixed device-material color, not a surface that should
    // track the host page's ambient dataTone context — a dark-mode toggle on
    // the surrounding page shouldn't turn this illustrated MacBook's keys
    // black. Same reasoning as `lampEffect.ts`'s glow blobs/bar.
    _doctorDisable: "tone-background-inherit",
    style: {
      flexGrow: key.grow,
      flexBasis: 0,
      minWidth: 0,
      height: themeSpacing(6),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: themeSpacing(1),
      backgroundColor: (listener: Listener) => themeColor(listener, "shift-4"),
      color: (listener: Listener) => themeColor(listener, "shift-13"),
    } as StyleObject,
  } as DomphyElement<"div">;
}

function keyboardRow(row: KeyboardKey[], rowIndex: number): DomphyElement<"div"> {
  return {
    div: row.map((key, keyIndex) => keyElement(key, rowIndex, keyIndex)),
    _key: `macbook-row-${rowIndex}`,
    style: { display: "flex", gap: themeSpacing(0.5) } as StyleObject,
  };
}

function defaultBadge(): DomphyElement<"div"> {
  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert
  // (mirrors `keyElement` above).
  return {
    div: [{ strong: "D", $: [strong({ color: "neutral" })] } as DomphyElement],
    ariaHidden: "true",
    // A brand sticker's color is a fixed accent, not a surface that should
    // track the ambient page dataTone context. Same reasoning as
    // `lampEffect.ts`'s glow blobs/bar.
    _doctorDisable: "tone-background-inherit",
    style: {
      position: "absolute",
      insetBlockEnd: themeSpacing(3),
      insetInlineStart: themeSpacing(4),
      width: themeSpacing(6),
      height: themeSpacing(6),
      borderRadius: themeSpacing(1.5),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: (listener: Listener) => themeColor(listener, "shift-9", "primary"),
      color: (listener: Listener) => themeColor(listener, "shift-0", "primary"),
    } as StyleObject,
  } as DomphyElement<"div">;
}

interface MacbookRuntime {
  lidElement: HTMLElement | null;
  screenElement: HTMLElement | null;
  chromeElement: HTMLElement | null;
}

/**
 * A scroll-driven MacBook shell (lid, keyboard, trackpad, sticker) whose
 * screen image opens and scales up past the bezel as the page scrolls
 * through a tall wrapper — purely scroll-driven, no click required. Call
 * with no arguments for a working demo (placeholder screenshot, default
 * heading and sticker).
 */
/** Self-contained (no network fetch) mock app-screenshot placeholder — a dark browser
 * chrome bar (traffic-light dots), a heading/text block, and 3 card tiles — used as the
 * `image` default so the demo doesn't depend on a third-party photo service. Real
 * consumers should still pass their own `image`. */
function defaultScreenImage(): string {
  const markup =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 750">' +
    '<rect width="1200" height="750" fill="#0f172a"/>' +
    '<rect x="0" y="0" width="1200" height="64" fill="#1e293b"/>' +
    '<circle cx="36" cy="32" r="10" fill="#f87171"/>' +
    '<circle cx="66" cy="32" r="10" fill="#fbbf24"/>' +
    '<circle cx="96" cy="32" r="10" fill="#34d399"/>' +
    '<rect x="140" y="110" width="460" height="28" rx="6" fill="#e2e8f0"/>' +
    '<rect x="140" y="160" width="700" height="16" rx="4" fill="#94a3b8"/>' +
    '<rect x="140" y="188" width="620" height="16" rx="4" fill="#94a3b8"/>' +
    '<rect x="140" y="240" width="220" height="180" rx="12" fill="#334155"/>' +
    '<rect x="390" y="240" width="220" height="180" rx="12" fill="#334155"/>' +
    '<rect x="640" y="240" width="220" height="180" rx="12" fill="#334155"/>' +
    "</svg>";
  return `data:image/svg+xml,${encodeURIComponent(markup)}`;
}

function macbookScroll(props: MacbookScrollProps = {}): DomphyElement<"div"> {
  const image = props.image ?? defaultScreenImage();
  const imageAlt = props.imageAlt ?? "App screen preview";
  const showGradient = props.showGradient ?? true;
  const wrapperHeightVh = Math.max(160, Math.round(props.wrapperHeightVh ?? 280));

  const titleNode: DomphyElement | null =
    props.title === null
      ? null
      : props.title && typeof props.title !== "string"
        ? props.title
        : ({ h2: props.title ?? "Scroll to open. Scroll to zoom.", $: [heading()] } as DomphyElement);

  const badgeNode = props.badge === null ? null : (props.badge ?? defaultBadge());

  const runtime: MacbookRuntime = { lidElement: null, screenElement: null, chromeElement: null };

  function paint(progress: number): void {
    const rotationProgress = clampToUnitRange(progress / PHASE_SPLIT);
    const scaleProgress = clampToUnitRange((progress - PHASE_SPLIT) / (1 - PHASE_SPLIT));

    const rotateXDegrees = LID_CLOSED_ROTATE_X_DEGREES + (LID_OPEN_ROTATE_X_DEGREES - LID_CLOSED_ROTATE_X_DEGREES) * rotationProgress;
    if (runtime.lidElement) runtime.lidElement.style.transform = `rotateX(${rotateXDegrees.toFixed(2)}deg)`;

    const screenScale = SCREEN_SCALE_MIN + (SCREEN_SCALE_MAX - SCREEN_SCALE_MIN) * scaleProgress;
    if (runtime.screenElement) runtime.screenElement.style.transform = `scale(${screenScale.toFixed(3)})`;

    if (runtime.chromeElement) {
      const chromeLift = -6 * scaleProgress;
      runtime.chromeElement.style.transform = `translateY(${chromeLift.toFixed(1)}px)`;
      runtime.chromeElement.style.opacity = `${(1 - 0.12 * scaleProgress).toFixed(3)}`;
    }
  }

  const bezel: DomphyElement<"div"> = {
    div: [
      {
        span: null,
        ariaHidden: "true",
        // A purely decorative camera-notch pill with no text of its own —
        // exempt from the missing-color contract (same idiom as this
        // package's other bare decorative shapes, e.g. `warpBackground`'s
        // grid lines). Its fill is also a fixed device-material shade, not a
        // surface that should track the ambient page dataTone context (same
        // reasoning as `lampEffect.ts`'s glow blobs/bar).
        _doctorDisable: ["missing-color", "tone-background-inherit"],
        style: {
          position: "absolute",
          insetBlockStart: themeSpacing(1),
          insetInlineStart: "50%",
          transform: "translateX(-50%)",
          width: themeSpacing(6),
          height: themeSpacing(1.2),
          borderRadius: themeSpacing(999),
          backgroundColor: (listener: Listener) => themeColor(listener, "shift-13"),
        } as StyleObject,
      } as DomphyElement,
      {
        img: null,
        src: image,
        alt: imageAlt,
        _doctorDisable: "missing-color",
        _onMount: (node: ElementNode) => {
          runtime.screenElement = node.domElement as HTMLElement;
        },
        _onRemove: () => {
          runtime.screenElement = null;
        },
        style: {
          position: "absolute",
          inset: "4.5%",
          width: "91%",
          height: "91%",
          objectFit: "cover",
          borderRadius: themeSpacing(1),
          transformOrigin: "50% 50%",
          zIndex: 2,
        } as StyleObject,
      } as DomphyElement,
    ],
    ariaHidden: "true",
    dataTone: "shift-17",
    style: {
      position: "absolute",
      inset: 0,
      overflow: "visible",
      borderRadius: `${themeSpacing(3)} ${themeSpacing(3)} 0 0`,
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    } as StyleObject,
  };

  const lid: DomphyElement<"div"> = {
    div: [bezel],
    ariaHidden: "true",
    _onMount: (node: ElementNode) => {
      runtime.lidElement = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      runtime.lidElement = null;
    },
    style: {
      position: "relative",
      width: "100%",
      aspectRatio: "16 / 10",
      transformOrigin: "50% 100%",
      transform: `rotateX(${LID_CLOSED_ROTATE_X_DEGREES}deg)`,
      transformStyle: "preserve-3d",
    } as StyleObject,
  };

  const keyboardArea: DomphyElement<"div"> = {
    div: KEYBOARD_ROWS.map((row, index) => keyboardRow(row, index)),
    ariaHidden: "true",
    style: { display: "flex", flexDirection: "column", gap: themeSpacing(0.5), width: "94%" } as StyleObject,
  };

  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert
  // (mirrors `keyElement` above).
  const trackpad = {
    div: null,
    ariaHidden: "true",
    // The trackpad's glass color is a fixed device-material shade, not a
    // surface that should track the ambient page dataTone context. Same
    // reasoning as `lampEffect.ts`'s glow blobs/bar.
    _doctorDisable: "tone-background-inherit",
    style: {
      width: "36%",
      height: themeSpacing(14),
      borderRadius: themeSpacing(2),
      backgroundColor: (listener: Listener) => themeColor(listener, "shift-3"),
      color: (listener: Listener) => themeColor(listener, "shift-13"),
      boxShadow: (listener: Listener) => `inset 0 0 0 1px ${themeColor(listener, "shift-6")}`,
    } as StyleObject,
  } as DomphyElement<"div">;

  const base: DomphyElement<"div"> = {
    div: [
      keyboardArea,
      trackpad,
      ...(badgeNode ? [badgeNode] : []),
    ],
    ariaHidden: "true",
    dataTone: "shift-2",
    _onMount: (node: ElementNode) => {
      runtime.chromeElement = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      runtime.chromeElement = null;
    },
    style: {
      position: "relative",
      width: "100%",
      aspectRatio: "16 / 9.4",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: themeSpacing(3),
      paddingBlockStart: themeSpacing(3),
      borderRadius: `0 0 ${themeSpacing(4)} ${themeSpacing(4)}`,
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-13"),
      boxShadow: (listener: Listener) => `0 ${themeSpacing(3)} ${themeSpacing(10)} ${themeColor(listener, "shift-17")}`,
      transition: "transform 200ms ease, opacity 200ms ease",
    } as StyleObject,
  };

  const laptop: DomphyElement<"div"> = {
    div: [lid, base],
    style: {
      position: "relative",
      width: "min(92vw, 60em)",
      marginInline: "auto",
    } as StyleObject,
  };

  const gradientBackdrop: DomphyElement<"div"> | null = showGradient
    ? ({
        div: null,
        ariaHidden: "true",
        _doctorDisable: "missing-color",
        style: {
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: (listener: Listener) =>
            `radial-gradient(ellipse at 50% 30%, ${themeColor(listener, "shift-8", "primary")}, transparent 60%)`,
          opacity: 0.35,
        } as StyleObject,
      } as DomphyElement<"div">)
    : null;

  return {
    div: [
      {
        div: [
          ...(gradientBackdrop ? [gradientBackdrop] : []),
          ...(titleNode
            ? [
                {
                  div: [titleNode],
                  style: { position: "relative", zIndex: 1, textAlign: "center", marginBlockEnd: themeSpacing(8) } as StyleObject,
                } as DomphyElement<"div">,
              ]
            : []),
          {
            div: [laptop],
            style: { position: "relative", zIndex: 1, width: "100%", perspective: themeSpacing(300) } as StyleObject,
          } as DomphyElement<"div">,
        ],
        style: {
          position: "sticky",
          insetBlockStart: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        } as StyleObject,
      } as DomphyElement<"div">,
    ],
    dataTone: "shift-16",
    style: {
      position: "relative",
      minHeight: `${wrapperHeightVh}vh`,
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined" || typeof window.requestAnimationFrame !== "function") return;
      const wrapperElement = node.domElement as HTMLElement;

      let currentProgress = computePinnedProgress(wrapperElement);
      let targetProgress = currentProgress;
      let isAnimating = false;
      let animationFrameHandle = 0;

      paint(currentProgress);

      function step(): void {
        currentProgress += (targetProgress - currentProgress) * 0.18;
        if (Math.abs(targetProgress - currentProgress) < 0.001) {
          currentProgress = targetProgress;
          paint(currentProgress);
          isAnimating = false;
          return;
        }
        paint(currentProgress);
        animationFrameHandle = window.requestAnimationFrame(step);
      }

      function handleScroll(): void {
        targetProgress = computePinnedProgress(wrapperElement);
        if (!isAnimating) {
          isAnimating = true;
          animationFrameHandle = window.requestAnimationFrame(step);
        }
      }

      window.addEventListener("scroll", handleScroll, { passive: true });
      window.addEventListener("resize", handleScroll);

      node.addHook("Remove", () => {
        window.removeEventListener("scroll", handleScroll);
        window.removeEventListener("resize", handleScroll);
        if (animationFrameHandle) window.cancelAnimationFrame(animationFrameHandle);
      });
    },
  };
}

export { macbookScroll };
