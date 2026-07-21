import type { ChartOption } from "@domphy/chart";
import { chart } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";

const cities: Record<string, [number, number]> = {
  "New York": [-74.0, 40.7],
  London: [-0.1, 51.5],
  "Los Angeles": [-118.2, 34.0],
  Tokyo: [139.7, 35.7],
  Dubai: [55.3, 25.2],
  Singapore: [103.8, 1.3],
  Sydney: [151.2, -33.9],
};

const routes: [string, string][] = [
  ["New York", "London"],
  ["Los Angeles", "Tokyo"],
  ["London", "Dubai"],
  ["Dubai", "Singapore"],
  ["Singapore", "Sydney"],
];

const linesData = routes.map(([from, to]) => ({
  coords: [cities[from], cities[to]],
}));

const option: ChartOption = {
  title: { text: "Global Flight Routes", left: "center" },
  geo: {
    map: "world",
    roam: true,
    silent: true,
    itemStyle: { areaColor: "#1a2035", borderColor: "#3a4a6b" },
  },
  series: [
    {
      type: "lines",
      coordinateSystem: "geo",
      data: linesData,
      lineStyle: { color: "#58a6ff", opacity: 0.4, width: 1.5, curveness: 0.2 },
      effect: {
        show: true,
        period: 4,
        symbol: "arrow",
        symbolSize: 4,
        color: "#79c0ff",
      },
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
