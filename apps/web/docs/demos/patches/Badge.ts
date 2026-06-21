import type { DomphyElement } from "@domphy/core";
import { badge, button } from "@domphy/ui";

const App: DomphyElement<"span"> = {
  span: [{ button: "Inbox", $: [button()] }],
  $: [badge({ label: 12 })],
};

export default App;
