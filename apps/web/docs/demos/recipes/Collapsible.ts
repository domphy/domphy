import { type DomphyElement, toState } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { button, details } from "@domphy/ui";

const open = toState(false);

const App: DomphyElement<"div"> = {
  div: [
    {
      button: "Toggle section",
      $: [button()],
      onClick: () => open.set(!open.get()),
    },
    {
      details: [
        { summary: "Section Title" },
        {
          p: "This content is controlled programmatically via state — no click on summary needed.",
        },
      ],
      $: [details()],
      open: (listener) => open.get(listener),
    },
  ],
  style: { display: "flex", flexDirection: "column", gap: themeSpacing(4) },
};

export default App;
