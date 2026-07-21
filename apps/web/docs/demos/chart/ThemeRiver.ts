import type { ChartOption } from "@domphy/chart";
import { chart } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";

const months = [
  "2024-01",
  "2024-02",
  "2024-03",
  "2024-04",
  "2024-05",
  "2024-06",
  "2024-07",
  "2024-08",
  "2024-09",
  "2024-10",
  "2024-11",
  "2024-12",
];

const frontendValues = [20, 28, 35, 40, 38, 42, 45, 43, 40, 36, 30, 32];
const backendValues = [35, 38, 40, 42, 45, 48, 50, 52, 55, 58, 60, 62];
const mobileValues = [25, 22, 20, 25, 30, 35, 40, 45, 50, 42, 35, 30];
const devopsValues = [15, 18, 20, 22, 25, 28, 30, 32, 35, 40, 45, 50];

const riverData: [string, number, string][] = [
  ...months.map(
    (m, i) => [m, frontendValues[i], "Frontend"] as [string, number, string],
  ),
  ...months.map(
    (m, i) => [m, backendValues[i], "Backend"] as [string, number, string],
  ),
  ...months.map(
    (m, i) => [m, mobileValues[i], "Mobile"] as [string, number, string],
  ),
  ...months.map(
    (m, i) => [m, devopsValues[i], "DevOps"] as [string, number, string],
  ),
];

const option: ChartOption = {
  title: { text: "Tech Topic Trends 2024" },
  tooltip: { trigger: "axis" },
  legend: { data: ["Frontend", "Backend", "Mobile", "DevOps"], bottom: 0 },
  series: [
    {
      type: "themeRiver",
      name: "Tech Topics",
      data: riverData,
      boundaryGap: ["10%", "10%"],
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
