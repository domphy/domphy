import type { ChartOption } from "@domphy/chart";
import { chart } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";

// Columns: [Income, Age, Education (0=HS, 1=BSc, 2=MSc, 3=PhD), Score]
const rows: number[][] = [
  [110000, 48, 3, 95],
  [95000, 42, 3, 88],
  [85000, 34, 3, 92],
  [70000, 31, 2, 82],
  [62000, 29, 2, 78],
  [58000, 26, 1, 68],
  [52000, 27, 1, 71],
  [45000, 24, 1, 65],
  [41000, 23, 0, 60],
  [38000, 22, 0, 55],
];

const option: ChartOption = {
  title: { text: "Employee Profile — Parallel Coordinates" },
  tooltip: { trigger: "item" },
  parallel: { left: "12%", right: "8%", top: "15%", bottom: "12%" },
  parallelAxis: [
    { dim: 0, name: "Income", type: "value", min: 30000, max: 120000 },
    { dim: 1, name: "Age", type: "value", min: 20, max: 55 },
    {
      dim: 2,
      name: "Education",
      type: "category",
      data: ["HS", "BSc", "MSc", "PhD"],
    },
    { dim: 3, name: "Score", type: "value", min: 40, max: 100 },
  ],
  series: [
    {
      type: "parallel",
      name: "Employees",
      data: rows,
      lineStyle: { opacity: 0.6, width: 1.5 },
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
