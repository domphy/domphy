import type { ChartOption } from "@domphy/chart";
import { chart } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";

const option: ChartOption = {
  toolbox: {
    show: true,
    right: 20,
    top: 10,
    feature: {
      saveAsImage: { title: "Save" },
      dataZoom: { yAxisIndex: "none" },
      restore: { title: "Reset" },
      dataView: { readOnly: false, title: "Data" },
    },
  },
  xAxis: {
    type: "category",
    data: [
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
    ],
  },
  yAxis: { type: "value" },
  legend: { data: ["Revenue", "Costs"] },
  tooltip: { trigger: "axis" },
  series: [
    {
      type: "line",
      name: "Revenue",
      data: [320, 380, 420, 390, 460, 510, 490, 580, 540, 620, 600, 680],
      smooth: true,
    },
    {
      type: "line",
      name: "Costs",
      data: [280, 310, 340, 330, 360, 390, 380, 420, 410, 450, 440, 480],
      smooth: true,
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
