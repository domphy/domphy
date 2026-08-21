import { expect, test } from "@playwright/test";
import { mountBlock, openDemo } from "./helpers";

const SMOKE_BLOCKS = ["sidebar07", "dashboard01", "Login01"] as const;

test.describe("blocks demo (real Chromium)", () => {
  test("demo registers factories and exposes mountBlock", async ({ page }) => {
    await openDemo(page);
    const registered = await page.evaluate(
      () => document.querySelectorAll("[data-block]").length,
    );
    expect(registered).toBeGreaterThan(100);
  });

  for (const name of SMOKE_BLOCKS) {
    test(`mounts ${name} without a card error`, async ({ page }) => {
      await openDemo(page);
      await mountBlock(page, name);
    });
  }
});
