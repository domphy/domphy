import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { inputCheckbox, inputText, label } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    {
      label: [
        "Email",
        {
          input: null,
          placeholder: "name@example.com",
          $: [inputText()],
        },
      ],
      $: [label()],
    },
    {
      label: [
        {
          input: null,
          checked: true,
          $: [inputCheckbox()],
        },
        "Subscribe newsletter",
      ],
      $: [label({ accentColor: "secondary" })],
    },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(3),
  },
};

export default App;
