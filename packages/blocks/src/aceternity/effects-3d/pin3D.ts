// Aceternity UI "3D Pin" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// dark card that acts as a click-through link, with a "map pin" motif
// anchored at its bottom edge: a small dot with a continuously looping
// radar-ping ring (idle, independent of hover) that, on hover, grows a
// glowing vertical beam topped by a title pill rising up out of the card.
//
// Despite the "3D" name in the reference component's own title, the depth
// here reads through layered glow/gradient and a vertical pop-up motion
// rather than literal `rotateX`/`rotateY` camera work (per the task's own
// researchNote) — this port leans into that: no `perspective`/`rotate*`
// transforms anywhere, just glow, gradient, and `height`/`opacity`/`y`
// keyframes.
//
// The idle radar-ping ring reuses this package's own `pulsatingButton.ts`
// technique verbatim: a `box-shadow` keyframe expanding via `color-mix(in
// srgb, currentColor N%, transparent)`, so the ring's color always tracks
// the dot's own `color` with no extra reactive plumbing. The hover-driven
// beam/pill reveal is plain `motion()` (Web Animations API) driven by two
// `State<MotionKeyframe>`s written directly from `onMouseEnter`/
// `onMouseLeave` — no imperative DOM listeners needed since Domphy elements
// accept native event-handler props directly (the same idiom `tooltip.ts`
// uses for its own show/hide). A `cubic-bezier` back-ease stands in for the
// spec's "spring physics... slightly overshoots before settling" — Domphy's
// `motion()` wraps the Web Animations API (CSS easing curves), not a
// physical spring simulator, so an overshoot easing curve is the closest
// available approximation; noted here rather than silently treated as
// identical.

import type { DomphyElement, Listener, StyleObject } from "@domphy/core";
import { hashString, toState } from "@domphy/core";
import { type MotionKeyframe, heading, motion, paragraph, small } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";

export interface Pin3DProps {
  /** Card content rendered above the pin motif. Defaults to a short demo panel. */
  children?: DomphyElement | DomphyElement[];
  /** Text shown in the popup pill on hover. Defaults to `"View project"`. */
  title?: string;
  /** Click-through destination. Defaults to `"#"`. */
  href?: string;
  /** Theme color family for the pin dot, ping ring, and beam gradient's start stop. Defaults to `"info"`. */
  color?: ThemeColor;
  /** Theme color family for the beam gradient's end stop (the "cycles through cool tones" accent). Defaults to `"secondary"`. */
  accentColor?: ThemeColor;
  /** Base dot diameter, in `themeSpacing` units. Defaults to `2.5`. */
  pinSize?: number;
  /** How tall the beam grows on hover, in `themeSpacing` units. Defaults to `16`. */
  beamHeight?: number;
  /** Extra class name merged onto the outer link's native `class` attribute. */
  containerClassName?: string;
  /** Extra class name merged onto the inner content wrapper's native `class` attribute. */
  contentClassName?: string;
  /** Passthrough style merged onto the card surface. */
  style?: StyleObject;
}

const HIDDEN_BEAM_FRAME: MotionKeyframe = { height: "0em", opacity: 0 };
const HIDDEN_PILL_FRAME: MotionKeyframe = { opacity: 0, y: 8, scale: 0.85 };
const VISIBLE_PILL_FRAME: MotionKeyframe = { opacity: 1, y: 0, scale: 1 };
// A cubic-bezier with a control point past 1.0 overshoots then settles —
// the nearest WAAPI-easing approximation of a spring's bounce.
const SPRING_EASING = "cubic-bezier(0.34, 1.56, 0.64, 1)";

function defaultContent(): DomphyElement[] {
  return [
    { h3: "3D Pin", $: [heading()] } as DomphyElement,
    {
      p: "Hover to raise a glowing pin above this card's pulsing radar base.",
      $: [paragraph({ color: "neutral" })],
    } as DomphyElement,
  ];
}

/**
 * A dark card acting as a click-through link, with a map-pin motif anchored
 * at its bottom edge: a continuously pulsing radar-ping base dot that, on
 * hover, grows a glowing beam topped by a title pill rising out of the card.
 * Call with no arguments for a working demo card.
 */
function pin3D(props: Pin3DProps = {}): DomphyElement<"a"> {
  const content = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultContent();
  const title = props.title ?? "View project";
  const href = props.href ?? "#";
  const color = props.color ?? "info";
  const accentColor = props.accentColor ?? "secondary";
  const pinSizeUnits = props.pinSize ?? 2.5;
  const beamHeightUnits = Math.max(4, props.beamHeight ?? 16);

  const beamFrame = toState<MotionKeyframe>(HIDDEN_BEAM_FRAME);
  const pillFrame = toState<MotionKeyframe>(HIDDEN_PILL_FRAME);

  const visibleBeamFrame: MotionKeyframe = { height: `${beamHeightUnits / 4}em`, opacity: 1 };

  const pingAnimationName = `pin3d-ping-${hashString(JSON.stringify({ pinSizeUnits, color }))}`;
  const pingKeyframes = {
    "0%": { boxShadow: "0 0 0 0 color-mix(in srgb, currentColor 45%, transparent)" },
    "100%": {
      boxShadow: `0 0 0 ${themeSpacing(pinSizeUnits * 1.8)} color-mix(in srgb, currentColor 0%, transparent)`,
    },
  };

  const baseDot: DomphyElement<"span"> = {
    span: null,
    ariaHidden: "true",
    style: {
      position: "absolute",
      insetInlineStart: "50%",
      insetBlockEnd: themeSpacing(-pinSizeUnits / 2),
      width: themeSpacing(pinSizeUnits),
      height: themeSpacing(pinSizeUnits),
      borderRadius: "50%",
      transform: "translateX(-50%)",
      zIndex: 2,
      color: (listener: Listener) => themeColor(listener, "shift-9", color),
      // `backgroundColor` uses tone "inherit" (not a fixed shift) with the
      // color family overridden to `color` — the same "solid accent fill"
      // convention this package's `@domphy/ui` `avatar()`/`button()` patches
      // use for their own colored surfaces, so the dot still reads as a
      // vivid solid color while following the surface-tone contract.
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", color),
      animation: `${pingAnimationName} 1.8s cubic-bezier(0, 0, 0.2, 1) infinite`,
      [`@keyframes ${pingAnimationName}`]: pingKeyframes,
    } as StyleObject,
  } as DomphyElement<"span">;

  const beamElement: DomphyElement<"span"> = {
    span: null,
    ariaHidden: "true",
    // Decorative gradient beam with no text of its own — exempt from the
    // missing-color contract, matching this package's other purely
    // decorative glow/accent elements (e.g. `borderBeam.ts`'s orbit rect).
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      insetInlineStart: "50%",
      insetBlockEnd: themeSpacing(pinSizeUnits / 2),
      width: themeSpacing(0.375),
      borderRadius: themeSpacing(999),
      transform: "translateX(-50%)",
      transformOrigin: "bottom center",
      pointerEvents: "none",
      zIndex: 1,
      background: (listener: Listener) =>
        `linear-gradient(0deg, ${themeColor(listener, "shift-9", color)}, ${themeColor(listener, "shift-9", accentColor)})`,
      boxShadow: (listener: Listener) => `0 0 ${themeSpacing(3)} ${themeColor(listener, "shift-9", color)}`,
    } as StyleObject,
    $: [
      motion({
        initial: HIDDEN_BEAM_FRAME,
        animate: beamFrame,
        transition: { duration: 380, easing: SPRING_EASING },
      }),
    ],
  } as DomphyElement<"span">;

  const pillElement: DomphyElement<"span"> = {
    span: [{ small: title, $: [small({ color: "neutral" })] } as DomphyElement],
    dataTone: "shift-17",
    style: {
      position: "absolute",
      insetInlineStart: "50%",
      insetBlockEnd: themeSpacing(pinSizeUnits / 2 + beamHeightUnits + 1),
      transform: "translateX(-50%)",
      whiteSpace: "nowrap",
      paddingBlock: themeSpacing(1),
      paddingInline: themeSpacing(3),
      borderRadius: themeSpacing(999),
      pointerEvents: "none",
      zIndex: 2,
      backgroundColor: (listener: Listener) => themeColor(listener),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      boxShadow: (listener: Listener) => `0 0 ${themeSpacing(4)} ${themeColor(listener, "shift-9", color)}`,
    } as StyleObject,
    $: [
      motion({
        initial: HIDDEN_PILL_FRAME,
        animate: pillFrame,
        transition: { duration: 380, delay: 60, easing: SPRING_EASING },
      }),
    ],
  } as DomphyElement<"span">;

  const contentWrapper: DomphyElement<"div"> = {
    div: content,
    class: props.contentClassName,
    style: { position: "relative", zIndex: 1 } as StyleObject,
  };

  const card: DomphyElement<"div"> = {
    div: [contentWrapper, baseDot, beamElement, pillElement],
    dataTone: "shift-15",
    style: {
      position: "relative",
      overflow: "visible",
      borderRadius: themeSpacing(4),
      padding: themeSpacing(6),
      paddingBlockEnd: themeSpacing(8),
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit"),
      color: (listener: Listener) => themeColor(listener, "shift-9"),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3")}`,
      outlineOffset: "-1px",
      ...(props.style ?? {}),
    } as StyleObject,
  };

  return {
    a: [card],
    href,
    class: props.containerClassName,
    style: {
      display: "block",
      width: "fit-content",
      textDecoration: () => "none",
    } as StyleObject,
    onMouseEnter: () => {
      beamFrame.set(visibleBeamFrame);
      pillFrame.set(VISIBLE_PILL_FRAME);
    },
    onMouseLeave: () => {
      beamFrame.set(HIDDEN_BEAM_FRAME);
      pillFrame.set(HIDDEN_PILL_FRAME);
    },
  } as DomphyElement<"a">;
}

export { pin3D };
