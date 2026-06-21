import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { datePicker, inputText, label } from "@domphy/ui";

function field(labelText: string, input: DomphyElement): DomphyElement<"div"> {
  return {
    div: [{ label: labelText, $: [label()] }, input],
    style: {
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(1),
    },
  };
}

const App: DomphyElement<"div"> = {
  div: [
    field("Single date", {
      input: null,
      placeholder: "Pick a date",
      $: [inputText(), datePicker()],
    }),
    field("Date range", {
      input: null,
      placeholder: "Pick a range",
      $: [inputText(), datePicker({ mode: "range" })],
    }),
    field("Date + time", {
      input: null,
      placeholder: "Pick date & time",
      $: [inputText(), datePicker({ time: true })],
    }),
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(6),
    maxWidth: themeSpacing(88),
  },
};

export default App;
