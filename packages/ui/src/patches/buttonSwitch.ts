import { type PartialElement, toState, type ValueOrState } from "@domphy/core";
import {
  type ThemeColor,
  textToneOn,
  themeColor,
  themeSize,
  themeSpacing,
} from "@domphy/theme";
import { focusRing } from "../utils/focusRing.js";

/**
 * A pill-shaped toggle switch with `role="switch"`; clicking flips the bound
 * `checked` state and slides the thumb. Apply to a `<button>` element.
 *
 * @hostTag button
 * @param props.checked - Toggle state. Optional `ValueOrState<boolean>`, default false.
 * @param props.accentColor - Color tone when checked (on). Optional `ValueOrState<ThemeColor>`, default "primary".
 * @param props.color - Color tone when unchecked (off track). Optional `ValueOrState<ThemeColor>`, default "neutral".
 * @example { button: [{ span: null }], $: [buttonSwitch({ checked: true })] }
 */
function buttonSwitch(
  props: {
    checked?: ValueOrState<boolean>;
    accentColor?: ValueOrState<ThemeColor>;
    color?: ValueOrState<ThemeColor>;
  } = {},
): PartialElement {
  const { checked = false } = props;

  const check = toState(checked);
  const color = toState(props.color ?? "neutral", "color");
  const accentColor = toState(props.accentColor ?? "primary", "accentColor");

  return {
    // Native `type` on the host still wins (mergePartial: native over patch).
    type: "button",
    _onSchedule: (node) => {
      if (node.tagName !== "button") {
        console.warn(`"buttonSwitch" primitive patch must use button tag`);
      }
    },
    role: "switch",
    // A <button> is not a labelable element, so <label for> cannot name it and
    // the thumb span carries no text — the control had NO accessible name at
    // all (axe `button-name`). A host-declared aria-label/aria-labelledby
    // still wins over this default.
    ariaLabel: "Toggle",
    ariaChecked: (listener) => check.get(listener),
    dataTone: "shift-2",
    onClick: () => check.set(!check.get()),
    style: {
      position: "relative",
      display: "inline-flex",
      alignItems: "center",
      fontSize: (listener) => themeSize(listener),
      border: "none",
      outlineWidth: "1px",
      // WCAG 2.1 SC 1.4.11 Non-text Contrast: the OFF track is tone-inherited
      // and sits at ~1.4:1 against the page, so the boundary has to carry the
      // 3:1. "border" (shift-3) measured 1.64:1 in Chromium; shift-7 measures
      // 3.32:1 (light) / 3.50:1 (dark).
      outline: (listener) =>
        `1px solid ${themeColor(listener, "shift-7", color.get(listener))}`,
      minWidth: themeSpacing(12),
      minHeight: themeSpacing(6),
      // A switch is a fixed-size track, never a full-width bar. Measured in
      // Chromium: inside a `stack()` the 48px pill stretched to 1232px and the
      // thumb (absolutely positioned from the left edge) floated alone at the
      // far end of it. `inline-flex` does not survive flex/grid blockification.
      width: "fit-content",
      flexShrink: 0,
      borderRadius: themeSpacing(999),
      paddingInlineStart: themeSpacing(7),
      paddingInlineEnd: themeSpacing(2),
      cursor: "pointer",
      transition:
        "padding-inline-start 0.3s, padding-inline-end 0.3s, background-color 140ms ease, box-shadow 140ms ease",
      backgroundColor: (listener) =>
        themeColor(listener, "inherit", color.get(listener)),
      color: (listener) => themeColor(listener, "text", color.get(listener)),
      "&:focus-visible": {
        boxShadow: (listener) => focusRing(listener, accentColor.get(listener)),
      },
      "& > :first-child": {
        content: '""',
        position: "absolute",
        display: "inline-flex",
        alignItems: "center",
        insetInlineStart: themeSpacing(0.5),
        top: "50%",
        transform: "translateY(-50%)",
        transition: "inset-inline-start 0.3s",
        width: themeSpacing(5),
        height: themeSpacing(5),
        borderRadius: themeSpacing(999),
        color: (listener) => themeColor(listener, "text"),
        backgroundColor: (listener) =>
          themeColor(listener, "decrease-2", color.get(listener)),
        // The thumb is tone-inherited too — same 1.4:1 problem as the track.
        // Its own boundary makes the ON/OFF position identifiable on either
        // track colour (SC 1.4.11), the way Radix rings its switch thumb.
        outline: (listener) =>
          `1px solid ${themeColor(listener, "shift-7", color.get(listener))}`,
        outlineOffset: "-1px",
      },
      "&[aria-checked=true]": {
        backgroundColor: (listener) =>
          themeColor(listener, "increase-3", accentColor.get(listener)),
        outline: "none",
        // Host label tracks the ON fill (+3 off this element's own shift-2
        // anchor). `decrease-2` pinned it to the light end of the ramp and
        // measured 2.48:1 (light) / 1.87:1 (dark) on that fill.
        color: (listener) =>
          themeColor(listener, textToneOn(3), accentColor.get(listener)),
        paddingInlineStart: themeSpacing(2),
        paddingInlineEnd: themeSpacing(7),
      },
      "&[aria-checked=true] > :first-child": {
        insetInlineStart: `calc(100% - ${themeSpacing(5.5)})`,
      },
      "&[disabled]": {
        opacity: 0.7,
        cursor: "not-allowed",
      },
    },
  };
}

export { buttonSwitch };
