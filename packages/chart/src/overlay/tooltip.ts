import { themeColorToken } from "@domphy/theme";
import type { TooltipOption, TooltipParams } from "../types.js";

export interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  params: TooltipParams[];
}

export function createTooltip(
  container: HTMLElement,
  option: TooltipOption,
): {
  update(state: TooltipState): void;
  destroy(): void;
} {
  const el = document.createElement("div");
  el.className = "dc-tooltip";
  el.style.cssText = [
    "position:absolute",
    "pointer-events:none",
    "z-index:9999",
    "padding:8px 12px",
    "border-radius:6px",
    "font-size:12px",
    "line-height:1.6",
    "box-shadow:0 4px 16px rgba(0,0,0,0.18)",
    "transition:opacity 0.12s ease,transform 0.12s ease",
    "opacity:0",
    "transform:translate(12px,-50%)",
    "max-width:260px",
    "white-space:nowrap",
    `background:${themeColorToken(null, "shift-0", "neutral")}`,
    `border:1px solid ${themeColorToken(null, "shift-3", "neutral")}`,
    `color:${themeColorToken(null, "shift-10", "neutral")}`,
  ].join(";");

  container.appendChild(el);

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDefault(params: TooltipParams[]): string {
    return params
      .map((p) => {
        const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px;"></span>`;
        // p.seriesName/p.name/p.value come from caller-controlled ChartOption data — must escape before innerHTML.
        const val = option.valueFormatter ? option.valueFormatter(p.value, p.dataIndex) : String(p.value ?? "");
        const label = escapeHtml(String(p.seriesName ?? p.name ?? ""));
        return `${dot}<strong>${label}</strong>: ${escapeHtml(val)}`;
      })
      .join("<br>");
  }

  return {
    update(state: TooltipState) {
      if (!state.visible || state.params.length === 0 || option.show === false) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        return;
      }

      const { x, y, params } = state;
      const formatted = option.formatter
        ? (typeof option.formatter === "function"
            ? String((option.formatter as Function)(params, "", () => {}))
            : String(option.formatter))
        : formatDefault(params);

      el.innerHTML = formatted;
      el.style.opacity = "1";

      // Position: avoid overflowing container
      const rect = container.getBoundingClientRect();
      const tipW = el.offsetWidth;
      const tipH = el.offsetHeight;
      let left = x + 14;
      let top = y - tipH / 2;
      if (left + tipW > rect.width - 8) left = x - tipW - 14;
      if (top < 4) top = 4;
      if (top + tipH > rect.height - 4) top = rect.height - tipH - 4;

      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.transform = "none";
    },
    destroy() {
      el.remove();
    },
  };
}
