import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { focusRing } from "../utils/focusRing.js";

/**
 * Styles a checkbox as a toggle switch: themed track and sliding knob that
 * animates and recolors on checked, plus a disabled state. Apply to an
 * `<input>` element of type `checkbox` (the patch sets `type: "checkbox"`).
 *
 * @hostTag input
 * @param props.accentColor - Optional theme color tone for the checked track (`ValueOrState<ThemeColor>`). Defaults to `"primary"`.
 * @example { input: null, type: "checkbox", $: [inputSwitch()] }
 */
/** Track, knob and end inset, in spacing units. INHERITED: buttonSwitch's 12x6 track and 5U thumb. */
const TRACK = 12;
const KNOB = 5;
const INSET = 0.5;
/**
 * DERIVED from the three above: the knob travels TRACK - KNOB - 2*INSET, and a
 * PERCENTAGE of the track is the only way to say that without an em length —
 * an em offset recomputes when the host font-size changes, which re-ran this
 * transition and swung the knob past the track's end for 300 ms. Resolving the
 * travel here is what keeps it true if the track or knob size ever changes.
 */
const TRAVEL = `${((TRACK - KNOB - 2 * INSET) / TRACK) * 100}%`;

function inputSwitch(
  props: { accentColor?: ValueOrState<ThemeColor> } = {},
): PartialElement {
  const accentColor = toState(props.accentColor ?? "primary", "accentColor");

  return {
    role: "switch",
    dataTone: "shift-2",
    type: "checkbox",
    _onSchedule: (node) => {
      if (node.tagName !== "input") {
        console.warn(`"inputSwitch" primitive patch must use input tag`);
        return;
      }
    },
    style: {
      fontSize: (listener) => themeSize(listener, "inherit"),
      // The track is `::before` alone, filling the whole host box; painting
      // the host too would draw a second pill behind it.
      backgroundColor: "transparent",
      color: (listener) => themeColor(listener, "text"),
      appearance: "none",
      position: "relative",
      display: "inline-flex",
      // An empty inline-flex box's baseline is synthesized from its first flex
      // item, and the track (::before) fills the host, so the baseline landed on
      // the box's bottom edge — 1U lower than inputCheckbox / inputRadio, whose
      // 4U indicator is centred in a 6U box ((6-4)/2 = 1U above the bottom).
      // Dropping the box by that 1U makes the three controls sit alike beside
      // text in an ordinary (non-flex) label.
      verticalAlign: `calc(${themeSpacing(1)} * -1)`,
      width: themeSpacing(TRACK),
      height: themeSpacing(6),
      cursor: "pointer",
      margin: `0`,
      transition: "box-shadow 140ms ease",
      borderRadius: themeSpacing(999),
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, accentColor.get(listener)),
      },
      "&:checked": {
        "&::before": {
          backgroundColor: (listener) =>
            themeColor(listener, "increase-3", accentColor.get(listener)),
        },
        "&::after": {
          marginInlineStart: TRAVEL,
        },
      },
      "&::after": {
        content: `""`,
        aspectRatio: `1/1`,
        position: "absolute",
        width: themeSpacing(KNOB),
        height: themeSpacing(KNOB),
        borderRadius: themeSpacing(999),
        insetInlineStart: themeSpacing(INSET),
        marginInlineStart: 0,
        top: "50%",
        transform: "translateY(-50%)",
        transition: "margin-inline-start 0.3s",
        backgroundColor: (listener) => themeColor(listener, "decrease-3"),
        // The knob is near-white on a near-white OFF track, so its own
        // boundary is what makes the ON/OFF position identifiable
        // (WCAG 2.1 SC 1.4.11) — same treatment as buttonSwitch's thumb.
        outline: (listener) => `1px solid ${themeColor(listener, "shift-7")}`,
        outlineOffset: "-1px",
      },
      "&::before": {
        content: '""',
        width: "100%",
        borderRadius: themeSpacing(999),
        display: "inline-block",
        fontSize: (listener) => themeSize(listener, "inherit"),
        lineHeight: 1,
        // WCAG 2.1 SC 1.4.11 Non-text Contrast: the OFF track needs >= 3:1
        // against the surface behind it. The tone-inherited FILL measured
        // 1.38:1 on a light page and 1.18:1 on a dark one in Chromium, so the
        // 3:1 is carried by the boundary (shift-7 measures 3.32:1 / 3.50:1),
        // not by darkening the fill: a shift-7 FILLED off-track reads as the
        // ON state — every peer (Radix, shadcn, MUI) keeps the off-track at
        // the muted surface and only the on-track takes the accent.
        backgroundColor: (listener) => themeColor(listener, "inherit"),
        outline: (listener) => `1px solid ${themeColor(listener, "shift-7")}`,
        outlineOffset: "-1px",
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
      },
    },
  };
}

export { inputSwitch };
