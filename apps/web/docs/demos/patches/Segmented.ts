import type { DomphyElement } from "@domphy/core";
import { segmented } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: null,
  $: [segmented({
    value: "month",
    items: [
      { label: "Day", key: "day" },
      { label: "Week", key: "week" },
      { label: "Month", key: "month" },
      { label: "Year", key: "year" },
    ],
  })],
};

export default App;
