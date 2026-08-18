# Chart.js

> **Note:** Domphy now ships [`@domphy/chart`](/docs/chart/) — a built-in chart package (ECharts-grade: line, bar, pie, scatter, radar, heatmap, candlestick, boxplot, gauge, treemap, funnel, sankey, graph). Use it for new projects. This page covers integrating Chart.js directly via lifecycle hooks — useful when you need Chart.js-specific features or are migrating an existing Chart.js codebase.

Use [Chart.js](https://www.chartjs.org/) directly through a per-node `behavior()`. The same pattern applies to any canvas/SVG visualization library.

```bash
npm install chart.js
```

## Mount a chart

Render a `canvas`, create the chart in `behavior()` `attach`, and tear down both the Chart.js instance **and** the state subscription in `destroy`. Do not use `_onMount` + `state.addListener` without an unsubscribe — `_onMount` only fires for the first generation of a reused node, and a leaked listener keeps updating a destroyed chart.

```ts
import { behavior, type DomphyElement, toState } from "@domphy/core"
import { Chart, registerables } from "chart.js"

Chart.register(...registerables)

const data = toState([12, 19, 7, 15])

const chart: DomphyElement<"canvas"> = {
  canvas: null,
  $: [
    behavior("chartjs", (node) => {
      const instance = new Chart(node.domElement as HTMLCanvasElement, {
        type: "bar",
        data: {
          labels: ["Q1", "Q2", "Q3", "Q4"],
          datasets: [{ label: "Revenue", data: data.get() }],
        },
      })
      const unsubscribe = data.addListener((next) => {
        instance.data.datasets[0].data = next
        instance.update()
      })
      return {
        destroy: () => {
          unsubscribe()
          instance.destroy()
        },
      }
    }, {}),
  ],
}
```

`State.addListener` returns the unsubscribe function. Call it in `destroy` alongside `instance.destroy()`.

## Why no wrapper

`react-chartjs-2` exists only because React can't let an imperative library own a DOM node without fighting its virtual DOM. Domphy has no virtual DOM: `behavior()` `attach` hands the library the real `node.domElement`, reactivity (`state.addListener`) feeds it new data, and `destroy` tears both down. That is the whole integration — the chart library updates itself imperatively (the fast path). Use `behavior()` rather than a raw `_onMount` so a reactive parent re-rendering the canvas does not leave the first generation's listener attached.

The same recipe covers **ECharts** (`echarts.init(node.domElement)`), **D3** (`d3.select(node.domElement)`), and any other canvas/SVG renderer. See the [Integrations guide](/docs/integrations/) for the general DOM-library pattern.
