import { type DomphyElement } from "@domphy/core";
import { chart } from "@domphy/chart";
import type { ChartOption } from "@domphy/chart";

// [x, y, bubble-area] — symbolSize maps area → radius via sqrt
const bubbleData: [number, number, number][] = [
  [10, 25, 40],  [18, 42, 80],  [30, 15, 55],  [45, 60, 120],
  [22, 35, 30],  [55, 80, 200], [12, 50, 70],  [60, 20, 90],
  [38, 70, 150], [70, 45, 60],  [25, 55, 100], [48, 30, 45],
  [15, 65, 85],  [65, 55, 130], [35, 40, 65],  [50, 75, 110],
  [80, 30, 75],  [20, 80, 95],  [42, 48, 55],  [72, 68, 160],
  [5,  30, 35],  [58, 90, 180], [33, 22, 50],  [90, 50, 140],
  [68, 12, 60],  [44, 85, 170], [16, 10, 25],  [82, 75, 190],
  [28, 60, 115], [53, 38, 95],
];

const option: ChartOption = {
  tooltip: {
    trigger: "item",
    formatter: (params: any) => {
      const [x, y, area] = params.value as [number, number, number];
      return `x: ${x}<br/>y: ${y}<br/>area: ${area}`;
    },
  },
  grid: { left: "5%", right: "5%", top: "8%", bottom: "8%", containLabel: true },
  xAxis: { type: "value", scale: true, name: "X", nameLocation: "end" },
  yAxis: { type: "value", scale: true, name: "Y", nameLocation: "end" },
  series: [
    {
      type: "scatter",
      name: "Bubbles",
      data: bubbleData,
      symbolSize: (val: any) => Math.sqrt((val as number[])[2]) * 4,
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
