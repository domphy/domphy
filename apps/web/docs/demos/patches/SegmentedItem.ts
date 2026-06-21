import type { DomphyElement } from "@domphy/core";
import { segmented, segmentedItem } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: [
    {
      button: "Day",
      _key: "day",
      $: [segmentedItem()],
    },
    {
      button: "Week",
      _key: "week",
      $: [segmentedItem()],
    },
    {
      button: "Month",
      _key: "month",
      $: [segmentedItem()],
    },
    {
      button: "Year",
      _key: "year",
      $: [segmentedItem()],
    },
  ],
  $: [segmented({ value: "week" })],
};

export default App;
