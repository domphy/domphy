import { themeColor } from "@domphy/theme";
import type { ChartOption, SeriesOption, ToolboxOption } from "../types.js";

export interface ToolboxHost {
  /** Chart root; the toolbox mounts its own absolutely-positioned bar into this. */
  container: HTMLElement;
  /** WebGL layer (series pixels) for saveAsImage composition. */
  canvas: HTMLCanvasElement;
  /** SVG layers in paint order: [background, overlay]. */
  svgLayers: SVGSVGElement[];
  width: number;
  height: number;
  /** The option exactly as the user last passed to setOption(). */
  getOriginalOption(): ChartOption;
  /** The option currently rendered (may already be magicType-switched). */
  getCurrentOption(): ChartOption;
  /** Render a new option without recording it as the original. */
  applyOption(option: ChartOption): void;
  /** Re-render the original option and clear zoom + legend toggles. */
  restore(): void;
  /** Plot area rect in CSS pixels (the cartesian grid), or null when there is none. */
  getPlotRect(): { x: number; y: number; width: number; height: number } | null;
  /**
   * Set the zoom window in percent (0-100) on every cartesian x and/or y
   * axis. `x`/`y` apply to (and replace) every axis of that kind; omitting
   * one leaves that axis' zoom untouched (e.g. a y-only rectangle select
   * does not reset an existing x zoom). Passing `null` resets both axes to
   * their full range.
   */
  setZoomWindow(
    window: {
      x?: { start: number; end: number };
      y?: { start: number; end: number };
    } | null,
  ): void;
  /** Present only when `option.brush` or `toolbox.feature.brush` is configured. */
  brush?: {
    setActiveType(type: "rect" | "lineX" | "lineY" | null): void;
    getActiveType(): "rect" | "lineX" | "lineY" | null;
    /** Toggles "keep previous areas" (ECharts' toolbox "keep" tool). Returns the new state. */
    toggleKeep(): boolean;
    clear(): void;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

// INHERITED from ECharts documented defaults for `toolbox`:
// itemSize 15, itemGap 8, showTitle true, orient "horizontal",
// and the default anchor left:"right" / top:"top".
const DEFAULT_ITEM_SIZE = 15;
const DEFAULT_ITEM_GAP = 8;
const DEFAULT_LEFT: string = "right";
const DEFAULT_TOP: string = "top";

// DERIVED: padding around the glyph so the clickable box reaches the WCAG 2.5.8
// minimum target size of 24x24 CSS px at the default itemSize.
// itemSize + 2 * round(itemSize / 3) = 15 + 2 * 5 = 25 >= 24.
const BUTTON_PADDING_DIVISOR = 3;

// DERIVED: a pointer that moved less than the platform drag threshold is a
// click, not a rubber-band selection. 3px is the smallest movement Chromium
// reports as a drag rather than a click (its kDragThresholdX/Y is 3).
const MIN_DRAG_PIXELS = 3;

// INHERITED from ../overlay/tooltip.ts, which paints at z-index 9999. The
// toolbar must sit above the chart layers but below the tooltip.
const TOOLBAR_Z_INDEX = 10;
// DERIVED: one above the toolbar so the dataView panel covers it.
const PANEL_Z_INDEX = TOOLBAR_Z_INDEX + 1;

// INHERITED from ECharts' English locale strings for toolbox features.
const DEFAULT_TITLES = {
  saveAsImage: "Save as Image",
  restore: "Restore",
  dataView: "Data View",
  zoom: "Zoom",
  back: "Zoom Reset",
  line: "Switch to Line Chart",
  bar: "Switch to Bar Chart",
  stack: "Stack",
  tiled: "Tile",
};
// INHERITED: ECharts dataView.lang default is ["Data View", "Close", "Refresh"].
const DEFAULT_DATAVIEW_LANG: [string, string, string] = [
  "Data View",
  "Close",
  "Refresh",
];
// INHERITED from ECharts: the internal stack id magicType assigns to every
// series when the "stack" button is pressed.
const MAGIC_STACK_ID = "__ec_magicType_stack__";

// Series types magicType converts between; ECharts restricts the feature to
// the cartesian line/bar/scatter family.
const MAGIC_TYPES = ["line", "bar", "scatter"];

// ─── Warnings ─────────────────────────────────────────────────────────────────

// Dedupe by message: the toolbox is rebuilt on every option update, and
// without this an unsupported feature would spam the console on each one.
const warnedMessages = new Set<string>();
function warnOnce(message: string): void {
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  console.warn(message);
}

// ─── Theme + layout helpers ───────────────────────────────────────────────────

const iconColor = (): string => themeColor(null, "shift-9", "neutral");
const iconHoverColor = (): string => themeColor(null, "shift-10", "neutral");
const borderColor = (): string => themeColor(null, "shift-3", "neutral");
const surfaceColor = (): string => themeColor(null, "inherit", "neutral");

/**
 * Resolve a toolbox anchor (`left`/`top`/`right`/`bottom`) to CSS.
 * A number is pixels; a string is either a CSS length or a keyword.
 */
function anchorStyle(
  element: HTMLElement,
  option: ToolboxOption,
  horizontalDefault: string,
  verticalDefault: string,
): void {
  const toCss = (value: number | string): string =>
    typeof value === "number" ? `${value}px` : value;

  // `left` wins over `right` and `top` over `bottom`, as in ECharts.
  const left = option.left;
  const right = option.right;
  const top = option.top;
  const bottom = option.bottom;

  const horizontal = left !== undefined ? left : horizontalDefault;
  if (right !== undefined && left === undefined) {
    element.style.right = toCss(right);
  } else if (horizontal === "center") {
    element.style.left = "50%";
    element.style.transform = "translateX(-50%)";
  } else if (horizontal === "right") {
    element.style.right = "0";
  } else if (horizontal === "left") {
    element.style.left = "0";
  } else if (horizontal !== undefined) {
    element.style.left = toCss(horizontal);
  }

  const vertical = top !== undefined ? top : verticalDefault;
  if (bottom !== undefined && top === undefined) {
    element.style.bottom = toCss(bottom);
  } else if (vertical === "center" || vertical === "middle") {
    element.style.top = "50%";
    element.style.transform =
      `${element.style.transform} translateY(-50%)`.trim();
  } else if (vertical === "bottom") {
    element.style.bottom = "0";
  } else if (vertical === "top") {
    element.style.top = "0";
  } else if (vertical !== undefined) {
    element.style.top = toCss(vertical);
  }
}

// ─── Icons ────────────────────────────────────────────────────────────────────
// Path data is artwork on a 24x24 grid; stroke-based so it inherits the
// button's themed `color`.
const ICON_PATHS: Record<string, string> = {
  saveAsImage: "M12 3v12m0 0l-4-4m4 4l4-4M4 19h16",
  restore: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5",
  dataView: "M4 5h16M4 10h16M4 15h16M4 20h10",
  zoom: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16 16l4.5 4.5M8 11h6M11 8v6",
  back: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM16 16l4.5 4.5M8 11h6",
  line: "M4 18l5-6 4 3 7-8",
  bar: "M5 20V10M11 20V5M17 20v-8",
  stack: "M12 3l8 4.5-8 4.5-8-4.5L12 3zM4 16.5L12 21l8-4.5",
  rect: "M4 5h16v14H4z",
  lineX: "M8 4v16M16 4v16M5 12h5M14 12h5",
  lineY: "M4 8h16M4 16h16M12 5v5M12 14v5",
  keep: "M7 10V7a5 5 0 0 1 10 0v3M5 10h14v10H5z",
  clear: "M6 6l12 12M18 6L6 18",
};

function createIcon(name: string, size: number): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", ICON_PATHS[name] ?? "");
  svg.appendChild(path);
  return svg;
}

// ─── Option helpers ───────────────────────────────────────────────────────────

function seriesList(option: ChartOption): SeriesOption[] {
  return Array.isArray(option.series)
    ? option.series
    : option.series
      ? [option.series]
      : [];
}

function firstXAxis(option: ChartOption) {
  const axes = Array.isArray(option.xAxis)
    ? option.xAxis
    : option.xAxis
      ? [option.xAxis]
      : [];
  return axes[0];
}

/** Numeric value of a series data item, whatever accepted shape it has. */
function dataValue(item: unknown): number | null {
  if (item == null) return null;
  if (typeof item === "number") return item;
  if (Array.isArray(item)) {
    const last = item[item.length - 1];
    return typeof last === "number" ? last : null;
  }
  if (typeof item === "object") {
    const value = (item as { value?: unknown }).value;
    return typeof value === "number" ? value : null;
  }
  return null;
}

// ─── Feature: magicType ───────────────────────────────────────────────────────

/**
 * Build a NEW option whose cartesian series carry `type` and/or `stack`.
 * The incoming option is never mutated — every series is shallow-copied.
 */
function applyMagicType(
  option: ChartOption,
  change: { type?: "line" | "bar"; stack?: string | undefined },
): ChartOption {
  const series = seriesList(option).map((entry) => {
    if (!MAGIC_TYPES.includes(entry.type ?? "")) return entry;
    // The union member changes shape with `type`, so the rewritten series is
    // asserted back to SeriesOption; the runtime object is a plain copy.
    const copy = { ...entry } as Record<string, unknown>;
    if (change.type !== undefined) copy.type = change.type;
    if ("stack" in change) {
      if (change.stack === undefined) delete copy.stack;
      else copy.stack = change.stack;
    }
    return copy as unknown as SeriesOption;
  });
  return { ...option, series };
}

function isStacked(option: ChartOption): boolean {
  const cartesian = seriesList(option).filter((entry) =>
    MAGIC_TYPES.includes(entry.type ?? ""),
  );
  return (
    cartesian.length > 0 &&
    cartesian.every((entry) => (entry as { stack?: string }).stack != null)
  );
}

function allSeriesOfType(option: ChartOption, type: string): boolean {
  const cartesian = seriesList(option).filter((entry) =>
    MAGIC_TYPES.includes(entry.type ?? ""),
  );
  return (
    cartesian.length > 0 && cartesian.every((entry) => entry.type === type)
  );
}

// ─── Feature: dataView ────────────────────────────────────────────────────────

/** Tab-separated table: header row of series names, first column = category. */
function optionToText(option: ChartOption): string {
  const series = seriesList(option).filter((entry) =>
    Array.isArray((entry as { data?: unknown[] }).data),
  );
  const categories = (firstXAxis(option)?.data ?? []) as unknown[];
  const rowCount = series.reduce(
    (max, entry) =>
      Math.max(max, ((entry as { data?: unknown[] }).data ?? []).length),
    0,
  );
  const axisName = firstXAxis(option)?.name ?? "";
  const lines = [
    [
      axisName,
      ...series.map((entry, index) => entry.name ?? `series${index}`),
    ].join("\t"),
  ];
  for (let row = 0; row < rowCount; row++) {
    const category = categories[row];
    const label =
      category == null
        ? String(row)
        : typeof category === "object"
          ? String((category as { value?: unknown }).value ?? row)
          : String(category);
    const cells = series.map((entry) => {
      const value = dataValue(
        ((entry as { data?: unknown[] }).data ?? [])[row],
      );
      return value == null ? "" : String(value);
    });
    lines.push([label, ...cells].join("\t"));
  }
  return lines.join("\n");
}

/**
 * Parse edited dataView text back into series data arrays.
 * Returns null when anything is unparseable, so the caller leaves the option
 * untouched rather than rendering garbage.
 */
function textToOption(text: string, option: ChartOption): ChartOption | null {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) return null;
  const all = seriesList(option);
  const editable = all.filter((entry) =>
    Array.isArray((entry as { data?: unknown[] }).data),
  );
  if (editable.length === 0) return null;

  const columns: (number | null)[][] = editable.map(() => []);
  for (let row = 1; row < lines.length; row++) {
    const cells = lines[row].split("\t");
    for (let column = 0; column < editable.length; column++) {
      const cell = (cells[column + 1] ?? "").trim();
      if (cell === "" || cell === "-") {
        columns[column].push(null);
        continue;
      }
      const value = Number(cell);
      if (!Number.isFinite(value)) return null;
      columns[column].push(value);
    }
  }

  let editableIndex = 0;
  const series = all.map((entry) => {
    if (!Array.isArray((entry as { data?: unknown[] }).data)) return entry;
    const data = columns[editableIndex++];
    // ECharts' dataView rebuilds plain values too: per-item styling in the
    // original data items cannot survive a free-text edit.
    return { ...entry, data } as unknown as SeriesOption;
  });
  return { ...option, series };
}

// ─── Feature: saveAsImage ─────────────────────────────────────────────────────

/**
 * Replace every `var(--name)` in a serialized SVG with its resolved value.
 * An SVG serialized into an `Image` has no access to the document's custom
 * properties, so unresolved references paint as nothing.
 */
function resolveCssVariables(markup: string, container: HTMLElement): string {
  const computed = getComputedStyle(container);
  return markup.replace(
    /var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,\s*([^()]*))?\)/g,
    (_match, name: string, fallback: string | undefined) => {
      const value = computed.getPropertyValue(name).trim();
      if (value !== "") return value;
      return fallback !== undefined && fallback.trim() !== ""
        ? fallback.trim()
        : "transparent";
    },
  );
}

function svgToImage(
  svg: SVGSVGElement,
  container: HTMLElement,
  width: number,
  height: number,
  trackUrl: (url: string) => void,
  releaseUrl: (url: string) => void,
): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  const markup = resolveCssVariables(
    new XMLSerializer().serializeToString(clone),
    container,
  );
  const url = URL.createObjectURL(
    new Blob([markup], { type: "image/svg+xml;charset=utf-8" }),
  );
  trackUrl(url);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      releaseUrl(url);
      resolve(image);
    };
    image.onerror = () => {
      releaseUrl(url);
      reject(new Error("svg layer could not be rasterized"));
    };
    image.src = url;
  });
}

// Embedding the WebGL layer as a raster <image> inside the SVG is the
// intended, permanent behavior, not a stopgap: WebGL output has no vector
// form to recover (ECharts' own SVG renderer only emits vector output when
// the WHOLE chart is configured to render via SVG instead of Canvas/WebGL —
// there is no ECharts feature that vectorizes a canvas/WebGL-painted plot
// area on export either). Documented in apps/web/docs/chart/axes.md's
// "Feature notes" section.
// `type: "svg"` cannot turn the WebGL-rasterized series (bar/line/scatter/…)
// into vector paths — there is no vector data left once luma.gl has painted
// them — but it CAN produce a real, valid SVG document: the two vector SVG
// overlay layers (axes, legend, labels, tooltip chrome — everything this
// package itself draws as SVG) merged with the WebGL canvas embedded as one
// raster <image>, exactly how a browser's own "Save as SVG" does for a
// canvas-backed <foreignObject> or WebGL layer. Opening it in a vector editor
// still gets real, editable paths for the axes/legend/labels; only the
// WebGL-drawn marks stay a flat image.
function buildCombinedSvgMarkup(
  host: ToolboxHost,
  width: number,
  height: number,
): string {
  const svgNS = "http://www.w3.org/2000/svg";
  const xlinkNS = "http://www.w3.org/1999/xlink";
  const root = document.createElementNS(svgNS, "svg");
  root.setAttribute("xmlns", svgNS);
  // Without this, XMLSerializer has no "xlink" prefix bound on the document
  // and invents its own (`ns1:href`) for the embedded raster's `xlink:href`
  // below — valid XML, but not the conventional `xlink:href` some SVG
  // consumers parse for literally.
  root.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", xlinkNS);
  root.setAttribute("width", String(width));
  root.setAttribute("height", String(height));
  root.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const backgroundRect = document.createElementNS(svgNS, "rect");
  backgroundRect.setAttribute("x", "0");
  backgroundRect.setAttribute("y", "0");
  backgroundRect.setAttribute("width", String(width));
  backgroundRect.setAttribute("height", String(height));
  backgroundRect.setAttribute("fill", surfaceColor());
  root.appendChild(backgroundRect);

  const [background, ...rest] = host.svgLayers;
  if (background) {
    for (const child of Array.from(background.children)) {
      root.appendChild(child.cloneNode(true));
    }
  }

  // The WebGL canvas, read synchronously right after its own render — the
  // same assumption the PNG path's `context.drawImage(host.canvas, …)`
  // already relies on (no `preserveDrawingBuffer` needed either way; the
  // backing buffer is still valid in the same task the render finished in).
  const image = document.createElementNS(svgNS, "image");
  image.setAttribute("x", "0");
  image.setAttribute("y", "0");
  image.setAttribute("width", String(width));
  image.setAttribute("height", String(height));
  const rasterDataUrl = host.canvas.toDataURL("image/png");
  // Both forms: SVG2 renderers read the bare `href`; `xlink:href` is what
  // older/standalone SVG viewers and image editors still look for.
  image.setAttribute("href", rasterDataUrl);
  image.setAttributeNS(xlinkNS, "href", rasterDataUrl);
  root.appendChild(image);

  for (const layer of rest) {
    for (const child of Array.from(layer.children)) {
      root.appendChild(child.cloneNode(true));
    }
  }

  const clone = root as unknown as SVGSVGElement;
  return resolveCssVariables(
    new XMLSerializer().serializeToString(clone),
    host.container,
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function renderToolbox(
  option: ToolboxOption | undefined,
  host: ToolboxHost,
): () => void {
  const noop = () => {};
  if (!option || option.show === false) return noop;
  if (typeof document === "undefined") return noop;

  const feature = option.feature ?? {};
  const itemSize = option.itemSize ?? DEFAULT_ITEM_SIZE;
  const itemGap = option.itemGap ?? DEFAULT_ITEM_GAP;
  const showTitle = option.showTitle !== false;
  const orient = option.orient ?? "horizontal";
  const padding = Math.round(itemSize / BUTTON_PADDING_DIVISOR);

  const disposers: (() => void)[] = [];
  const objectUrls = new Set<string>();
  const trackUrl = (url: string) => objectUrls.add(url);
  const releaseUrl = (url: string) => {
    if (!objectUrls.delete(url)) return;
    URL.revokeObjectURL(url);
  };

  // ─── Toolbar shell ──────────────────────────────────────────────────────────
  const bar = document.createElement("div");
  bar.className = "dc-toolbox";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Chart tools");
  bar.setAttribute(
    "aria-orientation",
    orient === "vertical" ? "vertical" : "horizontal",
  );
  bar.style.position = "absolute";
  bar.style.display = "flex";
  bar.style.flexDirection = orient === "vertical" ? "column" : "row";
  bar.style.gap = `${itemGap}px`;
  bar.style.zIndex = String(TOOLBAR_Z_INDEX);
  anchorStyle(bar, option, DEFAULT_LEFT, DEFAULT_TOP);

  // :focus-visible and :hover cannot be expressed inline, so the toolbox ships
  // one <style> element that the teardown removes with the rest of its nodes.
  const style = document.createElement("style");
  style.textContent = `
.dc-toolbox-button{background:transparent;border:0;padding:${padding}px;margin:0;line-height:0;cursor:pointer;border-radius:${padding}px;color:${iconColor()};}
.dc-toolbox-button:hover{color:${iconHoverColor()};}
.dc-toolbox-button:focus-visible{outline:2px solid ${iconColor()};outline-offset:2px;}
.dc-toolbox-button[aria-pressed="true"]{color:${iconHoverColor()};outline:1px solid ${borderColor()};}
`;
  host.container.appendChild(style);
  host.container.appendChild(bar);
  disposers.push(() => {
    style.remove();
    bar.remove();
  });

  function addButton(
    iconName: string,
    label: string,
    onActivate: () => void,
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dc-toolbox-button";
    button.setAttribute("aria-label", label);
    if (showTitle) button.title = label;
    button.appendChild(createIcon(iconName, itemSize));
    button.addEventListener("click", onActivate);
    bar.appendChild(button);
    return button;
  }

  // ─── saveAsImage ────────────────────────────────────────────────────────────
  if (feature.saveAsImage && feature.saveAsImage.show !== false) {
    const config = feature.saveAsImage;
    const label = config.title ?? DEFAULT_TITLES.saveAsImage;
    addButton("saveAsImage", label, () => {
      const type = config.type ?? "png";
      const name = config.name ?? "chart";
      const { width, height } = host;

      if (type === "svg") {
        try {
          const markup = buildCombinedSvgMarkup(host, width, height);
          const url = URL.createObjectURL(
            new Blob([markup], { type: "image/svg+xml;charset=utf-8" }),
          );
          trackUrl(url);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = `${name}.svg`;
          anchor.rel = "noopener";
          anchor.style.display = "none";
          host.container.appendChild(anchor);
          anchor.click();
          anchor.remove();
          setTimeout(() => releaseUrl(url), 0);
        } catch (error) {
          warnOnce(
            `@domphy/chart: toolbox saveAsImage (svg) failed (${String(error)}); nothing was downloaded.`,
          );
        }
        return;
      }

      const ratio =
        typeof window !== "undefined" && window.devicePixelRatio
          ? window.devicePixelRatio
          : 1;
      try {
        const output = document.createElement("canvas");
        output.width = Math.round(width * ratio);
        output.height = Math.round(height * ratio);
        const context = output.getContext("2d");
        if (!context) throw new Error("2d context unavailable");
        context.scale(ratio, ratio);
        // A transparent PNG of a dark-theme chart is unreadable, so paint the
        // resolved page surface underneath everything.
        context.fillStyle = resolveCssVariables(surfaceColor(), host.container);
        context.fillRect(0, 0, width, height);

        // Paint order matches the DOM: background SVG, WebGL canvas, overlay SVG.
        const [background, ...rest] = host.svgLayers;
        const layers: Promise<HTMLImageElement | null>[] = [];
        layers.push(
          background
            ? svgToImage(
                background,
                host.container,
                width,
                height,
                trackUrl,
                releaseUrl,
              )
            : Promise.resolve(null),
        );
        layers.push(Promise.resolve(null)); // placeholder for the WebGL canvas
        for (const layer of rest) {
          layers.push(
            svgToImage(
              layer,
              host.container,
              width,
              height,
              trackUrl,
              releaseUrl,
            ),
          );
        }

        void Promise.all(layers)
          .then((images) => {
            images.forEach((image, index) => {
              if (index === 1) {
                context.drawImage(host.canvas, 0, 0, width, height);
                return;
              }
              if (image) context.drawImage(image, 0, 0, width, height);
            });
            output.toBlob(
              (blob) => {
                if (!blob) {
                  warnOnce(
                    "@domphy/chart: toolbox saveAsImage could not encode the chart; nothing was downloaded.",
                  );
                  return;
                }
                const url = URL.createObjectURL(blob);
                trackUrl(url);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `${name}.${type}`;
                anchor.rel = "noopener";
                anchor.style.display = "none";
                host.container.appendChild(anchor);
                anchor.click();
                anchor.remove();
                // Revoking in the same task can cancel the download before the
                // browser has read the blob; hand it back on the next task.
                setTimeout(() => releaseUrl(url), 0);
              },
              type === "jpg" ? "image/jpeg" : "image/png",
            );
          })
          .catch((error) => {
            warnOnce(
              `@domphy/chart: toolbox saveAsImage failed (${String(error)}); nothing was downloaded.`,
            );
          });
      } catch (error) {
        warnOnce(
          `@domphy/chart: toolbox saveAsImage failed (${String(error)}); nothing was downloaded.`,
        );
      }
    });
  }

  // ─── restore ────────────────────────────────────────────────────────────────
  if (feature.restore && feature.restore.show !== false) {
    addButton("restore", feature.restore.title ?? DEFAULT_TITLES.restore, () =>
      host.restore(),
    );
  }

  // ─── dataView ───────────────────────────────────────────────────────────────
  if (feature.dataView && feature.dataView.show !== false) {
    const config = feature.dataView;
    const lang = config.lang ?? DEFAULT_DATAVIEW_LANG;
    const label = config.title ?? lang[0] ?? DEFAULT_TITLES.dataView;
    const readOnly = config.readOnly !== false;
    let panel: HTMLDivElement | null = null;

    const closePanel = (returnFocus: boolean) => {
      if (!panel) return;
      panel.remove();
      panel = null;
      if (returnFocus) dataViewButton.focus();
    };

    const openPanel = () => {
      if (panel) {
        closePanel(true);
        return;
      }
      const current = host.getCurrentOption();
      const element = document.createElement("div");
      element.className = "dc-toolbox-dataview";
      element.setAttribute("role", "dialog");
      element.setAttribute("aria-label", lang[0] ?? DEFAULT_TITLES.dataView);
      element.style.position = "absolute";
      element.style.top = "0";
      element.style.left = "0";
      element.style.right = "0";
      element.style.bottom = "0";
      element.style.zIndex = String(PANEL_Z_INDEX);
      element.style.display = "flex";
      element.style.flexDirection = "column";
      element.style.gap = `${itemGap}px`;
      element.style.padding = `${itemGap}px`;
      element.style.boxSizing = "border-box";
      element.style.background = surfaceColor();
      element.style.color = iconColor();
      element.style.border = `1px solid ${borderColor()}`;

      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.alignItems = "center";
      header.style.justifyContent = "space-between";
      header.style.gap = `${itemGap}px`;
      const heading = document.createElement("strong");
      heading.textContent = lang[0] ?? DEFAULT_TITLES.dataView;
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.className = "dc-toolbox-button";
      closeButton.textContent = lang[1] ?? DEFAULT_DATAVIEW_LANG[1];
      closeButton.style.lineHeight = "normal";
      closeButton.setAttribute(
        "aria-label",
        lang[1] ?? DEFAULT_DATAVIEW_LANG[1],
      );
      closeButton.addEventListener("click", () => closePanel(true));
      header.appendChild(heading);
      header.appendChild(closeButton);
      element.appendChild(header);

      const text = optionToText(current);
      let readField: HTMLTextAreaElement | HTMLPreElement;
      if (readOnly) {
        const pre = document.createElement("pre");
        pre.textContent = text;
        pre.tabIndex = 0;
        pre.style.flex = "1";
        pre.style.margin = "0";
        pre.style.overflow = "auto";
        readField = pre;
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("aria-label", lang[0] ?? DEFAULT_TITLES.dataView);
        textarea.style.flex = "1";
        textarea.style.width = "100%";
        textarea.style.boxSizing = "border-box";
        textarea.style.background = "transparent";
        textarea.style.color = "inherit";
        textarea.style.border = `1px solid ${borderColor()}`;
        readField = textarea;
      }
      element.appendChild(readField);

      if (!readOnly) {
        const refresh = document.createElement("button");
        refresh.type = "button";
        refresh.className = "dc-toolbox-button";
        refresh.textContent = lang[2] ?? DEFAULT_DATAVIEW_LANG[2];
        refresh.style.lineHeight = "normal";
        refresh.style.alignSelf = "flex-start";
        refresh.setAttribute("aria-label", lang[2] ?? DEFAULT_DATAVIEW_LANG[2]);
        refresh.addEventListener("click", () => {
          const edited = textToOption(
            (readField as HTMLTextAreaElement).value,
            host.getCurrentOption(),
          );
          if (!edited) {
            warnOnce(
              "@domphy/chart: toolbox dataView could not parse the edited table; the chart was left unchanged.",
            );
            return;
          }
          host.applyOption(edited);
          closePanel(true);
        });
        element.appendChild(refresh);
      }

      // Scoped to the panel: it is removed with the node, so no document
      // listener can outlive a re-render.
      element.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        closePanel(true);
      });

      host.container.appendChild(element);
      panel = element;
      readField.focus();
    };

    const dataViewButton = addButton("dataView", label, openPanel);
    disposers.push(() => closePanel(false));
  }

  // ─── dataZoom ───────────────────────────────────────────────────────────────
  if (feature.dataZoom && feature.dataZoom.show !== false) {
    const config = feature.dataZoom;
    // ECharts: an axis kind is controlled unless its index is explicitly
    // "none"/false. With neither set, BOTH kinds are controlled by the
    // rectangle select (a 2D drag), matching feature/dataZoom.js's default.
    const xEnabled = !(
      config.xAxisIndex === "none" || config.xAxisIndex === false
    );
    const yEnabled = !(
      config.yAxisIndex === "none" || config.yAxisIndex === false
    );
    if (!xEnabled && !yEnabled) {
      warnOnce(
        "@domphy/chart: toolbox.feature.dataZoom has both xAxisIndex and yAxisIndex set to 'none'/false — nothing left to zoom, so no zoom buttons are rendered.",
      );
    } else {
      let selectionLayer: HTMLDivElement | null = null;
      let selectionBox: HTMLDivElement | null = null;
      let dragStart: { x: number; y: number } | null = null;
      let plotRect: {
        x: number;
        y: number;
        width: number;
        height: number;
      } | null = null;

      const clearSelection = () => {
        dragStart = null;
        if (selectionBox) {
          selectionBox.remove();
          selectionBox = null;
        }
      };

      const pointerPos = (event: PointerEvent): { x: number; y: number } => {
        const bounds = host.container.getBoundingClientRect();
        return {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        };
      };

      // Clamp to the plot rect, collapsed to the rect's own span on the axis
      // that isn't part of this selection (x-only drag keeps full height,
      // y-only drag keeps full width — a 1D rubber band on that side).
      const clampPos = (
        raw: { x: number; y: number },
        rect: { x: number; y: number; width: number; height: number },
      ) => ({
        x: xEnabled
          ? Math.min(Math.max(raw.x, rect.x), rect.x + rect.width)
          : rect.x,
        y: yEnabled
          ? Math.min(Math.max(raw.y, rect.y), rect.y + rect.height)
          : rect.y,
      });

      const onPointerDown = (event: PointerEvent) => {
        if (!plotRect) return;
        const rect = plotRect;
        dragStart = clampPos(pointerPos(event), rect);
        selectionBox = document.createElement("div");
        selectionBox.style.position = "absolute";
        selectionBox.style.top = `${yEnabled ? dragStart.y : rect.y}px`;
        selectionBox.style.height = `${yEnabled ? 0 : rect.height}px`;
        selectionBox.style.left = `${xEnabled ? dragStart.x : rect.x}px`;
        selectionBox.style.width = `${xEnabled ? 0 : rect.width}px`;
        selectionBox.style.pointerEvents = "none";
        selectionBox.style.zIndex = String(TOOLBAR_Z_INDEX);
        selectionBox.style.border = `1px solid ${borderColor()}`;
        selectionBox.style.background = borderColor();
        selectionBox.style.opacity = "0.35";
        host.container.appendChild(selectionBox);
      };

      const onPointerMove = (event: PointerEvent) => {
        if (dragStart == null || !selectionBox || !plotRect) return;
        const current = clampPos(pointerPos(event), plotRect);
        if (xEnabled) {
          selectionBox.style.left = `${Math.min(dragStart.x, current.x)}px`;
          selectionBox.style.width = `${Math.abs(current.x - dragStart.x)}px`;
        }
        if (yEnabled) {
          selectionBox.style.top = `${Math.min(dragStart.y, current.y)}px`;
          selectionBox.style.height = `${Math.abs(current.y - dragStart.y)}px`;
        }
      };

      // Percent along a pixel axis, 0 at pixelLow and 100 at pixelHigh —
      // x runs left(low)→right(high); y runs BOTTOM(low)→TOP(high) since
      // the data domain increases upward while pixel y increases downward
      // (matches coord/grid.ts's yScale pixel range [rect.y+height, rect.y]).
      const toPercent = (value: number, pixelLow: number, pixelHigh: number) =>
        Math.min(
          100,
          Math.max(0, ((value - pixelLow) / (pixelHigh - pixelLow)) * 100),
        );

      const onPointerUp = (event: PointerEvent) => {
        if (dragStart == null || !plotRect) return;
        const rect = plotRect;
        const start = dragStart;
        const end = clampPos(pointerPos(event), rect);
        clearSelection();
        const movedX = Math.abs(end.x - start.x);
        const movedY = Math.abs(end.y - start.y);
        if (xEnabled && !yEnabled && movedX < MIN_DRAG_PIXELS) return;
        if (yEnabled && !xEnabled && movedY < MIN_DRAG_PIXELS) return;
        if (
          xEnabled &&
          yEnabled &&
          movedX < MIN_DRAG_PIXELS &&
          movedY < MIN_DRAG_PIXELS
        )
          return;
        const window: {
          x?: { start: number; end: number };
          y?: { start: number; end: number };
        } = {};
        if (xEnabled) {
          window.x = {
            start: toPercent(
              Math.min(start.x, end.x),
              rect.x,
              rect.x + rect.width,
            ),
            end: toPercent(
              Math.max(start.x, end.x),
              rect.x,
              rect.x + rect.width,
            ),
          };
        }
        if (yEnabled) {
          // Bottom edge (larger pixel y) is the low percent, top edge the high one.
          window.y = {
            start: toPercent(
              Math.max(start.y, end.y),
              rect.y + rect.height,
              rect.y,
            ),
            end: toPercent(
              Math.min(start.y, end.y),
              rect.y + rect.height,
              rect.y,
            ),
          };
        }
        host.setZoomWindow(window);
      };

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== "Escape") return;
        clearSelection();
        deactivate();
        zoomButton.focus();
      };

      const deactivate = () => {
        if (!selectionLayer) return;
        clearSelection();
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
        document.removeEventListener("pointercancel", onPointerUp);
        document.removeEventListener("keydown", onKeyDown);
        selectionLayer.remove();
        selectionLayer = null;
        plotRect = null;
        zoomButton.setAttribute("aria-pressed", "false");
      };

      const activate = () => {
        const rect = host.getPlotRect();
        if (!rect) {
          warnOnce(
            "@domphy/chart: toolbox dataZoom needs a cartesian plot area; this chart has none, so rectangle select does nothing.",
          );
          return;
        }
        plotRect = rect;
        const layer = document.createElement("div");
        layer.style.position = "absolute";
        layer.style.left = `${rect.x}px`;
        layer.style.top = `${rect.y}px`;
        layer.style.width = `${rect.width}px`;
        layer.style.height = `${rect.height}px`;
        layer.style.cursor = "crosshair";
        layer.style.touchAction = "none";
        layer.style.zIndex = String(TOOLBAR_Z_INDEX);
        layer.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
        document.addEventListener("pointercancel", onPointerUp);
        document.addEventListener("keydown", onKeyDown);
        host.container.appendChild(layer);
        selectionLayer = layer;
        zoomButton.setAttribute("aria-pressed", "true");
      };

      const zoomButton = addButton(
        "zoom",
        config.title?.zoom ?? DEFAULT_TITLES.zoom,
        () => {
          if (selectionLayer) deactivate();
          else activate();
        },
      );
      zoomButton.setAttribute("aria-pressed", "false");

      addButton("back", config.title?.back ?? DEFAULT_TITLES.back, () => {
        host.setZoomWindow(null);
      });

      disposers.push(deactivate);
    }
  }

  // ─── magicType ──────────────────────────────────────────────────────────────
  if (feature.magicType && feature.magicType.show !== false) {
    const config = feature.magicType;
    const types = config.type ?? [];
    for (const magic of types) {
      if (magic === "line" || magic === "bar") {
        const label = config.title?.[magic] ?? DEFAULT_TITLES[magic];
        const button = addButton(magic, label, () => {
          host.applyOption(
            applyMagicType(host.getCurrentOption(), { type: magic }),
          );
        });
        button.setAttribute(
          "aria-pressed",
          String(allSeriesOfType(host.getCurrentOption(), magic)),
        );
      } else if (magic === "stack") {
        const stacked = isStacked(host.getCurrentOption());
        const label = stacked
          ? (config.title?.tiled ?? DEFAULT_TITLES.tiled)
          : (config.title?.stack ?? DEFAULT_TITLES.stack);
        const button = addButton("stack", label, () => {
          const current = host.getCurrentOption();
          host.applyOption(
            applyMagicType(current, {
              stack: isStacked(current) ? undefined : MAGIC_STACK_ID,
            }),
          );
        });
        button.setAttribute("aria-pressed", String(stacked));
      }
    }
  }

  // ─── brush ──────────────────────────────────────────────────────────────────
  if (feature.brush && feature.brush.show !== false && host.brush) {
    const brush = host.brush;
    const tools = feature.brush.type ?? [
      "rect",
      "lineX",
      "lineY",
      "keep",
      "clear",
    ];
    const brushTitles: Record<string, string> = {
      rect: "Rectangle Selection",
      polygon: "Polygon Selection",
      lineX: "Horizontal Selection",
      lineY: "Vertical Selection",
      keep: "Keep Previous Selection",
      clear: "Clear Selection",
      ...feature.brush.title,
    };
    const drawButtons: HTMLButtonElement[] = [];
    for (const tool of tools) {
      if (tool === "polygon") {
        warnOnce(
          "@domphy/chart: toolbox.feature.brush's 'polygon' tool is not implemented — only 'rect'/'lineX'/'lineY'/'keep'/'clear' render a button.",
        );
        continue;
      }
      if (tool === "rect" || tool === "lineX" || tool === "lineY") {
        const button = addButton(tool, brushTitles[tool] ?? tool, () => {
          const next = brush.getActiveType() === tool ? null : tool;
          brush.setActiveType(next);
          for (const b of drawButtons) {
            b.setAttribute(
              "aria-pressed",
              String(b === button && next !== null),
            );
          }
        });
        button.setAttribute("aria-pressed", "false");
        drawButtons.push(button);
        continue;
      }
      if (tool === "keep") {
        const button = addButton(tool, brushTitles.keep, () => {
          button.setAttribute("aria-pressed", String(brush.toggleKeep()));
        });
        button.setAttribute("aria-pressed", "false");
        continue;
      }
      if (tool === "clear") {
        addButton(tool, brushTitles.clear, () => {
          brush.clear();
          brush.setActiveType(null);
          for (const b of drawButtons) b.setAttribute("aria-pressed", "false");
        });
      }
    }
    disposers.push(() => brush.setActiveType(null));
  } else if (feature.brush && feature.brush.show !== false) {
    // `option.brush` was not configured and no brush controller was built —
    // matches the pre-brush-implementation fallback for a toolbox-only ask.
    warnOnce(
      "@domphy/chart: toolbox.feature.brush has no effect — no brush controller is available for this chart.",
    );
  }

  return () => {
    for (const dispose of disposers) dispose();
    disposers.length = 0;
    for (const url of Array.from(objectUrls)) releaseUrl(url);
  };
}
