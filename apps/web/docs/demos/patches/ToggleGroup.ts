import { type DomphyElement, toState } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { toggleGroup } from "@domphy/ui";

const selected = toState<string[]>([], "selected");

const App: DomphyElement<"div"> = {
  div: [
    {
      div: null,
      $: [toggleGroup({
        value: "bold",
        items: [
          { label: "Bold", key: "bold" },
          { label: "Italic", key: "italic" },
          { label: "Underline", key: "underline" },
        ],
      })],
    },
    {
      div: null,
      $: [toggleGroup({
        value: selected,
        multiple: true,
        items: [
          { label: "B", key: "b" },
          { label: "I", key: "i" },
          { label: "U", key: "u" },
          { label: "S", key: "s" },
        ],
      })],
    },
    {
      div: null,
      $: [toggleGroup({
        color: "neutral",
        items: [
          { label: "Left", key: "left" },
          { label: "Center", key: "center" },
          { label: "Right", key: "right" },
        ],
      })],
    },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(4),
  },
};

export default App;
