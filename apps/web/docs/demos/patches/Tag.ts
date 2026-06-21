import type { DomphyElement } from "@domphy/core";
import { themeSpacing } from "@domphy/theme";
import { tag } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    { span: "Default", $: [tag()] },
    { span: "Primary", $: [tag({ color: "primary" })] },
    { span: "Success", $: [tag({ color: "success" })] },
    { span: "Removable", $: [tag({ removable: true })] },
    { span: "Danger", $: [tag({ color: "danger", removable: true })] },
  ],
  style: {
    display: "flex",
    flexWrap: "wrap",
    gap: themeSpacing(2),
  },
};

export default App;
