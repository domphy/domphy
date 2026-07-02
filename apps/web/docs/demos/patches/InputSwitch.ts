import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { inputSwitch } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    {
      input: null,
      // Decorative switch track/knob, no text content — "missing-color" would
      // otherwise ask for a color that has nothing to apply to.
      _doctorDisable: "missing-color",
      $: [inputSwitch()],
    },
    {
      input: null,
      disabled: true,
      // Decorative switch track/knob, no text content — "missing-color" would
      // otherwise ask for a color that has nothing to apply to.
      _doctorDisable: "missing-color",
      $: [inputSwitch()],
    },
    {
      input: null,
      checked: true,
      // Decorative switch track/knob, no text content — "missing-color" would
      // otherwise ask for a color that has nothing to apply to.
      _doctorDisable: "missing-color",
      $: [inputSwitch()],
    },
    {
      input: null,
      checked: true,
      disabled: true,
      // Decorative switch track/knob, no text content — "missing-color" would
      // otherwise ask for a color that has nothing to apply to.
      _doctorDisable: "missing-color",
      $: [inputSwitch()],
    },
  ],
  style: {
    display: "flex",
    flexWrap: "wrap",
    rowGap: themeSpacing(4),
    columnGap: themeSpacing(4),
  },
};

export default App;
