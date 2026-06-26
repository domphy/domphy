import type { AuditIssue, AuditPage } from "./types.js";

// Default Domphy light theme density values (index 0-4)
const DENSITIES = [0.75, 1, 1.5, 2, 2.5];

export async function verifyGeometry(page: AuditPage, tolerance = 1): Promise<AuditIssue[]> {
  const findings = await page.evaluate(
    ([tol, densities]: [number, number[]]) => {
      // Domphy marks every element with {tagName}_{nodeId} class
      // nodeId = [a-z][0-9a-f]+, so Domphy buttons have class /^button_[a-z][0-9a-f]+$/
      const isDomphyElement = (el: Element, tag: string) =>
        Array.from(el.classList).some((cls) => new RegExp(`^${tag}_[a-z][0-9a-f]+$`).test(cls));

      const buttons = Array.from(document.querySelectorAll("button")).filter((btn) =>
        isDomphyElement(btn, "button"),
      );

      const result: { message: string; rect: { x: number; y: number; width: number; height: number } }[] = [];

      for (const btn of buttons) {
        const style = getComputedStyle(btn);
        const rect = btn.getBoundingClientRect();
        const fontSize = parseFloat(style.fontSize);
        const paddingTop = parseFloat(style.paddingTop);
        const U = fontSize / 4;

        if (U === 0 || rect.height === 0) continue;

        const density = paddingTop / U;
        const nearest = densities.reduce((a, b) =>
          Math.abs(a - density) < Math.abs(b - density) ? a : b,
        );

        if (Math.abs(density - nearest) > 0.1) {
          result.push({
            message: `button paddingBlock (${paddingTop.toFixed(1)}px) doesn't match any Domphy density at ${fontSize.toFixed(0)}px font (d≈${density.toFixed(2)})`,
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          });
          continue;
        }

        // Button height formula: (6 + 2d) * U
        const expectedHeight = (6 + 2 * nearest) * U;
        if (Math.abs(rect.height - expectedHeight) > tol) {
          result.push({
            message: `button height: got ${rect.height.toFixed(1)}px, expected ${expectedHeight.toFixed(1)}px (d=${nearest}, U=${U.toFixed(1)}px)`,
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          });
        }
      }
      return result;
    },
    [tolerance, DENSITIES] as [number, number[]],
  );

  return findings.map(({ message, rect }) => ({
    type: "geometry" as const,
    message,
    rect,
  }));
}
