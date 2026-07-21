import type { ChartOption } from "@domphy/chart";
import { chart } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";

// Sorted ascending by renewable energy share
const countries = [
  "India",
  "US",
  "Japan",
  "France",
  "China",
  "Australia",
  "UK",
  "Spain",
  "Germany",
  "Denmark",
];
const values = [20, 20, 22, 24, 28, 35, 40, 43, 46, 80];

const option: ChartOption = {
  title: { text: "Renewable Energy Share (%)" },
  tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
  grid: {
    left: "3%",
    right: "10%",
    top: "12%",
    bottom: "3%",
    containLabel: true,
  },
  xAxis: { type: "value", max: 100 },
  yAxis: { type: "category", data: countries },
  series: [
    {
      type: "bar",
      name: "Renewable %",
      data: values,
      barMaxWidth: 30,
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      label: {
        show: true,
        position: "right",
        formatter: "{c}%",
      },
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
