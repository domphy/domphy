// Real browser interaction checks for sidebar09 (email-client sidebar):
// clicking a folder in the icon rail must actually swap the message list,
// and clicking a message must actually select/highlight it (aria-selected).
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
    const page = await mountedPage(demoUrl, "sidebar09");
    const block = await locate(page, "sidebar09");

    const messageList = block.locator('ul[role="listbox"]');

    const inboxText = await messageList.innerText();
    report(
      "sidebar09: inbox is the default folder",
      inboxText.includes("William Smith") ||
        inboxText.includes("Meeting Tomorrow"),
      `inbox list text: ${inboxText.slice(0, 80)}`,
    );

    // Click the "Drafts" folder icon in the rail.
    await block.locator('button[aria-label="Drafts"]').click();
    await page.waitForTimeout(100);
    const draftsText = await messageList.innerText();
    report(
      "sidebar09: clicking Drafts swaps the message list",
      draftsText.includes("Draft: Quarterly Report") &&
        !draftsText.includes("William Smith"),
      `drafts list text: ${draftsText.slice(0, 80)}`,
    );

    // Switch back to Inbox and select a message.
    await block.locator('button[aria-label="Inbox"]').click();
    await page.waitForTimeout(100);
    const messageButton = messageList.locator('button[role="option"]').first();
    const beforeSelected = await messageButton.getAttribute("aria-selected");
    await messageButton.click();
    await page.waitForTimeout(100);
    const afterSelected = await messageButton.getAttribute("aria-selected");
    report(
      "sidebar09: clicking a message selects/highlights it",
      beforeSelected === "false" && afterSelected === "true",
      `aria-selected before=${beforeSelected} after=${afterSelected}`,
    );

    // A different message should now lose selection (single-select list).
    const secondMessage = messageList.locator('button[role="option"]').nth(1);
    await secondMessage.click();
    await page.waitForTimeout(100);
    const firstAfterSwitch = await messageButton.getAttribute("aria-selected");
    const secondSelected = await secondMessage.getAttribute("aria-selected");
    report(
      "sidebar09: selecting another message moves the highlight",
      firstAfterSwitch === "false" && secondSelected === "true",
      `first=${firstAfterSwitch} second=${secondSelected}`,
    );
  } finally {
    await teardown();
  }
  summarize();
}

main();
