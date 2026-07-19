import type { DomphyElement } from "@domphy/core";
import { themeColor, themeSize, themeSpacing } from "@domphy/theme";

export const TipBar: DomphyElement<"div"> = {
  div: [
    { span: "Tip: ", style: { color: (listener) => themeColor(listener, "text") } },
    { code: "console.log(domphyElement)" },
    {
      span: " prints the full expanded patch object (all merges resolved) — paste it to AI for debugging.",
    },
  ],
  style: {
    borderTop: (listener) => `1px solid ${themeColor(listener, "border")}`,
    color: (listener) => themeColor(listener, "muted"),
    fontSize: (listener) => themeSize(listener, "decrease-1"),
    paddingBlock: themeSpacing(1.5),
    paddingInline: themeSpacing(3),
  },
};
