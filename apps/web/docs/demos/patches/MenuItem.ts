import type { DomphyElement } from "@domphy/core";
import { menu, menuItem } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    { button: "Profile", $: [menuItem()] },
    { button: "Settings", $: [menuItem()] },
    { button: "Help", $: [menuItem({ accentColor: "info" })] },
    { button: "Sign out", $: [menuItem({ accentColor: "danger" })] },
  ],
  $: [menu()],
  style: { width: "12rem" },
};

export default App;
