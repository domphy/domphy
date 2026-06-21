import type { DomphyElement } from "@domphy/core";
import { toState } from "@domphy/core";
import { toggle, toggleGroup } from "@domphy/ui";

const selected = toState<string[]>([], "selected");

const App: DomphyElement<"div"> = {
  div: {
    div: [
      // Single-select example
      {
        div: {
          div: ["Bold", "Italic", "Underline"].map((label) => ({
            button: label,
            _key: label.toLowerCase(),
            $: [toggle()],
          })),
          $: [toggleGroup({ value: "bold" })],
        },
      },
      // Multi-select example
      {
        div: {
          div: ["B", "I", "U", "S"].map((label) => ({
            button: label,
            _key: label.toLowerCase(),
            $: [toggle()],
          })),
          $: [toggleGroup({ value: selected, multiple: true })],
        },
      },
      // Colored accent example
      {
        div: {
          div: ["Left", "Center", "Right"].map((label) => ({
            button: label,
            _key: label.toLowerCase(),
            $: [toggle({ accentColor: "success" })],
          })),
          $: [toggleGroup({ color: "neutral" })],
        },
      },
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    },
  },
};

export default App;
