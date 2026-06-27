import { type DomphyElement } from "@domphy/core";
import { chart } from "@domphy/chart";
import type { ChartOption } from "@domphy/chart";

// 20 points on a unit sphere: 5 latitude bands × 4 longitude steps
// lat in [30, 60, 90, 120, 150] deg, lon in [0, 90, 180, 270] deg
const latDeg = [30, 60, 90, 120, 150];
const lonDeg = [0, 90, 180, 270];

const sphereData: [number, number, number][] = [];
for (const lat of latDeg) {
  for (const lon of lonDeg) {
    const latRad = (lat * Math.PI) / 180;
    const lonRad = (lon * Math.PI) / 180;
    sphereData.push([
      Math.sin(latRad) * Math.cos(lonRad),
      Math.sin(latRad) * Math.sin(lonRad),
      Math.cos(latRad),
    ]);
  }
}

const option: ChartOption = {
  title: { text: "3D Sphere Scatter" },
  tooltip: { show: false },
  grid3D: {
    viewControl: { alpha: 20, beta: 30 },
  },
  xAxis3D: { type: "value", name: "X", min: -1.2, max: 1.2 },
  yAxis3D: { type: "value", name: "Y", min: -1.2, max: 1.2 },
  zAxis3D: { type: "value", name: "Z", min: -1.2, max: 1.2 },
  series: [
    {
      type: "scatter3D",
      name: "sphere",
      data: sphereData,
      symbolSize: 8,
      itemStyle: { opacity: 0.8 },
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
