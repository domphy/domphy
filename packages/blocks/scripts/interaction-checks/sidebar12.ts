// Real browser interaction checks for sidebar12 (scheduling sidebar: month
// date-picker + grouped checkbox calendar lists): toggling a calendar entry's
// checkbox, navigating months, and selecting a day must all actually update
// state (not just render inertly).
import {
  boot,
  locate,
  mountedPage,
  report,
  summarize,
  teardown,
} from "../interaction-harness.js";

async function main(): Promise<void> {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "sidebar12");
    const block = await locate(page, "sidebar12");

    // Default reference date is October 15, 2024 — header + picker both show "October 2024".
    const monthLabel = block.locator("header strong").first();
    const monthBefore = await monthLabel.innerText();
    await block.locator('button[aria-label="Next period"]').click();
    await page.waitForTimeout(150);
    const monthAfter = await monthLabel.innerText();
    report(
      "sidebar12: clicking next-period arrow changes the displayed month label",
      monthBefore === "October 2024" && monthAfter === "November 2024",
      `month before="${monthBefore}" after="${monthAfter}"`,
    );

    await block.locator('button[aria-label="Previous period"]').click();
    await block.locator('button[aria-label="Previous period"]').click();
    await page.waitForTimeout(150);
    const monthAfterPrev = await monthLabel.innerText();
    report(
      "sidebar12: clicking previous-period arrow changes the displayed month label",
      monthAfterPrev === "September 2024",
      `month after two prev clicks="${monthAfterPrev}"`,
    );

    // Reset to October and select a day cell in the always-visible mini picker.
    await block.locator("button", { hasText: "Today" }).click();
    await page.waitForTimeout(150);
    const dayCell = block
      .locator("button[aria-selected]", { hasText: /^20$/ })
      .first();
    const selectedBefore = await dayCell.getAttribute("aria-selected");
    await dayCell.click();
    await page.waitForTimeout(150);
    const selectedAfter = await dayCell.getAttribute("aria-selected");
    const fifteenCell = block.locator("button", { hasText: /^15$/ }).first();
    const fifteenAfter = await fifteenCell.getAttribute("aria-selected");
    report(
      "sidebar12: clicking a day cell moves the selected-day state",
      selectedBefore === "false" &&
        selectedAfter === "true" &&
        fifteenAfter === "false",
      `day 20: ${selectedBefore}->${selectedAfter}; day 15 after=${fifteenAfter}`,
    );

    // Calendar-entry checkbox toggle (first group starts expanded by default).
    const personalCheckbox = block.locator(
      'label:has-text("Personal") input[type="checkbox"]',
    );
    const checkedBefore = await personalCheckbox.isChecked();
    await personalCheckbox.click();
    await page.waitForTimeout(100);
    const checkedAfter = await personalCheckbox.isChecked();
    report(
      "sidebar12: clicking a calendar-entry checkbox toggles it",
      checkedBefore === true && checkedAfter === false,
      `checked before=${checkedBefore} after=${checkedAfter}`,
    );
  } finally {
    await teardown();
  }
  summarize();
}

main();
