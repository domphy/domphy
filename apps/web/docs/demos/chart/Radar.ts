import type { ChartOption } from "@domphy/chart";
import { chart } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";

const option: ChartOption = {
  title: { text: "Hero Stats Comparison" },
  legend: { data: ["Hero A", "Hero B"], bottom: 0 },
  tooltip: { trigger: "item" },
  radar: {
    indicator: [
      { name: "Speed", max: 100 },
      { name: "Strength", max: 100 },
      { name: "Defense", max: 100 },
      { name: "Magic", max: 100 },
      { name: "HP", max: 100 },
    ],
    shape: "polygon",
    splitNumber: 4,
    axisName: { fontSize: 12 },
  },
  series: [
    {
      type: "radar",
      data: [
        {
          name: "Hero A",
          value: [85, 70, 60, 90, 75],
          areaStyle: { opacity: 0.3 },
          lineStyle: { width: 2 },
        },
        {
          name: "Hero B",
          value: [60, 90, 80, 45, 95],
          areaStyle: { opacity: 0.3 },
          lineStyle: { width: 2 },
        },
      ],
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
