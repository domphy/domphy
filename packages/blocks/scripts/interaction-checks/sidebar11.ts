// Real browser interaction checks for sidebar11 (IDE-style file tree):
// clicking a folder must expand and reveal its children, and clicking a file
// must select/highlight it (aria-current) and update the header breadcrumb.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main(): Promise<void> {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, "sidebar11");
    const block = await locate(page, "sidebar11");

    // "lib" starts collapsed (only ancestors of the default active file,
    // components/ui/button.tsx, start open) — expand it and check its child appears.
    const libDetails = block.locator('details:has(summary:has-text("lib"))');
    const beforeOpen = await libDetails.getAttribute("open");
    const childVisibleBefore = await libDetails.locator("button", { hasText: "utils.ts" }).isVisible();
    await libDetails.locator("summary").click();
    await page.waitForTimeout(150);
    const afterOpen = await libDetails.getAttribute("open");
    const childVisibleAfter = await libDetails.locator("button", { hasText: "utils.ts" }).isVisible();
    report(
      "sidebar11: clicking a folder expands and reveals its children",
      beforeOpen === null && !childVisibleBefore && afterOpen !== null && childVisibleAfter,
      `open before=${beforeOpen} after=${afterOpen}, utils.ts visible before=${childVisibleBefore} after=${childVisibleAfter}`,
    );

    // Default active file is components/ui/button.tsx — its row should carry
    // aria-current=true, and clicking a different file (card.tsx) should move it.
    // Locate by text only (not `[aria-current]`) — once the active file moves
    // away, the attribute is removed entirely, and an attribute-qualified
    // selector would then match zero elements and hang waiting for one.
    const buttonFileRow = block.locator("button", { hasText: "button.tsx" });
    const cardFileRow = block.locator("button", { hasText: "card.tsx" });
    const buttonCurrentBefore = await buttonFileRow.getAttribute("aria-current");
    const cardCurrentBefore = await cardFileRow.getAttribute("aria-current");
    await cardFileRow.click();
    await page.waitForTimeout(150);
    const buttonCurrentAfter = await buttonFileRow.getAttribute("aria-current");
    const cardCurrentAfter = await cardFileRow.getAttribute("aria-current");
    report(
      "sidebar11: clicking a file moves the active/selected state",
      buttonCurrentBefore === "true" &&
        cardCurrentBefore === null &&
        buttonCurrentAfter === null &&
        cardCurrentAfter === "true",
      `button.tsx: ${buttonCurrentBefore}->${buttonCurrentAfter}, card.tsx: ${cardCurrentBefore}->${cardCurrentAfter}`,
    );

    // The header breadcrumb is derived from the active file path — it should
    // now read the new path's segments instead of the old one.
    const breadcrumbText = await block.locator("header nav").innerText();
    report(
      "sidebar11: selecting a file updates the header breadcrumb",
      breadcrumbText.includes("card.tsx") && !breadcrumbText.includes("button.tsx"),
      `breadcrumb text: ${breadcrumbText.replace(/\s+/g, " ")}`,
    );
  } finally {
    await teardown();
  }
  summarize();
}

main();
