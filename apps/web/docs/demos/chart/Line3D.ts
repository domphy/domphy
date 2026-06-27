import { type DomphyElement } from "@domphy/core";
import { chart } from "@domphy/chart";
import type { ChartOption } from "@domphy/chart";

// Single-loop helix: 61 points, t from 0 to 2PI (inclusive), step PI/30
const helixData: [number, number, number][] = [];
for (let i = 0; i <= 60; i++) {
  const t = (i / 60) * 2 * Math.PI;
  helixData.push([
    Math.cos(t) * 3,
    Math.sin(t) * 3,
    t / (2 * Math.PI),
  ]);
}

const option: ChartOption = {
  title: { text: "3D Helix Line" },
  tooltip: { show: false },
  grid3D: {
    viewControl: { alpha: 30, beta: 45 },
  },
  xAxis3D: { type: "value", name: "X" },
  yAxis3D: { type: "value", name: "Y" },
  zAxis3D: { type: "value", name: "Z" },
  series: [
    {
      type: "line3D",
      name: "helix",
      data: helixData,
      lineStyle: { width: 2, color: "#3b82f6" },
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
