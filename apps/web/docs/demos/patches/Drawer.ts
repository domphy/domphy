import { type DomphyElement, toState } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { button, drawer } from "@domphy/ui";

const open = toState(false);

const App: DomphyElement<"div"> = {
  div: [
    {
      button: "Open Drawer",
      $: [button()],
      onClick: () => open.set(true),
    },
    {
      dialog: [
        { p: "Drawer content" },
        {
          button: "Close",
          $: [button({ color: "primary" })],
          onClick: () => open.set(false),
        },
      ],
      $: [drawer({ open, placement: "right" })],
    },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    alignItems: "start",
    gap: themeSpacing(4),
  },
};

export default App;
