import { type DomphyElement } from "@domphy/core";
import { chart } from "@domphy/chart";
import type { ChartOption } from "@domphy/chart";

const option: ChartOption = {
  dataset: {
    source: [
      ["Month", "Revenue", "Costs", "Profit"],
      ["Jan", 320, 280, 40],
      ["Feb", 380, 310, 70],
      ["Mar", 420, 340, 80],
      ["Apr", 390, 330, 60],
      ["May", 460, 360, 100],
      ["Jun", 510, 390, 120],
      ["Jul", 490, 380, 110],
      ["Aug", 580, 420, 160],
      ["Sep", 540, 410, 130],
      ["Oct", 620, 450, 170],
      ["Nov", 600, 440, 160],
      ["Dec", 680, 480, 200],
    ],
  },
  xAxis: { type: "category" },
  yAxis: { type: "value" },
  legend: {},
  tooltip: { trigger: "axis" },
  series: [
    { type: "bar", name: "Revenue", encode: { x: "Month", y: "Revenue" } },
    { type: "bar", name: "Costs", encode: { x: "Month", y: "Costs" } },
    { type: "line", name: "Profit", encode: { x: "Month", y: "Profit" } },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
