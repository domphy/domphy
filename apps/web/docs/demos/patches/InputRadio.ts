import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { inputRadio } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    {
      input: null,
      // Radio control has no text content — color doesn't apply.
      _doctorDisable: "missing-color",
      $: [inputRadio()],
    },
    {
      input: null,
      disabled: true,
      // Radio control has no text content — color doesn't apply.
      _doctorDisable: "missing-color",
      $: [inputRadio()],
    },
    {
      input: null,
      checked: true,
      // Radio control has no text content — color doesn't apply.
      _doctorDisable: "missing-color",
      $: [inputRadio()],
    },
    {
      input: null,
      checked: true,
      disabled: true,
      // Radio control has no text content — color doesn't apply.
      _doctorDisable: "missing-color",
      $: [inputRadio()],
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
