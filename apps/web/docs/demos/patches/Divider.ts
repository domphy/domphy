import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { divider } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    { div: "or", $: [divider()] },
    { div: null, $: [divider()] },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(4),
  },
};

export default App;
