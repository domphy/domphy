import type { ChartOption } from "@domphy/chart";
import { chart } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";

// [start, end, taskIndex] — taskIndex maps to yAxis category
const ganttData: [number, number, number][] = [
  [0, 3, 0],
  [2, 7, 1],
  [6, 9, 2],
  [8, 10, 3],
];

const taskColors = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899"];
const taskLabels = ["Design", "Dev", "Test", "Deploy"];

const option: ChartOption = {
  title: { text: "Project Timeline", left: "center" },
  tooltip: {
    trigger: "item",
    formatter: (params: any) => {
      const [start, end, index] = params.value;
      return `${taskLabels[index]}: ${start} – ${end}`;
    },
  },
  xAxis: { type: "value", name: "Week", min: 0, max: 10 },
  yAxis: { type: "category", data: taskLabels },
  series: [
    {
      type: "custom",
      renderItem: (params: any, api: any) => {
        const start = api.value(0);
        const end = api.value(1);
        const index = api.value(2);

        const startPoint = api.coord([start, index]);
        const endPoint = api.coord([end, index]);
        const barHeight = api.size([0, 1])[1] * 0.5;

        return {
          type: "rect",
          shape: {
            x: startPoint[0],
            y: startPoint[1] - barHeight / 2,
            width: endPoint[0] - startPoint[0],
            height: barHeight,
          },
          style: {
            fill: taskColors[index],
            opacity: 0.85,
          },
        };
      },
      encode: { x: [0, 1], y: 2 },
      data: ganttData,
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "320px", position: "relative" },
  $: [chart(option)],
};

export default App;
