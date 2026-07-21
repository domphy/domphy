import type { ChartOption } from "@domphy/chart";
import { chart } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";

const option: ChartOption = {
  title: { text: "Sales Funnel" },
  tooltip: { trigger: "item" },
  legend: { top: "5%", left: "center" },
  series: [
    {
      type: "funnel",
      name: "Pipeline",
      left: "10%",
      top: "15%",
      right: "10%",
      bottom: "5%",
      sort: "descending",
      gap: 2,
      label: {
        show: true,
        position: "inside",
      },
      itemStyle: {
        borderColor: "#fff",
        borderWidth: 1,
      },
      data: [
        { name: "Website Visits", value: 10000 },
        { name: "Leads", value: 4500 },
        { name: "Qualified", value: 2100 },
        { name: "Proposals", value: 850 },
        { name: "Won", value: 320 },
      ],
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
