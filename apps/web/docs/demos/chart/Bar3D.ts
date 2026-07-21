import type { ChartOption } from "@domphy/chart";
import { chart } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";

const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const teams = ["Team A", "Team B", "Team C"];

const teamAData: [number, number, number][] = [
  [0, 0, 12],
  [1, 0, 18],
  [2, 0, 15],
  [3, 0, 22],
  [4, 0, 19],
  [5, 0, 25],
  [6, 0, 21],
  [7, 0, 28],
  [8, 0, 17],
  [9, 0, 23],
  [10, 0, 20],
  [11, 0, 30],
];

const teamBData: [number, number, number][] = [
  [0, 1, 8],
  [1, 1, 14],
  [2, 1, 11],
  [3, 1, 16],
  [4, 1, 13],
  [5, 1, 19],
  [6, 1, 15],
  [7, 1, 21],
  [8, 1, 12],
  [9, 1, 17],
  [10, 1, 14],
  [11, 1, 24],
];

const teamCData: [number, number, number][] = [
  [0, 2, 5],
  [1, 2, 9],
  [2, 2, 7],
  [3, 2, 12],
  [4, 2, 10],
  [5, 2, 14],
  [6, 2, 11],
  [7, 2, 16],
  [8, 2, 9],
  [9, 2, 13],
  [10, 2, 11],
  [11, 2, 18],
];

const option: ChartOption = {
  title: { text: "Monthly Performance by Team" },
  tooltip: {},
  legend: { data: teams, top: 32 },
  grid3D: {
    boxWidth: 120,
    boxDepth: 60,
    boxHeight: 60,
    viewControl: { alpha: 20, beta: 30 },
  },
  xAxis3D: { type: "category", data: months, name: "Month" },
  yAxis3D: { type: "category", data: teams, name: "Team" },
  zAxis3D: { type: "value", name: "Score" },
  series: [
    {
      type: "bar3D",
      name: "Team A",
      data: teamAData,
      shading: "color",
      bevelSize: 0.2,
      bevelSmoothness: 2,
      label: { show: false },
    },
    {
      type: "bar3D",
      name: "Team B",
      data: teamBData,
      shading: "color",
      bevelSize: 0.2,
      bevelSmoothness: 2,
      label: { show: false },
    },
    {
      type: "bar3D",
      name: "Team C",
      data: teamCData,
      shading: "color",
      bevelSize: 0.2,
      bevelSmoothness: 2,
      label: { show: false },
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
