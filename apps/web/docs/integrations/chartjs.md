# Chart.js

There is no `@domphy/chart` — charts are a solved vanilla problem. Use [Chart.js](https://www.chartjs.org/) (or ECharts / D3) directly through Domphy's lifecycle hooks. The same pattern applies to any canvas/SVG visualization library.

```bash
npm install chart.js
```

## Mount a chart

Render a `canvas`, create the chart in `_onMount`, destroy it in `_onRemove`:

```ts
import { type DomphyElement, toState } from "@domphy/core"
import { Chart, registerables } from "chart.js"

Chart.register(...registerables)

const data = toState([12, 19, 7, 15])

const chart: DomphyElement<"canvas"> = {
  canvas: null,
  _onMount: (node) => {
    const instance = new Chart(node.domElement as HTMLCanvasElement, {
      type: "bar",
      data: {
        labels: ["Q1", "Q2", "Q3", "Q4"],
        datasets: [{ label: "Revenue", data: data.get() }],
      },
    })
    node.setMetadata("chart", instance)
    // keep the chart in sync with a Domphy state
    data.addListener((next) => {
      instance.data.datasets[0].data = next
      instance.update()
    })
  },
  _onRemove: (node) => {
    ;(node.getMetadata("chart") as Chart | undefined)?.destroy()
  },
}
```

## Why no wrapper

`react-chartjs-2` exists only because React can't let an imperative library own a DOM node without fighting its virtual DOM. Domphy has no virtual DOM: `_onMount` hands the library the real `node.domElement`, reactivity (`state.addListener`) feeds it new data, and `_onRemove` tears it down. That is the whole integration — nothing Domphy-specific to learn, and the chart library updates itself imperatively (the fast path).

The same recipe covers **ECharts** (`echarts.init(node.domElement)`), **D3** (`d3.select(node.domElement)`), and any other canvas/SVG renderer. See the [Integrations guide](/docs/integrations/) for the general DOM-library pattern.
