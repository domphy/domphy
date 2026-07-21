import type { ChartOption } from "@domphy/chart";
import { chart } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";

const option: ChartOption = {
  legend: {},
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "shadow" },
  },
  xAxis: {
    type: "category",
    data: [
      "Q1 2023",
      "Q2 2023",
      "Q3 2023",
      "Q4 2023",
      "Q1 2024",
      "Q2 2024",
      "Q3 2024",
      "Q4 2024",
    ],
  },
  yAxis: {
    type: "value",
    name: "Engineer-weeks",
  },
  series: [
    {
      type: "bar",
      name: "Frontend",
      stack: "total",
      barMaxWidth: 40,
      data: [12, 14, 13, 15, 16, 18, 17, 20],
    },
    {
      type: "bar",
      name: "Backend",
      stack: "total",
      barMaxWidth: 40,
      data: [18, 20, 19, 22, 24, 25, 23, 26],
    },
    {
      type: "bar",
      name: "Mobile",
      stack: "total",
      barMaxWidth: 40,
      data: [8, 9, 10, 11, 12, 13, 14, 15],
    },
    {
      type: "bar",
      name: "DevOps",
      stack: "total",
      barMaxWidth: 40,
      data: [5, 6, 7, 8, 9, 10, 11, 12],
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
