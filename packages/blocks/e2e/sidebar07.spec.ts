import { expect, test } from "@playwright/test";
import { mountBlock, openDemo } from "./helpers";

test("sidebar07 accordion: Playground starts open, Models expands on click", async ({
  page,
}) => {
  await openDemo(page);
  await mountBlock(page, "sidebar07");
  const block = page.locator('[data-block="sidebar07"]');

  const playground = block
    .locator("aside nav li details")
    .filter({ hasText: "Playground" })
    .first();
  const models = block
    .locator("aside nav li details")
    .filter({ hasText: "Models" })
    .first();

  await expect(playground).toHaveJSProperty("open", true);
  await expect(models).toHaveJSProperty("open", false);

  await models.locator("summary").first().click();
  await expect(models).toHaveJSProperty("open", true);
  await expect(
    models.locator("ul li a", { hasText: "Genesis" }).first(),
  ).toBeVisible();
});
