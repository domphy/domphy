import type { DomphyElement } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { button, formGroup, inputPassword, label } from "@domphy/ui";

const App: DomphyElement<"form"> = {
  form: [
    {
      fieldset: [
        { label: "Password", $: [label()] },
        { div: null, $: [inputPassword()] },
      ],
      $: [formGroup()],
      style: { color: (listener) => themeColor(listener, "shift-9") },
    },
    {
      fieldset: [
        { label: "Confirm", $: [label()] },
        { div: null, $: [inputPassword({ accentColor: "success" })] },
      ],
      $: [formGroup()],
      style: { color: (listener) => themeColor(listener, "shift-9") },
    },
    {
      button: "Submit",
      type: "submit",
      $: [button({ color: "primary" })],
    },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(4),
    maxWidth: themeSpacing(64),
  },
};

export default App;
