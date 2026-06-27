import { type DomphyElement } from "@domphy/core";
import { chart } from "@domphy/chart";
import type { ChartOption } from "@domphy/chart";

const salesData = [
  { name: "Electronics", value: 1048 },
  { name: "Clothing",    value: 735 },
  { name: "Groceries",   value: 580 },
  { name: "Sports",      value: 484 },
  { name: "Books",       value: 300 },
];

const option: ChartOption = {
  legend: {
    top: "4%",
    left: "center",
    data: salesData.map((d) => d.name),
  },
  tooltip: { trigger: "item" },
  series: [
    {
      type: "pie",
      name: "Sales",
      center: ["25%", "58%"],
      radius: "52%",
      label: { formatter: "{b}\n{d}%" },
      data: salesData,
    },
    {
      type: "pie",
      name: "Sales (Rose)",
      center: ["75%", "58%"],
      radius: ["18%", "58%"],
      roseType: "radius",
      label: { formatter: "{b}\n{d}%" },
      data: salesData,
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
