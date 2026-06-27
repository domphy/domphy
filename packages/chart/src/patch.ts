import { toState, type PartialElement, type ReadableState } from "@domphy/core";
import type { ChartOption } from "./types.js";
import { ChartEngine } from "./engine.js";

/**
 * Renders an ECharts-grade chart using WebGL (luma.gl) + SVG overlay.
 * Apply to a `div` with explicit width and height.
 *
 * @hostTag div
 * @param option - Chart configuration object, or a reactive state wrapping one.
 * @example
 * { div: null, $: [chart({ series: [{ type: "bar", data: [1, 2, 3] }], xAxis: {}, yAxis: {} })],
 *   style: { width: "600px", height: "400px" } }
 */
function chart(
  option: ChartOption | ReadableState<ChartOption>,
): PartialElement {
  const optionState = toState(option);

  return {
    style: {
      position: "relative",
      overflow: "hidden",
    },
    _onMount(node) {
      const container = node.domElement as HTMLElement;
      const engine = new ChartEngine(container);

      // Async init then render
      let initialized = false;
      let pendingOption: ChartOption | null = null;
      let width = 0;
      let height = 0;

      const applySize = () => {
        const rect = container.getBoundingClientRect();
        if (rect.width !== width || rect.height !== height) {
          width = rect.width;
          height = rect.height;
          engine.setSize(width, height);
        }
      };

      const applyOption = () => {
        applySize();
        if (width && height && initialized) {
          engine.setOption(optionState.get());
        }
      };

      engine.init().then(() => {
        initialized = true;
        applyOption();
      });

      // Subscribe to option changes
      const unsubscribe = optionState.addListener(applyOption);

      // Subscribe to resize
      const ro = new ResizeObserver(applyOption);
      ro.observe(container);

      node.addHook("Remove", () => {
        unsubscribe();
        ro.disconnect();
        engine.destroy();
      });
    },
  };
}

export { chart };
