import type { DomphyElement } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { panelSection, row, stack } from "@domphy/ui";

const box: DomphyElement<"div"> = {
  div: null,
  style: {
    width: "100%",
    height: themeSpacing(8),
    borderRadius: themeSpacing(1),
    backgroundColor: (l) => themeColor(l, "shift-3"),
  },
};

const App: DomphyElement<"div"> = {
  div: [
    {
      div: [{ ...box }, { ...box }, { ...box }],
      $: [stack(), panelSection()],
      style: {
        width: themeSpacing(48),
        outline: (l) => `1px solid ${themeColor(l, "shift-3")}`,
        borderRadius: themeSpacing(2),
      },
    },
    {
      div: [{ ...box }, { ...box }, { ...box }],
      $: [stack({ gap: 6, align: "center" }), panelSection()],
      style: {
        width: themeSpacing(48),
        outline: (l) => `1px solid ${themeColor(l, "shift-3")}`,
        borderRadius: themeSpacing(2),
      },
    },
  ],
  $: [row({ align: "stretch", wrap: true })],
};

export default App;
