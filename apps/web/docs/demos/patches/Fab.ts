import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { fab } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    { button: "+", $: [fab({ size: "small" })] },
    { button: "+", $: [fab()] },
    { button: "+", $: [fab({ size: "large" })] },
    { button: "✏️", $: [fab({ color: "neutral" })] },
    { button: "🗑", $: [fab({ color: "danger" })] },
  ],
  style: { display: "flex", alignItems: "center", gap: themeSpacing(4) },
};

export default App;
