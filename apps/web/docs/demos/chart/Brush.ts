import type { ChartOption } from "@domphy/chart";
import { chart } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";

const option: ChartOption = {
  brush: {
    toolbox: ["rect", "lineX", "keep", "clear"],
    brushLink: "all",
  },
  toolbox: {
    show: true,
    right: 20,
    feature: {
      brush: { type: ["rect", "lineX", "keep", "clear"] },
    },
  },
  xAxis: {
    type: "category",
    data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  yAxis: { type: "value" },
  series: [
    {
      type: "bar",
      name: "Visits",
      data: [120, 200, 150, 80, 70, 110, 130],
      itemStyle: { color: "primary" },
    },
    {
      type: "bar",
      name: "Conversions",
      data: [20, 45, 35, 18, 15, 28, 30],
      itemStyle: { color: "success" },
    },
  ],
  legend: {},
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
