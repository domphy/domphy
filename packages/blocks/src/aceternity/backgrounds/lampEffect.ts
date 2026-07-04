// Aceternity UI "Lamp Effect" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A
// section-header background depicting a stage-lamp light cone: two mirrored
// gradient wedges meeting above the heading, plus a thin bright bar and two
// soft blurred glow blobs at the light source, all widening/brightening
// together in a single one-time entrance on mount.
//
// Each cone half is a `clip-path: polygon(...)` triangle (apex at top-center
// of its own box, base spanning its full width) rotated a few degrees
// outward from vertical and mirrored left/right — a plain
// `linear-gradient(to bottom, bright, transparent)` fill, not a literal CSS
// `conic-gradient()` — which reads as the same "twin fan of light meeting at
// a point" shape with simpler, more predictable geometry (see this
// component's `fidelityNotes`). A `mask-image` linear-gradient on the
// wrapper fades the whole cone's bottom edge into the section background
// instead of cutting it off sharply, matching the spec.
//
// Every light-emitting piece (both cone halves, the bright bar, the two glow
// blobs) plays its own one-time `motion()` entrance — narrower/dimmer to
// full width/opacity — over well under a second, staggered by a small delay
// per element, exactly once on mount; nothing continues animating
// afterward and there is no hover/pointer interaction.

import type { DomphyElement, StyleObject } from "@domphy/core";
import { heading, motion } from "@domphy/ui";
import { type ThemeColor, themeColor, themeSpacing } from "@domphy/theme";
import { demoContentScrimStyle } from "../../shared/demoContentScrim.js";

export interface LampEffectProps {
  /** Heading/content shown tucked under the light source. Defaults to a small demo heading. */
  children?: DomphyElement | DomphyElement[];
  /** Theme color family for the cone/glow. Defaults to `"info"` (cyan/blue). */
  glowColor?: ThemeColor;
  style?: StyleObject;
}

const ENTRANCE_DURATION_MS = 800;

function defaultLampContent(): DomphyElement[] {
  return [
    {
      div: [{ h1: "Build faster, ship brighter", $: [heading({ color: "neutral" })] } as DomphyElement],
      style: demoContentScrimStyle(),
    } as DomphyElement,
  ];
}

/**
 * A stage-lamp light cone — two mirrored gradient wedges meeting above the
 * heading, plus a bright bar and soft glow blobs at the light source — that
 * widens and brightens once on mount, then holds static. Non-interactive.
 * Call with no arguments for a working demo.
 */
function lampEffect(props: LampEffectProps = {}): DomphyElement<"div"> {
  const glowColor = props.glowColor ?? "info";

  const contentChildren = props.children
    ? Array.isArray(props.children)
      ? props.children
      : [props.children]
    : defaultLampContent();

  const coneEntranceTransition = { duration: ENTRANCE_DURATION_MS, delay: 0, easing: "ease-in-out" };

  // `_doctorDisable` is a doctor-only annotation not present in core's strict
  // `PartialElement` type — build through an untyped literal, then assert, so
  // the excess-property check doesn't fire (mirrors meteors.ts).
  function coneHalf(side: "left" | "right") {
    const outwardAngle = side === "left" ? -14 : 14;
    const apexAnchor = side === "left" ? "top right" : "top left";
    const anchorOffset = side === "left" ? "translateX(-100%)" : "translateX(0%)";

    return {
      div: null,
      ariaHidden: "true",
      // Decorative light wedge with no text of its own — exempt from the
      // missing-color contract (mirrors meteors.ts's dot spans elsewhere).
      _doctorDisable: "missing-color",
      style: {
        position: "absolute",
        top: 0,
        left: "50%",
        // Matches `motion()`'s `animate` end value — environments without
        // WAAPI support (`el.animate`) render at this resting/final width
        // immediately instead of collapsing to 0 (mirrors `blurFade.ts`'s
        // "persistent style already IS the settled appearance" convention).
        width: themeSpacing(120),
        height: themeSpacing(112),
        transformOrigin: apexAnchor,
        transform: `${anchorOffset} rotate(${outwardAngle}deg)`,
        clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
        backgroundImage: (listener) =>
          `linear-gradient(to bottom, ${themeColor(listener, "shift-13", glowColor)}, transparent)`,
      } as StyleObject,
      $: [
        motion({
          initial: { width: themeSpacing(60), opacity: 0.5 },
          animate: { width: themeSpacing(120), opacity: 1 },
          transition: coneEntranceTransition,
        }),
      ],
    } as DomphyElement<"div">;
  }

  const glowBar = {
    div: null,
    ariaHidden: "true",
    // Decorative light-source bar with no text of its own — exempt from the
    // missing-color contract. Also exempt from tone-background-inherit: the
    // bar's brightness is intentionally a fixed accent, not a surface that
    // should track the ambient dataTone context (same reasoning as
    // meteors.ts's dots elsewhere in this package).
    _doctorDisable: ["missing-color", "tone-background-inherit"],
    style: {
      position: "absolute",
      top: themeSpacing(28),
      left: "50%",
      transform: "translateX(-50%)",
      // Matches `motion()`'s `animate` end value — see the matching note on
      // `coneHalf()` above.
      width: themeSpacing(64),
      height: themeSpacing(0.5),
      borderRadius: "999px",
      backgroundColor: (listener) => themeColor(listener, "shift-16", glowColor),
      boxShadow: (listener) => `0 0 ${themeSpacing(6)} ${themeColor(listener, "shift-13", glowColor)}`,
    } as StyleObject,
    $: [
      motion({
        initial: { width: themeSpacing(32), opacity: 0.5 },
        animate: { width: themeSpacing(64), opacity: 1 },
        transition: { ...coneEntranceTransition, delay: 100 },
      }),
    ],
  } as DomphyElement<"div">;

  function glowBlob(key: string, restingUnits: number, expandedUnits: number, blurPx: number, delay: number): DomphyElement {
    return {
      div: null,
      _key: key,
      ariaHidden: "true",
      // Decorative glow blob with no text of its own — exempt from the
      // missing-color contract. Also exempt from tone-background-inherit:
      // the blob's brightness is intentionally a fixed accent, not a
      // surface that should track the ambient dataTone context (same
      // reasoning as meteors.ts's dots elsewhere in this package).
      _doctorDisable: ["missing-color", "tone-background-inherit"],
      style: {
        position: "absolute",
        top: themeSpacing(28),
        left: "50%",
        transform: "translate(-50%, -50%)",
        // Matches `motion()`'s `animate` end value — see the matching note on
        // `coneHalf()` above.
        width: themeSpacing(expandedUnits),
        height: themeSpacing(expandedUnits),
        borderRadius: "50%",
        filter: `blur(${blurPx}px)`,
        backgroundColor: (listener) => themeColor(listener, "shift-11", glowColor),
      } as StyleObject,
      $: [
        motion({
          initial: { width: themeSpacing(restingUnits), height: themeSpacing(restingUnits), opacity: 0.5 },
          animate: { width: themeSpacing(expandedUnits), height: themeSpacing(expandedUnits), opacity: 1 },
          transition: { ...coneEntranceTransition, delay },
        }),
      ],
    } as DomphyElement;
  }

  const coneWrapper = {
    div: [
      coneHalf("left"),
      coneHalf("right"),
      glowBlob("lamp-glow-outer", 60, 120, 96, 200),
      glowBlob("lamp-glow-inner", 32, 64, 48, 150),
      glowBar,
    ],
    ariaHidden: "true",
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      overflow: "hidden",
      // Fades the whole cone's bottom edge into the section background
      // instead of cutting it off sharply.
      maskImage: "linear-gradient(to bottom, black, transparent)",
      WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
    } as StyleObject,
  } as DomphyElement<"div">;

  return {
    div: [
      coneWrapper,
      {
        div: contentChildren,
        style: {
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          // A moderate top gap (well short of the cone's own `themeSpacing(112)`
          // height) tucks the heading up near the glow bar/blobs rather than
          // fully below the faded tail of the cone.
          marginTop: themeSpacing(24),
          paddingInline: themeSpacing(6),
        } as StyleObject,
      } as DomphyElement,
    ],
    dataTone: "shift-17",
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: themeSpacing(4),
      minHeight: themeSpacing(140),
      paddingBottom: themeSpacing(16),
      backgroundColor: (listener) => themeColor(listener, "inherit"),
      color: (listener) => themeColor(listener, "shift-9"),
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      ...(props.style ?? {}),
    } as StyleObject,
  };
}

export { lampEffect };
