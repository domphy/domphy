// magicui "HeroVideoDialog" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A large
// clickable video thumbnail with a centered play button that opens the real
// video in an animated modal above a dimmed backdrop. Built on the `dialog()`
// ui patch (native <dialog>, backdrop, focus trap, scroll lock, outside-click
// close) with an extra transform layered on top for the edge-slide/grow
// animation presets — the same technique used by the shadcn
// "sidebar-in-dialog" block's scale-in dialog.

import type { DomphyElement, ElementNode, Listener, State, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { dialog, small } from "@domphy/ui";
import { themeColor, themeSpacing } from "@domphy/theme";

export type HeroVideoAnimationStyle =
  | "from-center"
  | "from-top"
  | "from-bottom"
  | "from-left"
  | "from-right"
  | "fade"
  | "top-in-bottom-out"
  | "left-in-right-out";

export interface HeroVideoDialogProps {
  /** Thumbnail image source. When omitted, a themed placeholder panel is rendered instead. */
  thumbnailSrc?: string;
  /** Alt text for the thumbnail / accessible label for the play control. */
  thumbnailAlt?: string;
  /** Embeddable video URL (e.g. a YouTube/Vimeo embed URL). Loaded into an <iframe> only while open. */
  videoSrc?: string;
  /** Entrance/exit animation preset. Defaults to "from-center" (grow from center). */
  animationStyle?: HeroVideoAnimationStyle;
  /** Passthrough style merged onto the outer thumbnail wrapper. */
  style?: StyleObject;
}

// Offsets match upstream: edge slides start a full 100% of the dialog's own
// size off-screen (a dramatic slide-in, not a small nudge), and "from-center"
// grows from scale(0.5) rather than a barely-perceptible 0.92.
const ANIMATION_TRANSFORMS: Record<HeroVideoAnimationStyle, { enterFrom: string; exitTo: string }> = {
  "from-center": { enterFrom: "scale(0.5)", exitTo: "scale(0.5)" },
  "from-top": { enterFrom: "translateY(-100%)", exitTo: "translateY(-100%)" },
  "from-bottom": { enterFrom: "translateY(100%)", exitTo: "translateY(100%)" },
  "from-left": { enterFrom: "translateX(-100%)", exitTo: "translateX(-100%)" },
  "from-right": { enterFrom: "translateX(100%)", exitTo: "translateX(100%)" },
  fade: { enterFrom: "none", exitTo: "none" },
  "top-in-bottom-out": { enterFrom: "translateY(-100%)", exitTo: "translateY(100%)" },
  "left-in-right-out": { enterFrom: "translateX(-100%)", exitTo: "translateX(100%)" },
};

function playGlyph(): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [{ polygon: null, points: "9,6 20,12 9,18" }],
        viewBox: "0 0 24 24",
        fill: "currentColor",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    ariaHidden: "true",
    style: {
      display: "inline-flex",
      width: themeSpacing(6),
      height: themeSpacing(6),
      // Optical centering — a triangle's visual weight sits left of its bounding box.
      marginInlineStart: themeSpacing(0.5),
    },
  };
}

function closeGlyph(): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [
          { line: null, x1: "6", y1: "6", x2: "18", y2: "18" },
          { line: null, x1: "18", y1: "6", x2: "6", y2: "18" },
        ],
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        strokeLinecap: "round",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    ariaHidden: "true",
    style: { display: "inline-flex", width: themeSpacing(4), height: themeSpacing(4) },
  };
}

function placeholderThumbnail(alt: string): DomphyElement<"div"> {
  return {
    div: [{ small: alt, $: [small()] }],
    ariaHidden: "true",
    dataTone: "shift-2",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      aspectRatio: "16 / 9",
      borderRadius: themeSpacing(4),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    },
  };
}

/** Soft pulsing glow ring rendered behind the play button — decorative, no text of its own. */
function pulseRing(): DomphyElement<"div"> {
  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors verticalDivider() in the
  // shadcn sidebar family).
  const element = {
    div: null,
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      borderRadius: "50%",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      opacity: 0.5,
      animation: "domphy-hero-video-pulse 2.2s ease-out infinite",
      "@keyframes domphy-hero-video-pulse": {
        "0%": { transform: "scale(1)", opacity: 0.45 },
        "100%": { transform: "scale(1.6)", opacity: 0 },
      },
    },
  };
  return element as DomphyElement<"div">;
}

/** Circular play button centered over the thumbnail, with a soft pulsing glow ring. */
function playButton(open: State<boolean>, label: string): DomphyElement<"div"> {
  const activate = () => open.set(true);
  return {
    div: [pulseRing(), playGlyph()],
    role: "button",
    tabindex: 0,
    ariaLabel: label,
    onClick: activate,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    },
    dataTone: "shift-0",
    style: {
      position: "absolute",
      inset: 0,
      margin: "auto",
      width: themeSpacing(18),
      height: themeSpacing(18),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "50%",
      cursor: "pointer",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      boxShadow: (listener: Listener) => `0 ${themeSpacing(2)} ${themeSpacing(10)} ${themeColor(listener, "shift-4", "neutral")}`,
      transition: "transform 150ms ease",
      "&:hover": { transform: "scale(1.06)" },
    },
  };
}

/**
 * Large clickable video thumbnail that opens the real video in an animated
 * modal above a dimmed backdrop. Call with no arguments for a working demo
 * (placeholder thumbnail, "from-center" grow animation).
 */
function heroVideoDialog(props: HeroVideoDialogProps = {}): DomphyElement<"div"> {
  const thumbnailAlt = props.thumbnailAlt ?? "Product preview";
  // Caller-supplied embeddable video URL expected (e.g. a YouTube/Vimeo embed
  // link) — defaults to a harmless blank frame so the demo's dialog mechanics
  // still work with zero configuration.
  const videoSrc = props.videoSrc ?? "about:blank";
  const animationStyle = props.animationStyle ?? "from-center";
  const transforms = ANIMATION_TRANSFORMS[animationStyle];
  const open = toState(false);

  const thumbnail: DomphyElement = props.thumbnailSrc
    ? {
        img: null,
        src: props.thumbnailSrc,
        alt: thumbnailAlt,
        style: {
          width: "100%",
          display: "block",
          borderRadius: themeSpacing(4),
          aspectRatio: "16 / 9",
          objectFit: "cover",
        },
      }
    : placeholderThumbnail(thumbnailAlt);

  const closeButton: DomphyElement<"button"> = {
    button: [closeGlyph()],
    ariaLabel: "Close video",
    onClick: () => open.set(false),
    dataTone: "shift-0",
    style: {
      position: "absolute",
      insetBlockStart: 0,
      insetInlineEnd: 0,
      transform: `translate(35%, -35%)`,
      width: themeSpacing(9),
      height: themeSpacing(9),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "50%",
      border: "none",
      cursor: "pointer",
      zIndex: 1,
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      boxShadow: (listener: Listener) => `0 ${themeSpacing(1)} ${themeSpacing(4)} ${themeColor(listener, "shift-4", "neutral")}`,
    },
  };

  const videoFrame: DomphyElement<"iframe"> = {
    iframe: null,
    src: (listener: Listener) => (open.get(listener) ? videoSrc : ""),
    title: thumbnailAlt,
    allow: "autoplay; encrypted-media; picture-in-picture",
    allowFullScreen: true,
    style: { width: "100%", height: "100%", display: "block", border: "none" },
  };

  const dialogElement: DomphyElement<"dialog"> = {
    dialog: [closeButton, videoFrame],
    $: [dialog({ open, color: "neutral" })],
    ariaLabel: `${thumbnailAlt} — video player`,
    dataTone: "shift-17",
    _onMount: (node: ElementNode) => {
      const element = node.domElement as HTMLElement;
      const update = (isOpen: boolean) => {
        element.style.transform = isOpen ? transforms.enterFrom : transforms.exitTo;
        if (isOpen) {
          requestAnimationFrame(() => {
            element.style.transform = "none";
          });
        }
      };
      update(open.get());
      const release = open.addListener(update);
      node.addHook("Remove", () => release());
    },
    style: {
      position: "relative",
      padding: 0,
      border: "none",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      width: "min(90vw, 60em)",
      aspectRatio: "16 / 9",
      transition: "transform 250ms ease, opacity 200ms ease",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    },
  };

  return {
    div: [
      {
        div: [thumbnail, playButton(open, `Play video: ${thumbnailAlt}`)],
        style: { position: "relative", cursor: "pointer" },
      },
      dialogElement,
    ],
    style: { position: "relative", ...(props.style ?? {}) },
  };
}

export { heroVideoDialog };
