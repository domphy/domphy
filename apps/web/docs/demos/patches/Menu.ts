import type { DomphyElement } from "@domphy/core";
import { menu, menuItem } from "@domphy/ui";

const items = ["Home", "About", "Services", "Portfolio", "Contact"];

const App: DomphyElement<"div"> = {
  div: items.map((label) => ({
    button: label,
    $: [menuItem()],
  })),
  $: [menu()],
};

export default App;
