import { type DomphyElement } from "@domphy/core";
import { chart } from "@domphy/chart";
import type { ChartOption } from "@domphy/chart";

const option: ChartOption = {
  title: { text: "Performance Score" },
  tooltip: { trigger: "item" },
  series: [
    {
      type: "gauge",
      name: "Score",
      min: 0,
      max: 100,
      splitNumber: 5,
      axisLine: {
        lineStyle: {
          width: 18,
          color: [
            [0.3, "#5cb85c"],
            [0.7, "#f0ad4e"],
            [1, "#d9534f"],
          ],
        },
      },
      axisTick: {
        show: true,
        splitNumber: 4,
        length: 6,
        lineStyle: { color: "auto" },
      },
      axisLabel: {
        distance: 22,
        formatter: (value: number) => String(value),
      },
      pointer: {
        length: "65%",
        width: 6,
        itemStyle: { color: "auto" },
      },
      anchor: {
        show: true,
        size: 12,
        itemStyle: { color: "auto" },
      },
      detail: {
        offsetCenter: [0, "70%"],
        formatter: "{value}%",
        fontSize: 22,
        fontWeight: "bold",
        color: "auto",
      },
      title: {
        offsetCenter: [0, "90%"],
        fontSize: 14,
      },
      data: [{ value: 72, name: "Performance" }],
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
