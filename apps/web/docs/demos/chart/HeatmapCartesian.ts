import { type DomphyElement } from "@domphy/core";
import { chart } from "@domphy/chart";
import type { ChartOption } from "@domphy/chart";

const hours = [
  "00:00", "01:00", "02:00", "03:00", "04:00", "05:00",
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00", "23:00",
];

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Base values by hour for weekdays (Mon–Fri)
const weekdayPattern = [
   5,  3,  2,  2,  3,  6, 12,
  35, 55, 72, 78, 85, 80, 82,
  85, 83, 79, 72, 42, 32, 24,
  16, 11,  7,
];

// Base values by hour for weekends (Sat–Sun)
const weekendPattern = [
   8,  6,  5,  4,  5,  8, 14,
  18, 20, 23, 26, 28, 26, 24,
  22, 20, 18, 16, 14, 12, 10,
   9,  8,  6,
];

// Small per-day offset for weekdays to break monotony
const weekdayOffset = [0, 2, 4, 2, 5, 0, 0];

const heatmapData: [number, number, number][] = [];
for (let day = 0; day < 7; day++) {
  const pattern = day < 5 ? weekdayPattern : weekendPattern;
  const offset = weekdayOffset[day];
  for (let hour = 0; hour < 24; hour++) {
    heatmapData.push([hour, day, pattern[hour] + offset]);
  }
}

const option: ChartOption = {
  title: { text: "Activity Heatmap by Hour & Day", top: 4 },
  tooltip: { position: "top" },
  grid: { top: "18%", left: "5%", right: "3%", bottom: "5%", containLabel: true },
  xAxis: { type: "category", data: hours, splitArea: { show: true } },
  yAxis: { type: "category", data: days, splitArea: { show: true } },
  visualMap: {
    type: "continuous",
    min: 0,
    max: 100,
    calculable: true,
    orient: "horizontal",
    left: "center",
    top: "10%",
  },
  series: [
    {
      type: "heatmap",
      name: "Activity",
      data: heatmapData,
      label: { show: false },
      itemStyle: { borderColor: "#fff", borderWidth: 0.5 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: "rgba(0,0,0,0.5)" } },
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
