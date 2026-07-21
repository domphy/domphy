import type { DomphyElement, Listener } from "@domphy/core";
import { themeColor } from "@domphy/theme";
import { segmented } from "@domphy/ui";

const App: DomphyElement<"div"> = {
  div: null,
  style: {
    color: (l: Listener) => themeColor(l, "shift-9"),
  },
  $: [
    segmented({
      value: "month",
      items: [
        { label: "Day", key: "day" },
        { label: "Week", key: "week" },
        { label: "Month", key: "month" },
        { label: "Year", key: "year" },
      ],
    }),
  ],
};

export default App;
