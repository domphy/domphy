import { expect, test } from "@playwright/test";
import { mountBlock, openDemo } from "./helpers.js";

/**
 * dashboard01's data table. The existing interaction check covers the sidebar
 * and the chart's date-range control but nothing in the table, which is the
 * block's main surface.
 *
 * Truth sources, none of them the code's own output:
 *  - shadcn/ui dashboard-01: the tab strip above the table filters the rows by
 *    status ("Done" / "In Progress" / "Not Started"), and the footer reports
 *    "<n> of <m> row(s) selected" driven by the row checkboxes.
 *  - WAI-ARIA APG "Tabs": exactly one tab carries `aria-selected="true"`.
 */

const BOX = '[data-block="dashboard01"] .block-box';

test("dashboard01 table: status tabs filter rows and selection is counted", async ({
  page,
}) => {
  await openDemo(page);
  await mountBlock(page, "dashboard01");

  const tabs = page.locator(`${BOX} [role="tab"]`);
  const rows = page.locator(`${BOX} tbody tr`);
  await expect(tabs).toHaveCount(4);
  const allRows = await rows.count();
  expect(allRows).toBeGreaterThan(3);

  for (const status of ["Done", "In Progress", "Not Started"]) {
    const tab = tabs.filter({ hasText: status }).first();
    await tab.click();
    await expect(tab).toHaveAttribute("aria-selected", "true");
    // APG Tabs: only the active tab is selected.
    await expect(
      page.locator(`${BOX} [role="tab"][aria-selected="true"]`),
    ).toHaveCount(1);

    const shown = await rows.count();
    expect(shown, `${status} narrows the table`).toBeLessThan(allRows);
    expect(shown).toBeGreaterThan(0);
    // Every remaining row really carries that status.
    for (const text of await rows.allTextContents()) {
      expect(text.replace(/\s+/g, " ")).toContain(status);
    }
  }

  await tabs.first().click();
  await expect(rows).toHaveCount(allRows);

  const firstCheckbox = page
    .locator(`${BOX} tbody input[type="checkbox"]`)
    .first();
  await firstCheckbox.check();
  await expect(page.locator(BOX)).toContainText("1 of ");
  await expect(page.locator(BOX)).toContainText("row(s) selected");
});
