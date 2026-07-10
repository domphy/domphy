// magicui "HeroVideoDialog" — direct-source-diffed against
// registry/magicui/hero-video-dialog.tsx (Magic UI, MIT). A large clickable
// video thumbnail with a STATIC nested double-circle play button (a frosted
// translucent-primary outer circle wrapping a primary-blue gradient inner
// button) that opens the real video in an animated modal above a dimmed
// backdrop. Built on the `dialog()` ui patch (native <dialog>, backdrop, focus
// trap, scroll lock, outside-click close) with an extra transform layered on
// top for the edge-slide/grow animation presets — the same technique used by
// the shadcn "sidebar-in-dialog" block's scale-in dialog. Hover feedback
// (thumbnail dim, overlay/button/icon scale) is driven by group-hover-style
// `&:hover [data-*]` selectors on the trigger, mirroring bentoGrid /
// interactiveHoverButton.

import type {
  DomphyElement,
  ElementNode,
  Listener,
  StyleObject,
} from "@domphy/core";
import { toState } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { dialog, small } from "@domphy/ui";

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
const ANIMATION_TRANSFORMS: Record<
  HeroVideoAnimationStyle,
  { enterFrom: string; exitTo: string }
> = {
  "from-center": { enterFrom: "scale(0.5)", exitTo: "scale(0.5)" },
  "from-top": { enterFrom: "translateY(-100%)", exitTo: "translateY(-100%)" },
  "from-bottom": { enterFrom: "translateY(100%)", exitTo: "translateY(100%)" },
  "from-left": { enterFrom: "translateX(-100%)", exitTo: "translateX(-100%)" },
  "from-right": { enterFrom: "translateX(100%)", exitTo: "translateX(100%)" },
  fade: { enterFrom: "none", exitTo: "none" },
  "top-in-bottom-out": {
    enterFrom: "translateY(-100%)",
    exitTo: "translateY(100%)",
  },
  "left-in-right-out": {
    enterFrom: "translateX(-100%)",
    exitTo: "translateX(100%)",
  },
};

/** White play triangle (upstream `size-8 fill-white text-white`) with the same
 * two-layer black depth drop-shadow. Carries `data-hvd-icon` so the trigger's
 * group-hover can scale it (upstream `group-hover:scale-105`). */
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
    dataHvdIcon: "true",
    ariaHidden: "true",
    style: {
      display: "inline-flex",
      width: themeSpacing(8),
      height: themeSpacing(8),
      // Optical centering — a triangle's visual weight sits left of its bounding box.
      marginInlineStart: themeSpacing(0.5),
      transform: "scale(1)",
      transformOrigin: "center",
      transition: "transform 200ms ease-out",
      // Upstream `fill-white text-white` — the lightest neutral tone reads as
      // white on the saturated primary-blue button (same light-on-fill idiom
      // rainbowButton / interactiveHoverButton use).
      color: (listener: Listener) => themeColor(listener, "shift-0", "neutral"),
      // Upstream inline two-layer black drop-shadow (7% / 6% alpha).
      filter: (listener: Listener) =>
        `drop-shadow(0 ${themeSpacing(1)} ${themeSpacing(0.75)} color-mix(in srgb, ${themeColor(listener, "shift-17", "neutral")} 7%, transparent)) ` +
        `drop-shadow(0 ${themeSpacing(0.5)} ${themeSpacing(0.5)} color-mix(in srgb, ${themeColor(listener, "shift-17", "neutral")} 6%, transparent))`,
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
    // Upstream lucide `XIcon` at `size-5` (20px == themeSpacing(5)).
    style: {
      display: "inline-flex",
      width: themeSpacing(5),
      height: themeSpacing(5),
    },
  };
}

function placeholderThumbnail(alt: string): DomphyElement<"div"> {
  return {
    div: [{ small: alt, $: [small()] }],
    dataHvdThumb: "true",
    ariaHidden: "true",
    dataTone: "shift-2",
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      aspectRatio: "16 / 9",
      // Upstream thumbnail `rounded-md` (6px == themeSpacing(1.5)).
      borderRadius: themeSpacing(1.5),
      transition: "filter 200ms ease-out",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
    },
  };
}

/**
 * Static nested double-circle play control centered over the thumbnail
 * (upstream): a frosted translucent-primary outer circle (`bg-primary/10
 * backdrop-blur-md size-28`) wrapping a primary-blue gradient inner button
 * (`from-primary/30 to-primary bg-linear-to-b shadow-md size-20`) with the
 * white play glyph. The overlay, inner button, and glyph carry `data-hvd-*`
 * hooks for the trigger's group-hover scale feedback.
 */
function playButton(): DomphyElement<"div"> {
  // `_doctorDisable`d for `missing-color` (decorative, no text) and
  // `tone-background-inherit` (intentionally a fixed primary tint / gradient,
  // not a surface tracking the ambient dataTone) — the same exemption
  // meteors / interactiveHoverButton's accent fills take.
  const innerButton = {
    div: [playGlyph()],
    dataHvdInner: "true",
    ariaHidden: "true",
    _doctorDisable: ["missing-color", "tone-background-inherit"],
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: themeSpacing(20),
      height: themeSpacing(20),
      borderRadius: "50%",
      transform: "scale(1)",
      transformOrigin: "center",
      transition: "transform 200ms ease-out",
      // `bg-linear-to-b from-primary/30 to-primary`.
      backgroundImage: (listener: Listener) =>
        `linear-gradient(to bottom, color-mix(in srgb, ${themeColor(listener, "shift-9", "primary")} 30%, transparent), ${themeColor(listener, "shift-9", "primary")})`,
      // `shadow-md`.
      boxShadow: (listener: Listener) =>
        `0 ${themeSpacing(1)} ${themeSpacing(2)} ${themeColor(listener, "shift-4", "neutral")}`,
    } as StyleObject,
  } as DomphyElement<"div">;

  const frostCircle = {
    div: [innerButton],
    ariaHidden: "true",
    _doctorDisable: ["missing-color", "tone-background-inherit"],
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: themeSpacing(28),
      height: themeSpacing(28),
      borderRadius: "50%",
      // `backdrop-blur-md` (12px == themeSpacing(3)).
      backdropFilter: (_listener: Listener) => `blur(${themeSpacing(3)})`,
      // `bg-primary/10`.
      backgroundColor: (listener: Listener) =>
        `color-mix(in srgb, ${themeColor(listener, "shift-9", "primary")} 10%, transparent)`,
    } as StyleObject,
  } as DomphyElement<"div">;

  // Centering overlay — `absolute inset-0 flex scale-[0.9] rounded-2xl`,
  // grows to scale(1) on group-hover.
  return {
    div: [frostCircle],
    dataHvdOverlay: "true",
    ariaHidden: "true",
    style: {
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: themeSpacing(4),
      transform: "scale(0.9)",
      transformOrigin: "center",
      transition: "transform 200ms ease-out",
    },
  };
}

/**
 * Large clickable video thumbnail that opens the real video in an animated
 * modal above a dimmed backdrop. Call with no arguments for a working demo
 * (placeholder thumbnail, "from-center" grow animation).
 */
function heroVideoDialog(
  props: HeroVideoDialogProps = {},
): DomphyElement<"div"> {
  const thumbnailAlt = props.thumbnailAlt ?? "Product preview";
  // Caller-supplied embeddable video URL expected (e.g. a YouTube/Vimeo embed
  // link) — defaults to a harmless blank frame so the demo's dialog mechanics
  // still work with zero configuration.
  const videoSrc = props.videoSrc ?? "about:blank";
  const animationStyle = props.animationStyle ?? "from-center";
  const transforms = ANIMATION_TRANSFORMS[animationStyle];
  const open = toState(false);

  // Upstream thumbnail `img`: `w-full rounded-md border shadow-lg`, dimmed to
  // `brightness-[0.8]` on group-hover. `_doctorDisable`d for `missing-color`
  // — a decorative image with a themed border but no text of its own.
  const thumbnail: DomphyElement = props.thumbnailSrc
    ? ({
        img: null,
        src: props.thumbnailSrc,
        alt: thumbnailAlt,
        dataHvdThumb: "true",
        _doctorDisable: "missing-color",
        style: {
          width: "100%",
          display: "block",
          borderRadius: themeSpacing(1.5),
          aspectRatio: "16 / 9",
          objectFit: "cover",
          transition: "filter 200ms ease-out",
          border: (listener: Listener) =>
            `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
          boxShadow: (listener: Listener) =>
            `0 ${themeSpacing(2.5)} ${themeSpacing(3.75)} ${themeColor(listener, "shift-3", "neutral")}`,
        },
      } as DomphyElement<"img">)
    : placeholderThumbnail(thumbnailAlt);

  // Upstream close button: positioned ABOVE the video (`-top-16 right-0`),
  // `rounded-full p-2 ring-1 backdrop-blur-md`, `bg-neutral-900/50 text-white`
  // in light and `dark:bg-neutral-100/50 dark:text-black`. `_doctorDisable`d
  // for `tone-background-inherit` — a fixed translucent chrome tint, not an
  // ambient surface.
  const closeButton = {
    button: [closeGlyph()],
    type: "button",
    ariaLabel: "Close video",
    onClick: () => open.set(false),
    _doctorDisable: "tone-background-inherit",
    style: {
      position: "absolute",
      insetBlockStart: themeSpacing(-16),
      insetInlineEnd: 0,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: themeSpacing(2),
      borderRadius: "50%",
      border: "none",
      cursor: "pointer",
      zIndex: 1,
      backdropFilter: (_listener: Listener) => `blur(${themeSpacing(3)})`,
      backgroundColor: (listener: Listener) =>
        `color-mix(in srgb, ${themeColor(listener, "shift-15", "neutral")} 50%, transparent)`,
      color: (listener: Listener) => themeColor(listener, "shift-0", "neutral"),
      boxShadow: (listener: Listener) =>
        `0 0 0 1px ${themeColor(listener, "shift-6", "neutral")}`,
      "@media (prefers-color-scheme: dark)": {
        backgroundColor: (listener: Listener) =>
          `color-mix(in srgb, ${themeColor(listener, "shift-1", "neutral")} 50%, transparent)`,
        color: (listener: Listener) =>
          themeColor(listener, "shift-17", "neutral"),
      },
    } as StyleObject,
  } as DomphyElement<"button">;

  const videoFrame: DomphyElement<"iframe"> = {
    iframe: null,
    // Blank (not empty) while closed — the video genuinely stops loading on
    // close (matches upstream), but the attribute itself must always have a
    // value (an empty `src` is invalid markup per htmlhint's src-not-empty).
    src: (listener: Listener) =>
      open.get(listener) ? videoSrc : "about:blank",
    title: "Hero Video player",
    allow:
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
    allowFullScreen: true,
    style: {
      width: "100%",
      height: "100%",
      display: "block",
      border: "none",
      borderRadius: themeSpacing(4),
    },
  };

  // Upstream `relative isolate z-1 size-full overflow-hidden rounded-2xl
  // border-2 border-white` frame wrapping the iframe. `_doctorDisable`d for
  // `missing-color` — a decorative white frame with no text of its own.
  const videoContainer = {
    div: [videoFrame],
    _doctorDisable: "missing-color",
    style: {
      position: "relative",
      isolation: "isolate",
      zIndex: 1,
      width: "100%",
      height: "100%",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      border: (listener: Listener) =>
        `${themeSpacing(0.5)} solid ${themeColor(listener, "shift-0", "neutral")}`,
    } as StyleObject,
  } as DomphyElement<"div">;

  const dialogElement: DomphyElement<"dialog"> = {
    dialog: [closeButton, videoContainer],
    $: [dialog({ open, color: "neutral" })],
    ariaLabel: `${thumbnailAlt} — video player`,
    _onMount: (node: ElementNode) => {
      const element = node.domElement as HTMLElement;
      const update = (isOpen: boolean) => {
        element.style.transform = isOpen
          ? transforms.enterFrom
          : transforms.exitTo;
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
    // Transparent positioning container (upstream `mx-4 aspect-video w-full
    // max-w-4xl`) — the white frame/rounding lives on `videoContainer`, and
    // `overflow: visible` lets the close button sit above the video. Overrides
    // the dialog() patch's own surface fill/box-shadow.
    style: {
      position: "relative",
      padding: 0,
      border: "none",
      overflow: "visible",
      // Upstream `max-w-4xl` (56rem), with `w-full` + `mx-4` breathing room.
      width: "min(90vw, 56rem)",
      aspectRatio: "16 / 9",
      backgroundColor: "transparent",
      boxShadow: "none",
      transition: "transform 250ms ease, opacity 200ms ease",
    },
  };

  const activate = () => open.set(true);

  return {
    div: [
      {
        div: [thumbnail, playButton()],
        role: "button",
        tabindex: 0,
        ariaLabel: "Play video",
        onClick: activate,
        onKeyDown: (event: KeyboardEvent) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activate();
          }
        },
        // group-hover feedback (upstream): dim the thumbnail, grow the play
        // overlay 0.9 -> 1, scale the inner button -> 1.2, scale the glyph -> 1.05.
        style: {
          position: "relative",
          cursor: "pointer",
          "&:hover [data-hvd-thumb]": { filter: "brightness(0.8)" },
          "&:hover [data-hvd-overlay]": { transform: "scale(1)" },
          "&:hover [data-hvd-inner]": { transform: "scale(1.2)" },
          "&:hover [data-hvd-icon]": { transform: "scale(1.05)" },
        },
      },
      dialogElement,
    ],
    style: { position: "relative", ...(props.style ?? {}) },
  };
}

export { heroVideoDialog };
