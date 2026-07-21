// Real browser check for heroVideoDialog: click the thumbnail's play button,
// assert a real <dialog> modal opens with a video iframe inside, then close
// it via Escape and assert it actually closes.
import {
  boot,
  locate,
  mountedPage,
  report,
  summarize,
  teardown,
} from "../interaction-harness.js";

const NAME = "heroVideoDialog";

async function main(): Promise<void> {
  const { demoUrl } = await boot();
  try {
    const page = await mountedPage(demoUrl, NAME);
    const block = await locate(page, NAME);

    const dialogLocator = block.locator("dialog");
    const playButton = block.locator(
      '[role="button"][aria-label^="Play video"]',
    );

    await playButton.click();
    await page.waitForTimeout(250);

    const isOpenAfterClick = await dialogLocator.evaluate(
      (el) => (el as HTMLDialogElement).open,
    );
    report(
      `${NAME}: clicking the thumbnail opens the dialog`,
      isOpenAfterClick === true,
      `dialog.open=${isOpenAfterClick}`,
    );

    const iframeSrcWhileOpen = await dialogLocator
      .locator("iframe")
      .getAttribute("src");
    report(
      `${NAME}: video iframe is populated while open`,
      iframeSrcWhileOpen === "about:blank",
      `iframe src="${iframeSrcWhileOpen}"`,
    );

    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    const isOpenAfterEscape = await dialogLocator.evaluate(
      (el) => (el as HTMLDialogElement).open,
    );
    const iframeSrcAfterClose = await dialogLocator
      .locator("iframe")
      .getAttribute("src");
    report(
      `${NAME}: Escape closes the dialog and clears the video src`,
      isOpenAfterEscape === false && iframeSrcAfterClose === "",
      `dialog.open=${isOpenAfterEscape}, iframe src="${iframeSrcAfterClose}"`,
    );

    await page.close();
  } finally {
    await teardown();
  }
}

main()
  .catch((error) => {
    console.error(error);
    report(`${NAME}: unexpected error`, false, String(error));
  })
  .finally(() => summarize());
