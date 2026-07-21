import type { ChartOption } from "@domphy/chart";
import { chart } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";

const cities = [
  { name: "New York", value: [-74.0, 40.7, 18] },
  { name: "London", value: [-0.1, 51.5, 15] },
  { name: "Tokyo", value: [139.7, 35.7, 20] },
  { name: "Mumbai", value: [72.8, 18.9, 16] },
  { name: "São Paulo", value: [-46.6, -23.5, 14] },
  { name: "Shanghai", value: [121.5, 31.2, 17] },
  { name: "Cairo", value: [31.2, 30.1, 13] },
];

const option: ChartOption = {
  title: { text: "Major Cities (Population Scale)", left: "center" },
  geo: {
    map: "world",
    roam: true,
    itemStyle: { areaColor: "#1a2035", borderColor: "#3a4a6b" },
  },
  series: [
    {
      type: "effectScatter",
      coordinateSystem: "geo",
      data: cities.map((city) => ({
        name: city.name,
        value: city.value,
      })),
      symbolSize: (val: number[]) => val[2],
      rippleEffect: {
        brushType: "stroke",
        period: 2,
        scale: 2.5,
      },
      label: {
        show: true,
        formatter: "{b}",
        position: "right",
        fontSize: 11,
        color: "#e0e0e0",
      },
      itemStyle: { color: "#f97316" },
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
