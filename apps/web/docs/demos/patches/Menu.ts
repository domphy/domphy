import type { DomphyElement } from "@domphy/core";
import { menu } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: null,
  $: [
    menu({
      items: [
        { label: "Home" },
        { label: "About" },
        { label: "Services" },
        { label: "Portfolio" },
        { label: "Contact" },
      ],
    }),
  ],
  // Text color is set by the menuitem buttons the menu() patch renders —
  // the outer container itself carries no text.
  _doctorDisable: "missing-color",
};

export default App;
