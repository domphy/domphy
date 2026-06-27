import { ChartEngine } from "./src/index.js";
import type { ChartOption } from "./src/index.js";

const grid = document.getElementById("grid")!;

function card(title: string, spanFull = false): HTMLElement {
  const card = document.createElement("div");
  card.className = `card${spanFull ? " full-width" : " single"}`;
  card.innerHTML = `<h2>${title}</h2><div class="chart-box" id="chart-${Math.random().toString(36).slice(2)}"></div>`;
  grid.appendChild(card);
  return card.querySelector(".chart-box")!;
}

async function mount(container: HTMLElement, option: ChartOption): Promise<void> {
  try {
    container.style.position = "relative";
    const engine = new ChartEngine(container);
    await engine.init();
    const rect = container.getBoundingClientRect();
    engine.setSize(rect.width || 440, 280);
    engine.setOption(option);
    // Track for cleanup
    (container as any).__engine = engine;
  } catch (err) {
    container.innerHTML = `<div class="error">ERROR: ${err}</div>`;
    console.error(err);
  }
}

// ─── Line chart ───────────────────────────────────────────────────────────────
await mount(card("Line chart — smooth + area"), {
  title: { text: "Monthly Revenue", left: "center" },
  legend: { top: 28, data: ["2023", "2024"] },
  xAxis: { type: "category", data: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] },
  yAxis: { type: "value", name: "USD" },
  grid: { top: 60, bottom: 40, left: 60, right: 20 },
  tooltip: { trigger: "axis" },
  series: [
    { type: "line", name: "2023", smooth: true, data: [820,932,901,934,1290,1330,1320,900,1100,1200,880,950], areaStyle: { opacity: 0.2 } },
    { type: "line", name: "2024", smooth: true, data: [900,1050,1020,1100,1400,1500,1450,1000,1300,1350,1000,1100] },
  ],
});

// ─── Bar chart with labels ────────────────────────────────────────────────────
await mount(card("Bar chart — labels + grouped"), {
  legend: { top: 5, data: ["Direct", "Email"] },
  xAxis: { type: "category", data: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] },
  yAxis: { type: "value" },
  grid: { top: 40, bottom: 30, left: 50, right: 20 },
  tooltip: { trigger: "axis" },
  series: [
    { type: "bar", name: "Direct", data: [320,332,301,334,390,330,320], label: { show: true, position: "top" } },
    { type: "bar", name: "Email", data: [120,132,101,134,90,230,210], label: { show: true, position: "top" } },
  ],
});

// ─── Pie chart ────────────────────────────────────────────────────────────────
await mount(card("Pie — labels + donut"), {
  legend: { top: 5, orient: "horizontal" },
  grid: { top: 0, bottom: 0, left: 0, right: 0 },
  tooltip: { trigger: "item" },
  series: [{
    type: "pie",
    name: "Browser",
    radius: ["35%", "60%"],
    center: ["50%", "55%"],
    label: { show: true },
    data: [
      { value: 1048, name: "Chrome" },
      { value: 735, name: "Firefox" },
      { value: 580, name: "Edge" },
      { value: 484, name: "Safari" },
      { value: 300, name: "Other" },
    ],
  }],
});

// ─── Scatter chart ────────────────────────────────────────────────────────────
await mount(card("Scatter — symbolSize fn"), {
  xAxis: { type: "value", name: "X" },
  yAxis: { type: "value", name: "Y" },
  grid: { top: 30, bottom: 40, left: 60, right: 20 },
  tooltip: { trigger: "axis" },
  series: [{
    type: "scatter",
    name: "Data",
    symbolSize: (val: number[]) => Math.sqrt(val[2] ?? 20) * 4,
    data: [
      [10, 8.04, 40],[8, 6.95, 20],[13, 7.58, 15],[9, 8.81, 35],
      [11, 8.33, 50],[14, 9.96, 60],[6, 7.24, 10],[4, 4.26, 8],
      [12, 10.84, 45],[7, 4.82, 30],[5, 5.68, 25],
    ],
  }],
});

// ─── Heatmap ──────────────────────────────────────────────────────────────────
const heatHours = ["12a","1a","2a","3a","4a","5a","6a","7a","8a","9a","10a","11a","12p","1p","2p","3p","4p","5p","6p","7p","8p","9p","10p","11p"];
const heatDays = ["Sat","Fri","Thu","Wed","Tue","Mon","Sun"];
const heatData: [number,number,number][] = [];
for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) heatData.push([h, d, Math.floor(Math.random() * 10)]);
await mount(card("Heatmap + VisualMap", true), {
  xAxis: { type: "category", data: heatHours },
  yAxis: { type: "category", data: heatDays },
  grid: { top: 20, bottom: 40, left: 60, right: 80 },
  visualMap: { type: "continuous", min: 0, max: 10, right: 0, top: "center", orient: "vertical" },
  series: [{ type: "heatmap", data: heatData }],
});

// ─── Candlestick ──────────────────────────────────────────────────────────────
const candleData: [number,number,number,number][] = [
  [2320.26,2320.26,2287.3,2362.94],[2300,2291.3,2288.26,2308.38],
  [2295.35,2346.5,2295.35,2346.92],[2347.22,2358.98,2337.35,2363.8],
  [2360.75,2382.48,2347.89,2383.76],[2383.43,2385.42,2371.23,2391.82],
  [2377.41,2419.02,2369.57,2421.15],[2425.92,2428.15,2417.58,2440.38],
  [2411,2433.13,2403.3,2437.42],[2432.68,2434.48,2427.7,2441.73],
];
const candleDates = ["2024-01","2024-02","2024-03","2024-04","2024-05","2024-06","2024-07","2024-08","2024-09","2024-10"];
await mount(card("Candlestick OHLC"), {
  xAxis: { type: "category", data: candleDates },
  yAxis: { type: "value", min: 2280, max: 2450 },
  grid: { top: 20, bottom: 40, left: 70, right: 20 },
  tooltip: { trigger: "axis" },
  series: [{ type: "candlestick", data: candleData, itemStyle: { color: "#ef5350", color0: "#26a69a", borderColor: "#ef5350", borderColor0: "#26a69a" } }],
});

// ─── Gauge ────────────────────────────────────────────────────────────────────
await mount(card("Gauge — progress donut"), {
  series: [{
    type: "gauge",
    name: "Load",
    detail: { formatter: "{value}%" },
    data: [{ value: 72, name: "CPU Load" }],
    splitNumber: 10,
  }],
});

// ─── Radar ────────────────────────────────────────────────────────────────────
await mount(card("Radar — polygon fill"), {
  legend: { top: 5, data: ["Budget", "Actual"] },
  radar: { indicator: [
    { name: "Sales", max: 6500 }, { name: "Admin", max: 16000 }, { name: "IT", max: 30000 },
    { name: "Support", max: 38000 }, { name: "Dev", max: 52000 }, { name: "Mktg", max: 25000 },
  ]},
  series: [{ type: "radar", name: "Budget vs Actual", data: [
    { value: [4200, 3000, 20000, 35000, 50000, 18000], name: "Budget" },
    { value: [5000, 14000, 28000, 26000, 42000, 21000], name: "Actual" },
  ]}],
});

// ─── Boxplot ──────────────────────────────────────────────────────────────────
await mount(card("Boxplot — quartiles"), {
  xAxis: { type: "category", data: ["Mon","Tue","Wed","Thu","Fri"] },
  yAxis: { type: "value" },
  grid: { top: 20, bottom: 30, left: 50, right: 20 },
  tooltip: { trigger: "axis" },
  series: [{
    type: "boxplot",
    data: [
      [655, 850, 940, 980, 1175],
      [672.5, 850, 945, 990, 1180],
      [780, 890, 940, 980, 1167.5],
      [720, 865, 940, 985, 1160],
      [780, 890, 940, 980, 1167.5],
    ],
  }],
});

// ─── Funnel ───────────────────────────────────────────────────────────────────
await mount(card("Funnel — conversion"), {
  legend: { top: 5 },
  tooltip: { trigger: "item" },
  series: [{
    type: "funnel",
    left: "15%",
    top: 40,
    width: "70%",
    height: 200,
    label: { show: true },
    data: [
      { value: 100, name: "Visits" },
      { value: 80, name: "Clicks" },
      { value: 60, name: "Signups" },
      { value: 40, name: "Orders" },
      { value: 20, name: "Paid" },
    ],
  }],
});

// ─── Treemap ──────────────────────────────────────────────────────────────────
await mount(card("Treemap — squarified"), {
  series: [{
    type: "treemap",
    top: 10,
    left: 10,
    width: "calc(100% - 20px)",
    height: 240,
    data: [
      { name: "Electronics", value: 60, children: [
        { name: "Phones", value: 35 }, { name: "Laptops", value: 25 },
      ]},
      { name: "Clothing", value: 40, children: [
        { name: "Men", value: 22 }, { name: "Women", value: 18 },
      ]},
      { name: "Food", value: 25 },
      { name: "Books", value: 15 },
    ],
  }],
});

// ─── DataZoom ─────────────────────────────────────────────────────────────────
const dzData = Array.from({ length: 100 }, (_, i) => [i, Math.sin(i * 0.2) * 50 + Math.random() * 20 + 50]);
await mount(card("DataZoom — slider + wheel", true), {
  xAxis: { type: "value" },
  yAxis: { type: "value" },
  grid: { top: 20, bottom: 70, left: 60, right: 20 },
  dataZoom: [
    { type: "slider", xAxisIndex: 0, start: 0, end: 40, bottom: 10 },
    { type: "inside", xAxisIndex: 0 },
  ],
  tooltip: { trigger: "axis" },
  series: [{ type: "line", smooth: true, data: dzData, name: "Signal" }],
});

console.log("All charts mounted");
