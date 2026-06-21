import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { command, commandItem, commandSearch } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    { input: null, $: [commandSearch()], placeholder: "Search..." },
    { button: "New File", $: [commandItem()] },
    { button: "Open Folder", $: [commandItem()] },
    { button: "Save As...", $: [commandItem()] },
    { button: "Run Tests", $: [commandItem()] },
    { button: "Close Editor", $: [commandItem()] },
  ],
  $: [command()],
  style: { width: themeSpacing(60) },
};

export default App;
