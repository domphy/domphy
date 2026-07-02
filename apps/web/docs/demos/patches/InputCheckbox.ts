import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { inputCheckbox } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    {
      input: null,
      // Checkbox control has no text content — color doesn't apply.
      _doctorDisable: "missing-color",
      $: [inputCheckbox()],
    },
    {
      input: null,
      disabled: true,
      // Checkbox control has no text content — color doesn't apply.
      _doctorDisable: "missing-color",
      $: [inputCheckbox()],
    },
    {
      input: null,
      checked: true,
      // Checkbox control has no text content — color doesn't apply.
      _doctorDisable: "missing-color",
      $: [inputCheckbox()],
    },
    {
      input: null,
      checked: true,
      disabled: true,
      // Checkbox control has no text content — color doesn't apply.
      _doctorDisable: "missing-color",
      $: [inputCheckbox()],
    },
    {
      input: null,
      _onMount: (node) =>
        ((node.domElement as HTMLInputElement).indeterminate = true),
      // Checkbox control has no text content — color doesn't apply.
      _doctorDisable: "missing-color",
      $: [inputCheckbox()],
    },
    {
      input: null,
      disabled: true,
      _onMount: (node) =>
        ((node.domElement as HTMLInputElement).indeterminate = true),
      // Checkbox control has no text content — color doesn't apply.
      _doctorDisable: "missing-color",
      $: [inputCheckbox()],
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
