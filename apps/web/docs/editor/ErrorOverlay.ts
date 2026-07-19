import type { DomphyElement, State } from "@domphy/core";
import { themeSize, themeSpacing } from "@domphy/theme";
import { alert } from "@domphy/ui";

export function ErrorOverlay(error: State<string>): DomphyElement<"div"> {
  return {
    div: (listener) => error.get(listener),
    // The alert patch owns the error surface (tinted background, readable
    // text color, inset accent bar) — the overlay only positions it.
    $: [alert({ color: "error" })],
    // color/backgroundColor come from the alert() patch above, which the
    // static analyzer cannot see through.
    _doctorDisable: "missing-color",
    style: {
      display: (listener) => (error.get(listener) ? "block" : "none"),
      position: "absolute",
      top: themeSpacing(2),
      left: themeSpacing(2),
      right: themeSpacing(2),
      zIndex: "10",
      fontSize: (listener) => themeSize(listener, "decrease-1"),
      borderRadius: themeSpacing(1),
      whiteSpace: "pre-wrap",
    },
  };
}
