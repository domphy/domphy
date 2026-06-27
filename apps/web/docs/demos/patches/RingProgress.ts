import type { DomphyElement } from "@domphy/core";
import { toState } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { button, ringProgress, small } from "@domphy/ui";

const value = toState(65);

const App: DomphyElement<"div"> = {
  div: [
    {
      div: [
        { div: null, $: [ringProgress({ value, color: "primary" })] },
        { div: null, $: [ringProgress({ value, color: "success", size: 20 })] },
        {
          div: null,
          $: [ringProgress({ value, color: "warning", size: 12, thickness: 0.4 })],
        },
      ],
      style: {
        display: "flex",
        alignItems: "center",
        gap: themeSpacing(6),
        flexWrap: "wrap",
      },
    },
    {
      div: [
        {
          button: "−",
          $: [button({ color: "neutral" })],
          onClick: () => value.set(Math.max(0, value.get() - 10)),
        },
        { span: (l) => `${value.get(l)}%`, $: [small()] },
        {
          button: "+",
          $: [button({ color: "primary" })],
          onClick: () => value.set(Math.min(100, value.get() + 10)),
        },
      ],
      style: { display: "flex", alignItems: "center", gap: themeSpacing(3) },
    },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(6),
  },
};

export default App;
