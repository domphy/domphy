import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { buttonGhost } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    { button: "Default", $: [buttonGhost()] },
    { button: "Primary", $: [buttonGhost({ color: "primary" })] },
    { button: "Danger", $: [buttonGhost({ color: "danger" })] },
    {
      button: "Disabled",
      disabled: true,
      $: [buttonGhost()],
    },
    {
      button: "× Remove",
      $: [buttonGhost({ color: "danger" })],
    },
    { button: "Small", $: [buttonGhost({ color: "primary", size: "small" })] },
    { button: "Large", $: [buttonGhost({ color: "primary", size: "large" })] },
  ],
  style: {
    display: "flex",
    flexWrap: "wrap",
    gap: themeSpacing(3),
    alignItems: "center",
  },
};

export default App;
