import type { ChartOption } from "@domphy/chart";
import { chart } from "@domphy/chart";
import type { DomphyElement } from "@domphy/core";

const option: ChartOption = {
  title: { text: "Energy Flow" },
  tooltip: { trigger: "item" },
  series: [
    {
      type: "sankey",
      name: "Energy Flow",
      nodeAlign: "left",
      label: { show: true },
      nodes: [
        { name: "Solar" },
        { name: "Wind" },
        { name: "Grid" },
        { name: "Battery" },
        { name: "Home" },
        { name: "Export" },
        { name: "Waste" },
      ],
      links: [
        { source: "Solar", target: "Home", value: 40 },
        { source: "Solar", target: "Battery", value: 20 },
        { source: "Solar", target: "Export", value: 15 },
        { source: "Wind", target: "Home", value: 30 },
        { source: "Wind", target: "Grid", value: 20 },
        { source: "Battery", target: "Home", value: 15 },
        { source: "Grid", target: "Home", value: 25 },
        { source: "Home", target: "Waste", value: 10 },
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
