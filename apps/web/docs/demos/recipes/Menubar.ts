import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { button, menu, popover } from "@domphy/ui";

const fileMenu: DomphyElement<"div"> = {
  div: null,
  $: [
    menu({
      selectable: false,
      items: [
        { label: "New File" },
        { label: "Open..." },
        { label: "Save" },
        { label: "Save As..." },
      ],
    }),
  ],
};

const editMenu: DomphyElement<"div"> = {
  div: null,
  $: [
    menu({
      selectable: false,
      items: [
        { label: "Undo" },
        { label: "Redo" },
        { label: "Cut" },
        { label: "Copy" },
        { label: "Paste" },
      ],
    }),
  ],
};

const viewMenu: DomphyElement<"div"> = {
  div: null,
  $: [
    menu({
      selectable: false,
      items: [{ label: "Zoom In" }, { label: "Zoom Out" }, { label: "Reset" }],
    }),
  ],
};

const App: DomphyElement<"nav"> = {
  nav: [
    {
      button: "File",
      $: [button(), popover({ openOn: "hover", content: fileMenu })],
    },
    {
      button: "Edit",
      $: [button(), popover({ openOn: "hover", content: editMenu })],
    },
    {
      button: "View",
      $: [button(), popover({ openOn: "hover", content: viewMenu })],
    },
  ],
  style: { display: "flex", gap: themeSpacing(0) },
};

export default App;
