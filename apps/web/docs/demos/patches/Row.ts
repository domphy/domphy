import type { DomphyElement } from "@domphy/core";
import { themeColor, themeSpacing } from "@domphy/theme";
import { buttonGhost, row, stack, tag } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    // Icon + label row (row's default: centered, gap 4).
    {
      div: [{ span: "★" }, { span: "Starred" }],
      $: [row()],
    },
    // Toolbar-style row: content on the left, an action pinned to the right.
    {
      div: [
        { span: "Draft saved" },
        { button: "Publish", $: [buttonGhost({ color: "primary" })] },
      ],
      $: [row({ justify: "space-between" })],
    },
    // Wrapping tag row — a tight gap, wraps onto multiple lines.
    {
      div: [
        { span: "Design", $: [tag({ color: "primary" })] },
        { span: "Layout", $: [tag()] },
        { span: "Docs", $: [tag()] },
      ],
      $: [row({ gap: 2, wrap: true })],
    },
  ],
  $: [stack({ gap: 4 })],
  style: { color: (l) => themeColor(l, "shift-9"), maxWidth: themeSpacing(96) },
};

export default App;
