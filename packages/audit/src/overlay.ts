import type { AuditIssue, AuditPage } from "./types.js";

/**
 * Checks visible positioned overlay elements (dropdowns, modals, tooltips,
 * popovers) for two common Domphy bugs:
 *
 * 1. Transparent background — overlay is visible but has no background color,
 *    usually caused by unresolved CSS vars (missing data-theme) or a missing
 *    dataTone on the container.
 *
 * 2. Hover gap — overlay's top edge is more than 4px below its offset parent's
 *    bottom edge, creating a dead zone where hovering triggers close-on-mouseout
 *    before the user can reach the overlay.
 *
 * Call this after triggering the open/hover state with Playwright so overlays
 * are visible: `await page.hover('.trigger'); await checkLayout(page)`.
 */
export async function checkOverlays(page: AuditPage): Promise<AuditIssue[]> {
  const findings = await page.evaluate(() => {
    const issues: {
      message: string;
      rect: { x: number; y: number; width: number; height: number };
    }[] = [];

    for (const el of Array.from(document.querySelectorAll("*"))) {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      if (style.display === "none" || style.visibility === "hidden") continue;
      if (rect.width === 0 || rect.height === 0) continue;

      const position = style.position;
      const zIndex = parseInt(style.zIndex || "0", 10);
      if ((position !== "absolute" && position !== "fixed") || zIndex <= 0)
        continue;

      const tag = el.tagName.toLowerCase();
      const cls = el.className
        ? String(el.className).trim().split(/\s+/)[0]
        : "";
      const label = `<${tag}${cls ? `.${cls}` : ""}>`;

      // Check 1: transparent background — visible overlay should be opaque
      const bg = style.backgroundColor;
      const hasGradient = style.backgroundImage.includes("gradient");
      const hasBackdrop = style.backdropFilter !== "none";
      if (bg === "rgba(0, 0, 0, 0)" && !hasGradient && !hasBackdrop) {
        issues.push({
          message: `${label} is a visible overlay (position:${position}, z-index:${zIndex}) with a fully transparent background — missing data-theme on <html> or dataTone on the container`,
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
        });
      }

      // Check 2: hover gap — gap between overlay and its offset parent causes
      // the :hover to drop out before the cursor reaches the overlay
      if (position === "absolute") {
        const parent = (el as HTMLElement).offsetParent;
        if (parent) {
          const parentRect = parent.getBoundingClientRect();
          const gap = rect.top - parentRect.bottom;
          if (gap > 4) {
            issues.push({
              message: `${label} has a ${gap.toFixed(0)}px gap below its offset parent — moving the mouse from trigger to overlay crosses a dead zone that fires hover-out and closes it prematurely (use top:100% + paddingTop instead of top:calc(100% + N))`,
              rect: {
                x: rect.x,
                y: parentRect.bottom,
                width: rect.width,
                height: gap,
              },
            });
          }
        }
      }
    }

    return issues;
  });

  return findings.map(({ message, rect }) => ({
    type: "overlay" as const,
    message,
    rect,
  }));
}
