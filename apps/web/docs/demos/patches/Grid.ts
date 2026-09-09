import type { DomphyElement, Listener } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { grid, panelSection, stack } from "@domphy/ui";

const box: DomphyElement<"div"> = {
  div: null,
  style: {
    height: themeSpacing(16),
    borderRadius: themeSpacing(1),
    backgroundColor: (l) => themeColor(l, "shift-3"),
  },
};

const frame = {
  outline: (listener: Listener) =>
    `1px solid ${themeColor(listener, "shift-3")}`,
  borderRadius: themeSpacing(2),
};

const App: DomphyElement<"div"> = {
  div: [
    // Equal 2-column grid (columns: 2 → repeat(2, minmax(0, 1fr))).
    {
      div: [{ ...box }, { ...box }, { ...box }, { ...box }],
      $: [grid({ columns: 2 }), panelSection()],
      style: frame,
    },
    // Raw template: auto-fill tracks, larger gap, centered on the block axis.
    {
      div: [
        { ...box },
        { ...box },
        { ...box },
        { ...box },
        { ...box },
        { ...box },
      ],
      $: [
        grid({
          columns: "repeat(auto-fill, minmax(12em, 1fr))",
          gap: 6,
          align: "center",
        }),
        panelSection(),
      ],
      style: frame,
    },
  ],
  $: [stack({ gap: 4 })],
  style: { maxWidth: themeSpacing(96) },
};

export default App;
