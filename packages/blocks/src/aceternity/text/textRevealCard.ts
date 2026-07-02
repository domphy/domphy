// Aceternity UI "Text Reveal Card" — clean-room reimplementation from the
// public behavior/visual spec only (no upstream source viewed or copied). A
// dark card with two stacked lines of text: an always-visible, dimly
// gradient-muted "ghost" line, and a brighter hidden line beneath it that is
// manually wiped into view as the cursor drags left-to-right across the
// card — a thin tilting indicator "blade" marks the current reveal
// boundary, and a scattering of small twinkling dot "stars" gives the card
// ambience.
//
// The reveal itself is a `clip-path: inset()` percentage bound 1:1 to the
// pointer's horizontal fraction across the card, written straight to the DOM
// on every `mousemove` (no easing while hovering, per the spec) — the same
// "disable the CSS transition during the drag, re-enable it only for the
// eased settle-back on `mouseleave`" technique this package's own
// `directionAwareHover.ts`/`card3D.ts` already use for their own instant-
// track/eased-reset splits. The ~140 twinkling stars reuse `dotPattern.ts`'s
// own "one shared randomized-duration/delay `@keyframes`, applied per-dot
// inline" idiom from elsewhere in this package.
//
// The two text lines' bold display weight has no theme token (AGENTS.md:
// weight isn't part of the tokenized scale) — set through a `(l) => 700`
// function-form value, the same doctor-legitimate escape hatch
// `kineticText.ts` already uses for its own constant resting font-weight
// elsewhere in this package (the inline-typography rule only flags literal,
// non-function values). Size instead goes through the real `themeSize()`
// token so it still respects `dataSize` context.

import type { DomphyElement, ElementNode, Listener, StyleObject } from "@domphy/core";
import { hashString } from "@domphy/core";
import { type ThemeColor, themeColor, themeSize, themeSpacing } from "@domphy/theme";

export interface TextRevealCardProps {
  /** Always-visible, dimly muted base line. Defaults to a short demo phrase. */
  text?: string;
  /** Brighter line exposed by the left-to-right wipe. Defaults to a short demo phrase. */
  revealText?: string;
  /** Optional overlay content (e.g. a title/description) rendered above the two text lines. */
  children?: DomphyElement | DomphyElement[];
  /** Extra class name merged onto the outer card's native `class` attribute. */
  className?: string;
  /** Number of decorative twinkling dot "stars" scattered across the card. Defaults to `140`. */
  starCount?: number;
  /** Theme color family for the revealed line's glow/indicator blade accent. Defaults to `"neutral"`. */
  accentColor?: ThemeColor;
  /** Passthrough style merged onto the outer card. */
  style?: StyleObject;
}

const RESET_TRANSITION_MS = 400;
const MAX_BLADE_TILT_DEG = 2.5;

let textRevealCardInstanceCounter = 0;

function randomStar(key: string, animationName: string): DomphyElement<"span"> {
  const topPercent = Math.random() * 100;
  const leftPercent = Math.random() * 100;
  const durationSeconds = 1.5 + Math.random() * 2.5;
  const delaySeconds = Math.random() * 3;
  // `_doctorDisable` is a doctor-only annotation not present in core's
  // strict `PartialElement` type — build through an untyped literal, then
  // assert, so the excess-property check doesn't fire (mirrors
  // `dottedGlowBackground.ts`/`flickeringGrid.ts`).
  return {
    span: null,
    _key: key,
    ariaHidden: "true",
    // Decorative twinkling dot with no text of its own — exempt from the
    // missing-color contract, matching `dotPattern.ts`'s own glow dots. Also
    // exempt from tone-background-inherit: a star's fixed bright dot color
    // is intentional, not a surface (same reasoning `glowingStars.ts`/
    // `shootingStars.ts` document for their own decorative dots).
    _doctorDisable: ["missing-color", "tone-background-inherit"],
    style: {
      position: "absolute",
      top: `${topPercent}%`,
      left: `${leftPercent}%`,
      width: "2px",
      height: "2px",
      borderRadius: "50%",
      backgroundColor: (listener: Listener) => themeColor(listener, "shift-17"),
      animation: `${animationName} ${durationSeconds}s ease-in-out ${delaySeconds}s infinite`,
    } as StyleObject,
  } as DomphyElement<"span">;
}

/**
 * A dark card whose bottom line of text is hidden behind a dim placeholder
 * line and gets manually wiped into view as the cursor drags left-to-right
 * across the card, with a thin tilting indicator blade tracking the reveal
 * boundary and a field of twinkling decorative stars. Call with no
 * arguments for a working demo.
 */
function textRevealCard(props: TextRevealCardProps = {}): DomphyElement<"div"> {
  const baseText = props.text ?? "Hover and drag across this card";
  const revealText = props.revealText ?? "You just wiped away the mystery";
  const starCount = Math.max(0, Math.round(props.starCount ?? 140));
  const accentColor = props.accentColor ?? "neutral";

  const instanceId = ++textRevealCardInstanceCounter;
  const twinkleKeyframes = {
    "0%,100%": { opacity: 0.15, transform: "scale(0.8)" },
    "50%": { opacity: 1, transform: "scale(1.2)" },
  };
  const twinkleAnimationName = `text-reveal-card-twinkle-${hashString(JSON.stringify({ instanceId, twinkleKeyframes }))}`;

  const stars: DomphyElement<"span">[] = Array.from({ length: starCount }, (_unused, index) => randomStar(`star-${instanceId}-${index}`, twinkleAnimationName));

  const starsLayer: DomphyElement<"div"> = {
    div: stars,
    ariaHidden: "true",
    style: {
      position: "absolute",
      inset: 0,
      overflow: "hidden",
      pointerEvents: "none",
      [`@keyframes ${twinkleAnimationName}`]: twinkleKeyframes,
    } as StyleObject,
  };

  let revealedTextElement: HTMLElement | null = null;
  let indicatorBladeElement: HTMLElement | null = null;

  const baseTextLayer: DomphyElement<"p"> = {
    p: baseText,
    style: {
      position: "relative",
      margin: 0,
      fontSize: (listener: Listener) => themeSize(listener, "increase-2"),
      fontWeight: () => 700,
      backgroundImage: (listener: Listener) => `linear-gradient(180deg, ${themeColor(listener, "shift-7")}, ${themeColor(listener, "shift-4")})`,
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      color: "transparent",
    } as StyleObject,
  };

  const revealedTextLayer: DomphyElement<"p"> = {
    p: revealText,
    style: {
      position: "absolute",
      inset: 0,
      margin: 0,
      fontSize: (listener: Listener) => themeSize(listener, "increase-2"),
      fontWeight: () => 700,
      clipPath: "inset(0 100% 0 0)",
      backgroundImage: (listener: Listener) => `linear-gradient(180deg, ${themeColor(listener, "shift-17")}, ${themeColor(listener, "shift-13")})`,
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      color: "transparent",
      textShadow: (listener: Listener) => `0 0 ${themeSpacing(3)} ${themeColor(listener, "shift-14", accentColor)}`,
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      revealedTextElement = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      revealedTextElement = null;
    },
  };

  const textStack: DomphyElement<"div"> = {
    div: [baseTextLayer, revealedTextLayer],
    style: { position: "relative", zIndex: 1 } as StyleObject,
  };

  // `_doctorDisable` is a doctor-only annotation not present in core's
  // strict `PartialElement` type — build through an untyped literal, then
  // assert, so the excess-property check doesn't fire (mirrors
  // `dottedGlowBackground.ts`/`flickeringGrid.ts`).
  const indicatorBlade = {
    div: null,
    ariaHidden: "true",
    // Decorative reveal-boundary blade with no text of its own — exempt
    // from the missing-color contract, matching `spotlightDual.ts`'s layers.
    _doctorDisable: "missing-color",
    _onMount: (node: ElementNode) => {
      indicatorBladeElement = node.domElement as HTMLElement;
    },
    _onRemove: () => {
      indicatorBladeElement = null;
    },
    style: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: "0%",
      width: "2px",
      opacity: 0,
      zIndex: 2,
      pointerEvents: "none",
      backgroundImage: (listener: Listener) => `linear-gradient(180deg, transparent, ${themeColor(listener, "shift-17", accentColor)}, transparent)`,
    } as StyleObject,
  } as DomphyElement<"div">;

  const overlayChildren: DomphyElement[] = props.children ? (Array.isArray(props.children) ? props.children : [props.children]) : [];

  return {
    div: [
      starsLayer,
      ...(overlayChildren.length > 0
        ? [{ div: overlayChildren, style: { position: "relative", zIndex: 1, marginBottom: themeSpacing(3) } } as DomphyElement]
        : []),
      textStack,
      indicatorBlade,
    ],
    class: props.className,
    dataTone: "shift-16",
    style: {
      position: "relative",
      overflow: "hidden",
      cursor: "crosshair",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(8),
      minHeight: themeSpacing(48),
      minWidth: themeSpacing(80),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      outlineOffset: "-1px",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      ...(props.style ?? {}),
    } as StyleObject,
    _onMount: (node: ElementNode) => {
      if (typeof window === "undefined") return;
      const cardElement = node.domElement as HTMLElement;

      const handlePointerMove = (event: MouseEvent) => {
        const rect = cardElement.getBoundingClientRect();
        const fraction = rect.width > 0 ? Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) : 0;
        const percentage = fraction * 100;
        if (revealedTextElement) {
          revealedTextElement.style.transition = "none";
          revealedTextElement.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
        }
        if (indicatorBladeElement) {
          const tiltDeg = ((percentage - 50) / 50) * MAX_BLADE_TILT_DEG;
          indicatorBladeElement.style.transition = "none";
          indicatorBladeElement.style.left = `${percentage}%`;
          indicatorBladeElement.style.transform = `translateX(-50%) rotate(${tiltDeg}deg)`;
          indicatorBladeElement.style.opacity = "1";
        }
      };

      const handlePointerLeave = () => {
        if (revealedTextElement) {
          revealedTextElement.style.transition = `clip-path ${RESET_TRANSITION_MS}ms ease`;
          revealedTextElement.style.clipPath = "inset(0 100% 0 0)";
        }
        if (indicatorBladeElement) {
          indicatorBladeElement.style.transition = `left ${RESET_TRANSITION_MS}ms ease, opacity ${RESET_TRANSITION_MS}ms ease`;
          indicatorBladeElement.style.opacity = "0";
        }
      };

      cardElement.addEventListener("mousemove", handlePointerMove);
      cardElement.addEventListener("mouseleave", handlePointerLeave);

      node.addHook("Remove", () => {
        cardElement.removeEventListener("mousemove", handlePointerMove);
        cardElement.removeEventListener("mouseleave", handlePointerLeave);
      });
    },
  } as DomphyElement<"div">;
}

export { textRevealCard };
