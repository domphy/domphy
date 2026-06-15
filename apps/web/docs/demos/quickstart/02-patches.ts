import type { DomphyElement } from "@domphy/core";
import { button, card, heading, paragraph, tag } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    { h2: "Patches in action", $: [heading()] },
    {
      div: [
        { h4: "What is a patch?", $: [heading()] },
        {
          p: "A function that adds styling, spacing, and behavior to any element.",
          $: [paragraph()],
        },
        { aside: "new", $: [tag({ color: "success" })] },
        {
          footer: [
            { button: "Primary", $: [button({ color: "primary" })] },
            { button: "Default", $: [button()] },
          ],
        },
      ],
      $: [card()],
    },
  ],
};

export default App;
