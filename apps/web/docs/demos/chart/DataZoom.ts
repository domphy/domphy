import { type DomphyElement } from "@domphy/core";
import { chart } from "@domphy/chart";
import type { ChartOption } from "@domphy/chart";

const months: string[] = [];
const years = [2020, 2021, 2022, 2023, 2024];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
for (const year of years) {
  for (const month of monthNames) {
    months.push(`${month} ${year}`);
  }
}

const stockData = [
  100, 103, 107, 105, 110, 108, 113, 117, 114, 119, 116, 121,
  118, 122, 126, 124, 129, 127, 132, 136, 133, 138, 135, 140,
  137, 141, 145, 143, 148, 146, 151, 155, 152, 157, 154, 159,
  156, 160, 164, 162, 167, 165, 170, 174, 171, 176, 173, 178,
  175, 179, 183, 181, 186, 184, 189, 175, 181, 178, 183, 180,
];

const option: ChartOption = {
  tooltip: { trigger: "axis" },
  grid: { bottom: 60 },
  xAxis: {
    type: "category",
    data: months,
  },
  yAxis: {
    type: "value",
    name: "Price",
    scale: true,
  },
  dataZoom: [
    { type: "slider", xAxisIndex: 0, start: 60, end: 100, bottom: 10 },
    { type: "inside", xAxisIndex: 0 },
  ],
  series: [
    {
      type: "line",
      name: "Stock Price",
      data: stockData,
      showSymbol: false,
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
