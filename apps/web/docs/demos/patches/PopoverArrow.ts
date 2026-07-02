import type { DomphyElement } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import { popoverArrow } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: "Arrow Target",
  dataTone: "shift-0",
  style: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
    paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
    borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1),
    color: (listener) => themeColor(listener, "shift-9", "neutral"),
    backgroundColor: (listener) => themeColor(listener, "inherit", "neutral"),
  },
  $: [popoverArrow({ placement: "bottom" })],
};

export default App;
