import type { DomphyElement } from "@domphy/core";
import { menu } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: null,
  $: [menu({
    items: [
      { label: "Home" },
      { label: "About" },
      { label: "Services" },
      { label: "Portfolio" },
      { label: "Contact" },
    ],
  })],
};

export default App;
