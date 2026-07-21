import type { ChartOption } from "@domphy/chart";
import { chart } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";

const option: ChartOption = {
  legend: {
    data: ["Revenue", "Profit"],
    top: "4%",
  },
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "cross" },
  },
  grid: {
    left: "3%",
    right: "5%",
    top: "16%",
    bottom: "3%",
    containLabel: true,
  },
  xAxis: {
    type: "category",
    data: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    boundaryGap: true,
  },
  yAxis: { type: "value" },
  series: [
    {
      type: "bar",
      name: "Revenue",
      data: [420, 380, 510, 470, 530, 495],
      barWidth: "40%",
    },
    {
      type: "line",
      name: "Profit",
      data: [82, 74, 110, 95, 128, 104],
      smooth: true,
      symbolSize: 6,
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
