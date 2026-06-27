import { type DomphyElement } from "@domphy/core";
import { chart } from "@domphy/chart";
import type { ChartOption } from "@domphy/chart";

const option: ChartOption = {
  title: { text: "Market Treemap" },
  tooltip: { trigger: "item" },
  series: [
    {
      type: "treemap",
      name: "Market Cap",
      label: { show: true },
      breadcrumb: { show: true },
      data: [
        {
          name: "Technology",
          value: 520,
          children: [
            { name: "Chips", value: 180 },
            { name: "Software", value: 150 },
            { name: "Cloud", value: 120 },
            { name: "Hardware", value: 70 },
          ],
        },
        {
          name: "Finance",
          value: 380,
          children: [
            { name: "Banking", value: 160 },
            { name: "Insurance", value: 120 },
            { name: "Asset Mgmt", value: 100 },
          ],
        },
        {
          name: "Healthcare",
          value: 290,
          children: [
            { name: "Pharma", value: 130 },
            { name: "Biotech", value: 90 },
            { name: "MedTech", value: 70 },
          ],
        },
        {
          name: "Energy",
          value: 210,
          children: [
            { name: "Oil & Gas", value: 110 },
            { name: "Renewables", value: 60 },
            { name: "Utilities", value: 40 },
          ],
        },
        {
          name: "Consumer",
          value: 170,
          children: [
            { name: "Retail", value: 80 },
            { name: "Food & Bev", value: 55 },
            { name: "Apparel", value: 35 },
          ],
        },
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
