import type { DomphyElement } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { scrollArea } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    {
      div: Array.from({ length: 20 }, (_, i) => ({
        div: `Item ${i + 1}`,
        _key: i,
        style: {
          padding: themeSpacing(3),
          borderBottom: (l) =>
            `1px solid ${themeColor(l, "shift-3")}`,
        },
      })),
      $: [scrollArea()],
      style: {
        maxHeight: themeSpacing(48),
        outline: (l) => `1px solid ${themeColor(l, "shift-3")}`,
        borderRadius: themeSpacing(2),
      },
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
