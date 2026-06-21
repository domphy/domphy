import { type DomphyElement, toState } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { button, dialog, heading } from "@domphy/ui";

const open = toState(false);

const alertDialog: DomphyElement<"dialog"> = {
  dialog: [
    { h3: "Delete item?", $: [heading()] },
    { p: "This action cannot be undone." },
    {
      div: [
        { button: "Cancel", $: [button()], onClick: () => open.set(false) },
        {
          button: "Delete",
          $: [button({ color: "error" })],
          onClick: () => open.set(false),
        },
      ],
      style: {
        display: "flex",
        justifyContent: "flex-end",
        gap: themeSpacing(2),
        marginTop: themeSpacing(4),
      },
    },
  ],
  $: [dialog({ open })],
};

const App: DomphyElement<"div"> = {
  div: [
    {
      button: "Delete item",
      $: [button({ color: "error" })],
      onClick: () => open.set(true),
    },
    alertDialog,
  ],
  style: { display: "flex", flexDirection: "column", gap: themeSpacing(4) },
};

export default App;
