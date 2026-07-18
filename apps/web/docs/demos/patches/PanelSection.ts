import type { DomphyElement } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { panelSection, stack } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    {
      div: [{ h4: "Parameters" }, { p: "Width, height, and material inputs." }],
      $: [stack({ gap: 1 }), panelSection({ divider: true })],
    },
    {
      div: [{ h4: "Operations" }, { p: "Generators and modifiers, in order." }],
      $: [stack({ gap: 1 }), panelSection({ divider: true })],
    },
    {
      div: [{ h4: "Textures" }, { p: "Materials applied across the scene." }],
      $: [stack({ gap: 1 }), panelSection()],
    },
  ],
  $: [stack({ gap: 0 })],
  style: {
    width: themeSpacing(96),
    outline: (l) => `1px solid ${themeColor(l, "shift-3")}`,
    borderRadius: themeSpacing(2),
    overflow: "hidden",
  },
};

export default App;
