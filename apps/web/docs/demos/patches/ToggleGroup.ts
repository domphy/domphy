import { type DomphyElement, toState } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { toggle, toggleGroup } from "@domphy/ui";

const selected = toState<string[]>([], "selected");

const App: DomphyElement<"div"> = {
  div: [
    {
      div: ["Bold", "Italic", "Underline"].map((label) => ({
        button: label,
        _key: label.toLowerCase(),
        $: [toggle()],
      })),
      $: [toggleGroup({ value: "bold" })],
    },
    {
      div: ["B", "I", "U", "S"].map((label) => ({
        button: label,
        _key: label.toLowerCase(),
        $: [toggle()],
      })),
      $: [toggleGroup({ value: selected, multiple: true })],
    },
    {
      div: ["Left", "Center", "Right"].map((label) => ({
        button: label,
        _key: label.toLowerCase(),
        $: [toggle({ accentColor: "success" })],
      })),
      $: [toggleGroup({ color: "neutral" })],
    },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(4),
  },
};

export default App;
