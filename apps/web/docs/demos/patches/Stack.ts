import type { DomphyElement, Listener } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { panelSection, row, stack } from "@domphy/ui";

const frame = {
  width: themeSpacing(48),
  outline: (listener: Listener) =>
    `1px solid ${themeColor(listener, "shift-3")}`,
  borderRadius: themeSpacing(2),
  color: (listener: Listener) => themeColor(listener, "text"),
};

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
      style: frame,
    },
    {
      div: [{ ...box }, { ...box }, { ...box }],
      $: [stack({ gap: 6, align: "center" }), panelSection()],
      style: frame,
    },
  ],
  $: [row({ align: "stretch", wrap: true })],
};

export default App;
