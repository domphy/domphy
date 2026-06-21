import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { inputText } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    {
      input: null,
      placeholder: "Placeholder",
      $: [inputText()],
    },
    {
      input: null,
      disabled: true,
      $: [inputText()],
    },
    {
      input: null,
      value: "Value Available",
      $: [inputText()],
    },
    {
      input: null,
      value: "Disable",
      disabled: true,
      $: [inputText()],
    },
    {
      input: null,
      value: "Error state",
      "data-status": "error",
      $: [inputText()],
    },
  ],
  style: {
    display: "flex",
    flexWrap: "wrap",
    rowGap: themeSpacing(9),
    columnGap: themeSpacing(4),
  },
};

export default App;
