import type { DomphyElement } from "@domphy/core";
import { themeColor } from "@domphy/theme";

export const TipBar: DomphyElement<"div"> = {
  div: [
    { span: "💡 Tip: " },
    {
      code: "console.log(domphyElement)",
      style: {
        color: (listener) => themeColor(listener, "shift-9", "primary"),
        fontSize: "12px",
      },
    },
    {
      span: " prints the full expanded patch object (all merges resolved) — paste it to AI for debugging.",
    },
  ],
  style: {
    borderTop: (listener) => `1px solid ${themeColor(listener, "shift-3")}`,
    color: (listener) => themeColor(listener, "shift-7"),
    fontSize: "12px",
    fontFamily: "monospace",
    padding: "5px 10px",
    letterSpacing: "0.02em",
  },
};
