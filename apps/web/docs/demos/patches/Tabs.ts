import type { DomphyElement } from "@domphy/core";
import { tab, tabPanel, tabs } from "@domphy/ui";

const labels = ["Overview", "Usage", "API", "Examples"];

// tabs(), tab(), and tabPanel() must all share the same direct parent so that
// the ARIA id/aria-controls/aria-labelledby wiring resolves correctly.
const App: DomphyElement<"div"> = {
  div: [
    ...labels.map((label, i) => ({
      button: label,
      _key: i,
      $: [tab()],
    })),
    ...labels.map((label, i) => ({
      div: `Content for ${label}`,
      _key: i,
      $: [tabPanel()],
    })),
  ],
  $: [tabs()],
};

export default App;
