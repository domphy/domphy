import { DomphyElement } from "@domphy/core";
import { badge, button } from "@domphy/ui";

const App: DomphyElement<"button"> = {
  button: "Inbox",
  $: [button(), badge({ label: 12 })],
};

export default App;

