import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { progress } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    {
      progress: null,
      max: 100,
      value: 35,
      $: [progress()],
      // Decorative track/bar, no text content — "missing-color" would
      // otherwise ask for a color that has nothing to apply to.
      _doctorDisable: "missing-color",
    },
    {
      progress: null,
      max: 100,
      value: 72,
      $: [progress({ accentColor: "success" })],
      // Decorative track/bar, no text content — "missing-color" would
      // otherwise ask for a color that has nothing to apply to.
      _doctorDisable: "missing-color",
    },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(4),
  },
};

export default App;
