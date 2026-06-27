import { type DomphyElement } from "@domphy/core";
import { chart } from "@domphy/chart";
import type { ChartOption } from "@domphy/chart";

// OHLC format: [open, close, low, high]
const dates: string[] = [];
const ohlc: [number, number, number, number][] = [];

const basePrice = 148;
const daily: number[][] = [
  // [open, close, low, high]
  [148.0, 151.2, 146.5, 152.8],
  [151.2, 149.8, 148.0, 153.0],
  [149.8, 153.5, 148.9, 154.2],
  [153.5, 152.0, 150.1, 155.0],
  [152.0, 156.4, 151.3, 157.6],
  [156.4, 154.9, 153.2, 158.0],
  [154.9, 158.7, 154.0, 159.5],
  [158.7, 157.3, 156.0, 160.2],
  [157.3, 160.8, 156.5, 161.4],
  [160.8, 159.5, 158.0, 162.0],
  [159.5, 162.1, 158.8, 163.3],
  [162.1, 161.0, 159.5, 164.0],
  [161.0, 164.5, 160.2, 165.8],
  [164.5, 163.2, 162.0, 166.0],
  [163.2, 166.8, 162.5, 167.5],
  [166.8, 165.0, 164.0, 168.2],
  [165.0, 168.3, 164.5, 169.0],
  [168.3, 167.1, 165.8, 170.0],
  [167.1, 170.5, 166.5, 171.2],
  [170.5, 169.0, 168.0, 172.0],
  [169.0, 172.4, 168.5, 173.5],
  [172.4, 171.0, 169.8, 174.0],
  [171.0, 174.8, 170.2, 175.5],
  [174.8, 173.5, 172.0, 176.2],
  [173.5, 177.0, 172.8, 178.0],
  [177.0, 175.5, 174.5, 178.5],
  [175.5, 178.9, 175.0, 180.0],
  [178.9, 177.4, 176.0, 180.8],
  [177.4, 180.5, 176.8, 181.5],
  [180.5, 179.2, 178.5, 182.0],
];

const start = new Date("2024-01-02");
for (let i = 0; i < daily.length; i++) {
  const d = new Date(start);
  d.setDate(start.getDate() + i);
  dates.push(d.toISOString().slice(0, 10));
  ohlc.push(daily[i] as [number, number, number, number]);
}

const option: ChartOption = {
  tooltip: {
    trigger: "axis",
    axisPointer: { type: "cross" },
  },
  grid: { left: "5%", right: "3%", top: "8%", bottom: "8%", containLabel: true },
  xAxis: {
    type: "category",
    data: dates,
    scale: true,
    axisLabel: { rotate: 30 },
  },
  yAxis: {
    type: "value",
    scale: true,
    splitNumber: 5,
  },
  series: [
    {
      type: "candlestick",
      name: "OHLC",
      data: ohlc,
      markLine: {
        data: [[{ type: "average", name: "Avg" }, {}]],
        label: { position: "insideEndTop" },
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
