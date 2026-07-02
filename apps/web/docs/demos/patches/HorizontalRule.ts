import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { horizontalRule, paragraph } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    {
      p: "Section A content",
      $: [paragraph()],
    },
    {
      hr: null,
      $: [horizontalRule()],
      // Decorative divider, no text content — missing-color has nothing to color.
      _doctorDisable: "missing-color",
    },
    {
      p: "Section B content",
      $: [paragraph()],
    },
    {
      hr: null,
      $: [horizontalRule({ color: "primary" })],
      // Decorative divider, no text content — missing-color has nothing to color.
      _doctorDisable: "missing-color",
    },
    {
      p: "Section C content",
      $: [paragraph()],
    },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(2),
  },
};

export default App;
