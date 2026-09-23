// Shared "chart failed" overlay — the one visible surface a consumer sees
// when WebGL setup or rendering fails. Single source of truth so device
// init failure (patch.ts) and a shader/pipeline error surfaced from the
// device itself (device.ts) render the exact same markup instead of two
// copies drifting apart.
const CHART_ERROR_CLASS = "dc-chart-error";
const CHART_ERROR_STYLE =
  "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;" +
  "pointer-events:none;color:var(--neutral-8, #6b7280);font-size:12px;";

/**
 * Appends the chart-failed message into `container`. A no-op if one is
 * already showing (a device can report more than one shader error; the
 * container should still only ever carry a single message).
 */
export function showChartError(
  container: HTMLElement | null,
  text: string,
): void {
  if (!container || typeof document === "undefined") return;
  if (container.querySelector(`.${CHART_ERROR_CLASS}`)) return;
  const message = document.createElement("div");
  message.className = CHART_ERROR_CLASS;
  message.style.cssText = CHART_ERROR_STYLE;
  message.textContent = text;
  container.appendChild(message);
}
