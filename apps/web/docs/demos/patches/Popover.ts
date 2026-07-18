import type { DomphyElement } from "@domphy/core";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";
import { button, popover, popoverArrow } from "@domphy/ui";

const content: DomphyElement<"div"> = {
  div: "Popover content",
  dataTone: "shift-17",
  style: {
    paddingBlock: (listener) => themeSpacing(themeDensity(listener) * 1),
    paddingInline: (listener) => themeSpacing(themeDensity(listener) * 3),
    borderRadius: (listener) => themeSpacing(themeDensity(listener) * 1.5),
    backgroundColor: (listener) => themeColor(listener, "inherit", "neutral"),
    color: (listener) => themeColor(listener, "shift-9", "neutral"),
  },
  $: [popoverArrow({ placement: "bottom" })],
};
const App: DomphyElement<"button"> = {
  button: "Open popover",
  $: [button(), popover({ openOn: "hover", placement: "bottom", content })],
};

export default App;
