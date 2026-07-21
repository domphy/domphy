import type { ChartOption } from "@domphy/chart";
import { chart } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";

const option: ChartOption = {
  title: { text: "Boxplot" },
  tooltip: {
    trigger: "item",
    formatter: (params: any) => {
      const v = params.data;
      return `${params.name}<br/>Min: ${v[0]}<br/>Q1: ${v[1]}<br/>Median: ${v[2]}<br/>Q3: ${v[3]}<br/>Max: ${v[4]}`;
    },
  },
  grid: {
    left: "5%",
    right: "3%",
    top: "12%",
    bottom: "8%",
    containLabel: true,
  },
  xAxis: {
    type: "category",
    data: ["Group A", "Group B", "Group C", "Group D"],
    boundaryGap: true,
  },
  yAxis: {
    type: "value",
    splitNumber: 5,
  },
  series: [
    {
      type: "boxplot",
      name: "Distribution",
      data: [
        [8, 17, 22, 26, 35],
        [6, 13, 20, 28, 38],
        [10, 19, 24, 31, 42],
        [4, 11, 18, 25, 33],
      ],
      boxWidth: ["20%", "40%"],
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
