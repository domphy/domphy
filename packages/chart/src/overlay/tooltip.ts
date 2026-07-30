import { type DomphyElement, ElementNode } from "@domphy/core";
import {
  computePosition,
  flip,
  type Middleware,
  offset,
  platform,
  shift,
  type VirtualElement,
} from "@domphy/floating";
import { themeColor } from "@domphy/theme";
import { cssColor, familyCss } from "../gl/color.js";
import type { TooltipOption, TooltipParams } from "../types.js";

export interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  params: TooltipParams[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paddingCss(padding: TooltipOption["padding"]): string {
  if (padding == null) return "8px 12px";
  if (typeof padding === "number") return `${padding}px`;
  return padding.map((value) => `${value}px`).join(" ");
}

export function createTooltip(
  container: HTMLElement,
  option: TooltipOption,
): {
  update(state: TooltipState): void;
  destroy(): void;
} {
  const el = document.createElement("div");
  el.className = option.className
    ? `dc-tooltip ${option.className}`
    : "dc-tooltip";

  const textStyle = option.textStyle ?? {};
  el.style.cssText = [
    "position:absolute",
    "top:0",
    "left:0",
    "pointer-events:none",
    "z-index:9999",
    `padding:${paddingCss(option.padding)}`,
    "border-radius:6px",
    `font-size:${textStyle.fontSize ?? 12}px`,
    `line-height:${textStyle.lineHeight ?? 1.6}`,
    `font-weight:${textStyle.fontWeight ?? "normal"}`,
    "box-shadow:0 4px 16px rgba(0,0,0,0.18)",
    "transition:opacity 0.12s ease",
    "opacity:0",
    "max-width:260px",
    "white-space:nowrap",
    // Theme colors as var(--…) references — the tooltip repaints itself on
    // [data-theme] flips without a re-render.
    `background:${
      option.backgroundColor
        ? cssColor(option.backgroundColor, 0)
        : themeColor(null, "shift-0", "neutral")
    }`,
    `border:${option.borderWidth ?? 1}px solid ${
      option.borderColor
        ? cssColor(option.borderColor, 0)
        : themeColor(null, "shift-3", "neutral")
    }`,
    `color:${
      textStyle.color
        ? familyCss(textStyle.color)
        : themeColor(null, "shift-10", "neutral")
    }`,
    option.extraCssText ?? "",
  ].join(";");

  container.appendChild(el);

  // A formatter returning a DomphyElement is mounted imperatively (one
  // ElementNode per update, disposed on the next) instead of being coerced
  // to "[object Object]".
  let contentNode: ElementNode | null = null;
  const clearContentNode = () => {
    contentNode?.remove();
    contentNode = null;
  };

  function formatDefault(params: TooltipParams[]): string {
    return params
      .map((p) => {
        // p.color is a var(--…) reference (or a concrete user color) — either
        // is valid as a CSS background here.
        const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px;"></span>`;
        // p.seriesName/p.name/p.value come from caller-controlled ChartOption data — must escape before innerHTML.
        const val = option.valueFormatter
          ? option.valueFormatter(p.value, p.dataIndex)
          : String(p.value ?? "");
        const label = escapeHtml(String(p.seriesName ?? p.name ?? ""));
        return `${dot}<strong>${label}</strong>: ${escapeHtml(val)}`;
      })
      .join("<br>");
  }

  function setContent(params: TooltipParams[]): void {
    if (!option.formatter) {
      clearContentNode();
      el.innerHTML = formatDefault(params);
      return;
    }
    const result =
      typeof option.formatter === "function"
        ? option.formatter(params, "", () => {})
        : option.formatter;
    if (result != null && typeof result === "object") {
      clearContentNode();
      el.textContent = "";
      contentNode = new ElementNode(result as DomphyElement);
      contentNode.render(el);
    } else {
      clearContentNode();
      el.innerHTML = String(result);
    }
  }

  // Position via @domphy/floating: a zero-size virtual reference at the
  // cursor, "right" placement (vertically centered, matching the previous
  // translate(12px,-50%) default), flip() to the left edge when overflowing,
  // shift() to confine inside the container when option.confine is set.
  // getOffsetParent is pinned to the container so coordinates are always
  // relative to it (jsdom reports offsetParent null for every element).
  let positionTicket = 0;
  function position(x: number, y: number): void {
    const ticket = ++positionTicket;
    const containerRect = container.getBoundingClientRect();
    const reference: VirtualElement = {
      getBoundingClientRect: () => ({
        x: containerRect.left + x,
        y: containerRect.top + y,
        left: containerRect.left + x,
        top: containerRect.top + y,
        right: containerRect.left + x,
        bottom: containerRect.top + y,
        width: 0,
        height: 0,
      }),
    };
    const middleware: Middleware[] = [offset(14), flip()];
    if (option.confine) middleware.push(shift({ padding: 8 }));
    computePosition(reference, el, {
      placement: "right",
      middleware,
      platform: { ...platform, getOffsetParent: () => container },
    }).then((coords) => {
      // A later update/hide supersedes this async result.
      if (ticket !== positionTicket) return;
      el.style.left = `${coords.x}px`;
      el.style.top = `${coords.y}px`;
    });
  }

  return {
    update(state: TooltipState) {
      if (
        !state.visible ||
        state.params.length === 0 ||
        option.show === false
      ) {
        positionTicket++; // invalidate any in-flight positioning
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        return;
      }

      const { x, y, params } = state;
      setContent(params);
      el.style.opacity = "1";
      position(x, y);
    },
    destroy() {
      positionTicket++;
      clearContentNode();
      el.remove();
    },
  };
}
