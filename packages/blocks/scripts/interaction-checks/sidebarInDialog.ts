// Real browser interaction checks for sidebarInDialog: the "Open settings"
// trigger must actually open a real modal <dialog> (visible, focus moved
// inside), and Escape must actually close it again.
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
    const page = await mountedPage(demoUrl, "sidebarInDialog");
    const block = await locate(page, "sidebarInDialog");

    const dialogElement = block.locator("dialog");
    const openBefore = await dialogElement.evaluate(
      (node) => (node as HTMLDialogElement).open,
    );
    const visibleBefore = await dialogElement.isVisible();

    await block.locator("button", { hasText: "Open settings" }).click();
    await page.waitForTimeout(250);

    const openAfter = await dialogElement.evaluate(
      (node) => (node as HTMLDialogElement).open,
    );
    const visibleAfter = await dialogElement.isVisible();
    const focusInsideDialog = await page.evaluate(() => {
      const dlg = document.querySelector("dialog");
      return !!dlg && dlg.contains(document.activeElement);
    });
    report(
      "sidebarInDialog: 'Open settings' trigger opens a real, focused modal dialog",
      openBefore === false &&
        !visibleBefore &&
        openAfter === true &&
        visibleAfter &&
        focusInsideDialog,
      `open ${openBefore}->${openAfter}, visible ${visibleBefore}->${visibleAfter}, focusInside=${focusInsideDialog}`,
    );

    // Selecting a category should swap the visible content pane too (real
    // local-state interaction inside the dialog, not just the open/close mechanic).
    const categoryButton = dialogElement.locator("button", {
      hasText: "Appearance",
    });
    await categoryButton.click();
    await page.waitForTimeout(100);
    const currentCrumb = await dialogElement
      .locator('[aria-current="page"]')
      .innerText();
    report(
      "sidebarInDialog: selecting a category updates the active breadcrumb/content",
      currentCrumb === "Appearance",
      `active breadcrumb label="${currentCrumb}"`,
    );

    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    const openAfterEscape = await dialogElement.evaluate(
      (node) => (node as HTMLDialogElement).open,
    );
    const visibleAfterEscape = await dialogElement.isVisible();
    report(
      "sidebarInDialog: Escape closes the dialog",
      openAfterEscape === false && !visibleAfterEscape,
      `open after escape=${openAfterEscape}, visible=${visibleAfterEscape}`,
    );
  } finally {
    await teardown();
  }
  summarize();
}

main();
