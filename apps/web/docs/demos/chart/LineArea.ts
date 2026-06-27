import { type DomphyElement } from "@domphy/core";
import { chart } from "@domphy/chart";
import type { ChartOption, GradientObject } from "@domphy/chart";

const revenueGradient: GradientObject = {
  type: "linear",
  x: 0,
  y: 0,
  x2: 0,
  y2: 1,
  colorStops: [
    { offset: 0, color: "rgba(58,77,233,0.4)" },
    { offset: 1, color: "rgba(58,77,233,0)" },
  ],
};

const costsGradient: GradientObject = {
  type: "linear",
  x: 0,
  y: 0,
  x2: 0,
  y2: 1,
  colorStops: [
    { offset: 0, color: "rgba(233,100,58,0.4)" },
    { offset: 1, color: "rgba(233,100,58,0)" },
  ],
};

const option: ChartOption = {
  legend: {},
  tooltip: { trigger: "axis" },
  xAxis: {
    type: "category",
    boundaryGap: false,
    data: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
  yAxis: {
    type: "value",
    name: "USD (k)",
  },
  series: [
    {
      type: "line",
      name: "Revenue",
      smooth: true,
      areaStyle: { color: revenueGradient },
      data: [320, 380, 420, 390, 460, 510, 490, 580, 540, 620, 600, 680],
    },
    {
      type: "line",
      name: "Costs",
      smooth: true,
      areaStyle: { color: costsGradient },
      data: [280, 310, 340, 330, 360, 390, 380, 420, 410, 450, 440, 480],
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
