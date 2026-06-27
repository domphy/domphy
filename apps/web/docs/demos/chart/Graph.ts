import { type DomphyElement } from "@domphy/core";
import { chart } from "@domphy/chart";
import type { ChartOption, GraphNode, GraphLink } from "@domphy/chart";

// Categories: 0 = Frontend, 1 = Backend, 2 = Infra
const nodes: GraphNode[] = [
  { id: "0", name: "UI Team",      category: 0, symbolSize: 30 },
  { id: "1", name: "Design Team",  category: 0, symbolSize: 28 },
  { id: "2", name: "QA Team",      category: 0, symbolSize: 26 },
  { id: "3", name: "API Team",     category: 1, symbolSize: 34 },
  { id: "4", name: "Auth Team",    category: 1, symbolSize: 28 },
  { id: "5", name: "Data Team",    category: 1, symbolSize: 30 },
  { id: "6", name: "DevOps",       category: 2, symbolSize: 34 },
  { id: "7", name: "Security",     category: 2, symbolSize: 28 },
  { id: "8", name: "Monitoring",   category: 2, symbolSize: 26 },
  { id: "9", name: "Platform",     category: 2, symbolSize: 30 },
];

const links: GraphLink[] = [
  { source: "0", target: "1" },
  { source: "0", target: "2" },
  { source: "0", target: "3" },
  { source: "3", target: "4" },
  { source: "3", target: "5" },
  { source: "4", target: "7" },
  { source: "5", target: "8" },
  { source: "6", target: "9" },
  { source: "6", target: "8" },
  { source: "9", target: "3" },
  { source: "7", target: "3" },
  { source: "2", target: "3" },
];

const option: ChartOption = {
  title: { text: "Software Team Network" },
  tooltip: { trigger: "item" },
  legend: { data: ["Frontend", "Backend", "Infra"], bottom: 0 },
  series: [
    {
      type: "graph",
      name: "Teams",
      layout: "force",
      symbolSize: 30,
      roam: true,
      label: { show: true, fontSize: 11 },
      lineStyle: { opacity: 0.6, width: 1 },
      force: {
        repulsion: 120,
        gravity: 0.1,
        edgeLength: 80,
        layoutAnimation: true,
      },
      categories: [
        { name: "Frontend" },
        { name: "Backend" },
        { name: "Infra" },
      ],
      data: nodes,
      links,
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "400px", position: "relative" },
  $: [chart(option)],
};

export default App;
