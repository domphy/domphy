import { DomphyElement } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { popoverArrow } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: "Arrow Target",
  dataTone: "shift-6",
  style: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    paddingBlock: themeSpacing(1),
    paddingInline: themeSpacing(3),
    borderRadius: themeSpacing(2),
    color: (listener) => themeColor(listener, "shift-6"),
    backgroundColor: (listener) => themeColor(listener),
  },
  $: [popoverArrow({ placement: "bottom" })],
};

export default App;

