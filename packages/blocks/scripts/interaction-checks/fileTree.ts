// Real browser interaction checks for fileTree (src/magicui/community/fileTree.ts).
//
// Clicks a collapsed folder row and asserts its children actually reveal
// (real layout height, not just an attribute flip — the reveal is a CSS
// grid 0fr->1fr track), then clicks a file row and asserts the
// aria-selected state actually moves off the previously selected file.
import {
  boot,
  locate,
  mountedPage,
  report,
  summarize,
  teardown,
} from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "fileTree");
  await locate(page, "fileTree");

  const wrapper = page.locator('[data-block="fileTree"]');
  // Demo data: "src" starts expanded, "src/components" starts collapsed.
  const componentsFolderRow = wrapper.locator('[role="treeitem"]', {
    hasText: "components",
  });
  const componentsChildrenGroup = componentsFolderRow.locator(
    "xpath=following-sibling::div[@role='group'][1]",
  );

  const heightBeforeExpand = await componentsChildrenGroup.evaluate(
    (el) => (el as HTMLElement).getBoundingClientRect().height,
  );
  const ariaExpandedBefore =
    await componentsFolderRow.getAttribute("aria-expanded");

  await componentsFolderRow.click();
  await page.waitForTimeout(300); // grid-template-rows transition (200ms) + margin

  const heightAfterExpand = await componentsChildrenGroup.evaluate(
    (el) => (el as HTMLElement).getBoundingClientRect().height,
  );
  const ariaExpandedAfter =
    await componentsFolderRow.getAttribute("aria-expanded");
  const buttonRowVisible = await wrapper
    .locator('[role="treeitem"]', { hasText: "Button.tsx" })
    .isVisible();

  report(
    "fileTree: clicking a collapsed folder reveals its children (real layout height)",
    ariaExpandedBefore === "false" &&
      ariaExpandedAfter === "true" &&
      heightBeforeExpand === 0 &&
      heightAfterExpand > 0 &&
      buttonRowVisible,
    `aria-expanded ${ariaExpandedBefore}->${ariaExpandedAfter}, children height ${heightBeforeExpand}->${heightAfterExpand}, Button.tsx visible=${buttonRowVisible}`,
  );

  // Demo data starts with "index.ts" selected; select "app.ts" instead and
  // assert the highlight actually moves between the two file rows.
  const indexFileRow = wrapper.locator('[role="treeitem"]', {
    hasText: "index.ts",
  });
  const appFileRow = wrapper.locator('[role="treeitem"]', {
    hasText: "app.ts",
  });

  const [indexSelectedBefore, appSelectedBefore] = await Promise.all([
    indexFileRow.getAttribute("aria-selected"),
    appFileRow.getAttribute("aria-selected"),
  ]);

  await appFileRow.click();
  await page.waitForTimeout(100);

  const [indexSelectedAfter, appSelectedAfter] = await Promise.all([
    indexFileRow.getAttribute("aria-selected"),
    appFileRow.getAttribute("aria-selected"),
  ]);

  report(
    "fileTree: clicking a file row moves the selected-state highlight to it",
    indexSelectedBefore === "true" &&
      appSelectedBefore === "false" &&
      indexSelectedAfter === "false" &&
      appSelectedAfter === "true",
    `index.ts aria-selected ${indexSelectedBefore}->${indexSelectedAfter}, app.ts aria-selected ${appSelectedBefore}->${appSelectedAfter}`,
  );

  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
