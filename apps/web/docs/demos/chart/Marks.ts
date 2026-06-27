import { type DomphyElement } from "@domphy/core";
import { chart } from "@domphy/chart";
import type { ChartOption } from "@domphy/chart";

const option: ChartOption = {
  title: { text: "Monthly Temperature" },
  tooltip: { trigger: "axis" },
  xAxis: {
    type: "category",
    data: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
  yAxis: {
    type: "value",
    name: "°C",
  },
  series: [
    {
      type: "line",
      name: "Temperature",
      smooth: true,
      data: [8, 12, 18, 24, 29, 32, 35, 34, 27, 20, 13, 7],
      markPoint: {
        data: [
          { type: "max", name: "Max" },
          { type: "min", name: "Min" },
        ],
      },
      markLine: {
        data: [
          [{ type: "average" }, { type: "average" }],
          [{ yAxis: 25 }, { yAxis: 25, xAxis: "Dec" }],
        ],
      },
      markArea: {
        data: [[{ xAxis: "Jun" }, { xAxis: "Aug" }]],
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
