import type { DomphyElement } from "@domphy/core";
import { tabs } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: null,
  $: [
    tabs({
      items: [
        {
          label: "Overview",
          content: { p: "Overview content" } as DomphyElement<"p">,
        },
        {
          label: "Usage",
          content: { p: "Usage content" } as DomphyElement<"p">,
        },
        { label: "API", content: { p: "API content" } as DomphyElement<"p"> },
        {
          label: "Examples",
          content: { p: "Examples content" } as DomphyElement<"p">,
        },
      ],
    }),
  ],
};

export default App;
