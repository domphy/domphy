import { type DomphyElement } from "@domphy/core";
import { chart } from "@domphy/chart";
import type { ChartOption } from "@domphy/chart";

const SHAPE_W = 30;
const SHAPE_H = 30;

// z = sin(sqrt(x² + y²)) for x, y ∈ [-3, 3], row-major order
const surfaceData: [number, number, number][] = [];
for (let i = 0; i < SHAPE_W; i++) {
  for (let j = 0; j < SHAPE_H; j++) {
    const x = -3 + (6 * i) / (SHAPE_W - 1);
    const y = -3 + (6 * j) / (SHAPE_H - 1);
    const r = Math.sqrt(x * x + y * y);
    const z = Math.sin(r);
    surfaceData.push([x, y, z]);
  }
}

const option: ChartOption = {
  title: { text: "3D Sin Wave Surface" },
  tooltip: { show: false },
  visualMap: {
    type: "continuous",
    min: -1,
    max: 1,
    calculable: true,
    right: 0,
    top: "center",
    inRange: { color: ["#3b82f6", "#22d3ee", "#a3e635", "#facc15", "#f97316"] },
  },
  grid3D: {
    boxWidth: 100,
    boxHeight: 60,
    boxDepth: 100,
    viewControl: {
      projection: "perspective",
      alpha: 30,
      beta: 40,
      distance: 200,
      autoRotate: false,
    },
  },
  xAxis3D: { type: "value", name: "X", min: -3, max: 3 },
  yAxis3D: { type: "value", name: "Y", min: -3, max: 3 },
  zAxis3D: { type: "value", name: "Z", min: -1, max: 1 },
  series: [
    {
      type: "surface3D",
      name: "sin wave",
      shapeW: SHAPE_W,
      shapeH: SHAPE_H,
      data: surfaceData,
      wireframe: { show: true, lineStyle: { opacity: 0.25, width: 0.8 } },
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
