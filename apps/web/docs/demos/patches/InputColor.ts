import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { inputColor, label } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    {
      label: [
        "Primary color",
        {
          input: null,
          value: "#4f7cff",
          $: [inputColor()],
          // Decorative color swatch, no text content — "missing-color" would
          // otherwise ask for a color that has nothing to apply to.
          _doctorDisable: "missing-color",
        },
      ],
      $: [label()],
    },
    {
      label: [
        "Accent color",
        {
          input: null,
          value: "#2bc5a1",
          $: [inputColor({ accentColor: "secondary" })],
          // Decorative color swatch, no text content — "missing-color" would
          // otherwise ask for a color that has nothing to apply to.
          _doctorDisable: "missing-color",
        },
      ],
      $: [label()],
    },
  ],
  style: {
    display: "flex",
    flexWrap: "wrap",
    rowGap: themeSpacing(4),
    columnGap: themeSpacing(6),
  },
};

export default App;
