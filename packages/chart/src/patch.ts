import {
  type BehaviorInstance,
  behavior,
  type ElementNode,
  type Listener,
  type PartialElement,
  type ReadableState,
  toState,
} from "@domphy/core";
import { themeName } from "@domphy/theme";
import { ChartEngine } from "./engine.js";
import type { ChartOption } from "./types.js";

type ChartProps = {
  option: ChartOption | ReadableState<ChartOption>;
};

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
  return {
    style: {
      position: "relative",
      // Visible so the absolutely-positioned tooltip (and overflowing SVG
      // chrome) is not clipped. Use tooltip.appendToBody to also escape
      // overflow:hidden on an ancestor of this host.
      overflow: "visible",
    },
    // The engine, its subscriptions, and its observers are imperative,
    // cross-generation state: a reactive parent re-running chart() with an
    // inline option object mints fresh closures on the SAME reused DOM node,
    // and _onMount would only ever fire for the first generation. behavior()
    // runs attach once for the real node and routes every later generation's
    // props into update() — see AGENTS.md "Reused-node lifecycle".
    ...behavior<ChartProps>("chart", attachChart, { option }),
  };
}

function attachChart(
  node: ElementNode,
  initialProps: ChartProps,
): BehaviorInstance<ChartProps> {
  const container = node.domElement as HTMLElement;
  const engine = new ChartEngine(container);

  let destroyed = false;
  let initialized = false;
  let width = 0;
  let height = 0;
  let rawOption = initialProps.option;
  let currentOption: ChartOption | null = null;
  let unsubscribeOption: (() => void) | null = null;
  // Tracks whether currentOption changed since the last engine.setOption().
  // setOption() resets interactive state (legend toggles, dataZoom windows),
  // so a pure resize must re-render without re-setting the option.
  let optionDirty = true;

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
    if (!(width && height && initialized && !destroyed && currentOption)) {
      return;
    }
    if (optionDirty) {
      optionDirty = false;
      engine.setOption(currentOption);
    } else {
      // Size-only change (ResizeObserver): re-render in place so legend
      // toggles and dataZoom windows survive the resize.
      engine.render();
    }
  };

  // (Re)bind to the latest generation's option: a plain object renders once
  // per update; a state is subscribed so option writes re-render the chart.
  const applyProps = (next: ChartProps) => {
    rawOption = next.option;
    unsubscribeOption?.();
    const optionState = toState(next.option);
    currentOption = optionState.get();
    optionDirty = true;
    // A bare ReadableState (e.g. readonly()) has no addListener — it renders
    // once per update, same as a plain object.
    unsubscribeOption =
      typeof optionState.addListener === "function"
        ? optionState.addListener(() => {
            currentOption = optionState.get();
            optionDirty = true;
            applyOption();
          })
        : null;
    applyOption();
  };

  // Async init then render. If the node is removed before init resolves, the
  // destroyed flag prevents reviving a torn-down engine.
  engine
    .init()
    .then(() => {
      if (destroyed) return;
      initialized = true;
      applyOption();
    })
    .catch((error: unknown) => {
      // WebGL init failed (no GPU, headless environment, adapter rejection):
      // surface a clear error instead of an unhandled promise rejection plus
      // a silently empty container.
      console.error(
        "@domphy/chart: WebGL initialization failed — the chart cannot render.",
        error,
      );
      if (destroyed || typeof document === "undefined") return;
      const message = document.createElement("div");
      message.className = "dc-chart-error";
      message.style.cssText =
        "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
        "pointer-events:none;color:var(--neutral-8, #6b7280);font-size:12px;";
      message.textContent = "Chart failed to initialize (WebGL unavailable).";
      container.appendChild(message);
    });

  applyProps(initialProps);

  // Re-render on theme flips. SVG/HTML layers carry var(--…) references that
  // repaint on their own, but WebGL uniforms hold concrete floats resolved
  // from computed style, so the engine must re-resolve them when the active
  // theme changes. Two flip sources:
  //  1. a Domphy `dataTheme` attribute on an ancestor ElementNode — subscribe
  //     via the same walk themeName() does. The attribute listener is
  //     auto-released when that ancestor is removed (ElementAttribute hooks
  //     the release onto the ancestor's BeforeRemove); after destroy the
  //     callback no-ops because engine.render() is destroyed-guarded.
  const themeListener = (() => engine.render()) as Listener;
  themeListener.elementNode = node;
  themeName(themeListener);

  //  2. the data-theme DOM attribute on <html> (applySystemTheme sets it
  //     there). MutationObserver is torn down in destroy().
  let themeObserver: MutationObserver | null = null;
  if (
    typeof MutationObserver !== "undefined" &&
    typeof document !== "undefined"
  ) {
    themeObserver = new MutationObserver((records) => {
      if (records.some((record) => record.attributeName === "data-theme")) {
        engine.render();
      }
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }

  // Subscribe to resize
  const ro = new ResizeObserver(applyOption);
  ro.observe(container);

  return {
    update(next) {
      // Later generations route their option here. Skip the resubscribe +
      // re-render when the raw option reference is unchanged.
      if (next.option === rawOption) return;
      applyProps(next);
    },
    destroy() {
      destroyed = true;
      unsubscribeOption?.();
      unsubscribeOption = null;
      themeObserver?.disconnect();
      themeObserver = null;
      ro.disconnect();
      engine.destroy();
    },
  };
}

export { chart };
