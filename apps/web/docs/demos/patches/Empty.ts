import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { button, empty, heading, paragraph, small } from "@domphy/ui";

const noItems: DomphyElement<"div"> = {
  div: [
    { span: "📭" },
    { p: "No items yet", $: [paragraph()] },
    { span: "Add your first item to get started", $: [small()] },
    { button: "Add item", $: [button({ color: "primary" })] },
  ],
  $: [empty()],
};

const noResults: DomphyElement<"div"> = {
  div: [
    { span: "🔍" },
    { h2: "No results found", $: [heading()] },
    { span: "Try adjusting your search or filters", $: [small()] },
  ],
  $: [empty({ color: "neutral" })],
};

const App: DomphyElement<"div"> = {
  div: [noItems, noResults],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(4),
    maxWidth: themeSpacing(120),
  },
};

export default App;
