import type { DomphyElement } from "@domphy/core";
import { stepItem, steps } from "@domphy/ui";

// Static 3-step indicator with step 1 active (0-indexed)
const App: DomphyElement<"ol"> = {
  ol: [
    { li: "Account", $: [stepItem()] },
    { li: "Details", $: [stepItem()] },
    { li: "Payment", $: [stepItem()] },
  ],
  $: [steps({ current: 1 })],
};

export default App;
