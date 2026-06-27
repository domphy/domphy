import { type DomphyElement } from "@domphy/core";
import { chart } from "@domphy/chart";
import type { ChartOption } from "@domphy/chart";

const gdpData = [
  { name: "United States",   value: 25.5 },
  { name: "China",           value: 17.7 },
  { name: "Japan",           value:  4.2 },
  { name: "Germany",         value:  4.1 },
  { name: "India",           value:  3.5 },
  { name: "United Kingdom",  value:  3.1 },
  { name: "France",          value:  2.8 },
  { name: "Italy",           value:  2.2 },
  { name: "Brazil",          value:  2.1 },
  { name: "Canada",          value:  2.0 },
];

const option: ChartOption = {
  title: { text: "World GDP (trillion USD)", left: "center" },
  tooltip: {
    trigger: "item",
    formatter: (params: any) =>
      `${params.name}: $${params.value ?? "N/A"} T`,
  },
  visualMap: {
    type: "continuous",
    min: 0,
    max: 26,
    left: "left",
    bottom: 20,
    text: ["High", "Low"],
    calculable: true,
    inRange: { color: ["#e0f3f8", "#74add1", "#4575b4", "#313695"] },
  },
  series: [
    {
      type: "map",
      map: "world",
      roam: true,
      name: "GDP",
      data: gdpData,
      label: { show: false },
      emphasis: { label: { show: true } },
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
