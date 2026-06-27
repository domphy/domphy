import type { DomphyElement } from "@domphy/core";
import { toState } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { button, formGroup, inputPassword, label } from "@domphy/ui";

const App: DomphyElement<"form"> = {
  form: [
    {
      div: [
        { label: "Password", $: [label()] },
        { div: null, $: [inputPassword()] },
      ],
      $: [formGroup()],
    },
    {
      div: [
        { label: "Confirm", $: [label()] },
        { div: null, $: [inputPassword({ accentColor: "success" })] },
      ],
      $: [formGroup()],
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
