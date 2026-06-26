import type { AuditIssue, AuditPage } from "./types.js";

/**
 * Checks that Domphy theme CSS variables are initialized on the page.
 * Reports if data-theme is missing from the root element or if CSS vars
 * like --neutral-0 are unresolved (which makes all theme-based colors transparent).
 */
export async function checkTheme(page: AuditPage): Promise<AuditIssue[]> {
  const findings = await page.evaluate(() => {
    const issues: { message: string }[] = [];
    const root = document.documentElement;

    if (!root.hasAttribute("data-theme")) {
      issues.push({
        message:
          "document.documentElement is missing data-theme attribute — Domphy CSS vars (--neutral-*, --primary-*, etc.) are scoped to [data-theme] selectors and will be unresolved, causing transparent backgrounds",
      });
    }

    const resolved = getComputedStyle(root)
      .getPropertyValue("--neutral-0")
      .trim();
    if (!resolved) {
      issues.push({
        message:
          "CSS custom property --neutral-0 is unresolved — themeApply() has not run or the data-theme attribute is absent; all Domphy color vars will be empty",
      });
    }

    return issues;
  });

  return findings.map(({ message }) => ({
    type: "theme" as const,
    message,
  }));
}
