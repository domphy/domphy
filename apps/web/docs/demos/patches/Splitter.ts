import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { splitter, splitterHandle, splitterPanel } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    { div: "Left panel", $: [splitterPanel()] },
    {
      div: null,
      $: [splitterHandle()],
      style: { width: themeSpacing(1) },
      // Decorative drag handle, no text content — "missing-color" would
      // otherwise ask for a color that has nothing to apply to.
      _doctorDisable: "missing-color",
    },
    { div: "Right panel", $: [splitterPanel()] },
  ],
  $: [splitter()],
  style: { height: themeSpacing(75) },
};

export default App;
