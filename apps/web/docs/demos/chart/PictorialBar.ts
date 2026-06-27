import { type DomphyElement } from "@domphy/core";
import { chart } from "@domphy/chart";
import type { ChartOption } from "@domphy/chart";

const languages = ["Python", "JavaScript", "Rust", "Go", "TypeScript"];
const scores    = [65, 58, 42, 38, 55];

const option: ChartOption = {
  title: { text: "Language Popularity Index", left: "center" },
  tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
  xAxis: { type: "value", name: "Score" },
  yAxis: { type: "category", data: languages, inverse: true },
  series: [
    {
      type: "pictorialBar",
      data: scores,
      symbol: "roundRect",
      symbolRepeat: true,
      symbolSize: [18, 14],
      symbolMargin: "20%",
      barMaxWidth: 40,
      colorBy: "data",
      label: {
        show: true,
        position: "right",
        formatter: "{c}",
        fontSize: 12,
      },
    },
  ],
};

const App: DomphyElement<"div"> = {
  div: null,
  style: { width: "100%", height: "320px", position: "relative" },
  $: [chart(option)],
};

export default App;
