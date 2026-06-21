import type { DomphyElement } from "@domphy/core";
import { segmented, segmentedItem } from "@domphy/ui";

const periods = ["Day", "Week", "Month", "Year"];

const App: DomphyElement<"div"> = {
  div: {
    div: periods.map((label) => ({
      button: label,
      _key: label.toLowerCase(),
      $: [segmentedItem()],
    })),
    $: [segmented({ value: "month" })],
  },
};

export default App;
