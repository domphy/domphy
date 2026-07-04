// Real browser interaction checks for fileUpload (src/aceternity/inputs/fileUpload.ts).
//
// Drives the hidden native `<input type="file">` via Playwright's real file
// chooser API (setInputFiles), and separately dispatches real `DragEvent`s
// (dragenter/dragover/drop) with a synthetic `DataTransfer` at the drop-zone,
// asserting the rendered file rows actually reflect both paths.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "fileUpload");
  await locate(page, "fileUpload");

  const fileInput = page.locator('[data-block="fileUpload"] input[type="file"]');
  await fileInput.setInputFiles({
    name: "report.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("fake pdf contents"),
  });
  await page.waitForTimeout(150);

  const rowsAfterPicker = await page.locator('[data-block="fileUpload"] >> text=report.pdf').count();
  report(
    "fileUpload: click-to-browse via hidden file input",
    rowsAfterPicker > 0,
    rowsAfterPicker > 0 ? "file row shows 'report.pdf' after setInputFiles" : "no row rendered for the selected file",
  );

  const sizeRowText = await page.locator('[data-block="fileUpload"] small', { hasText: "B ·" }).first().textContent().catch(() => null);
  report(
    "fileUpload: file row shows formatted size + MIME type",
    !!sizeRowText && sizeRowText.includes("application/pdf"),
    `size/type row: ${JSON.stringify(sizeRowText)}`,
  );

  // Real drag-and-drop: dispatch actual DragEvents with a synthetic
  // DataTransfer carrying a File, on the dropzone's own DOM element.
  const dropResult = await page.evaluate(async () => {
    const dropZone = document.querySelector('[data-block="fileUpload"] [role="button"]') as HTMLElement | null;
    if (!dropZone) return { ok: false, reason: "no dropzone found" };

    const file = new File(["image bytes"], "photo.png", { type: "image/png" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const outlineBefore = getComputedStyle(dropZone).outlineColor;
    dropZone.dispatchEvent(new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer }));
    await new Promise((resolve) => setTimeout(resolve, 200));
    const outlineDuringDrag = getComputedStyle(dropZone).outlineColor;
    dropZone.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer }));
    dropZone.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer }));

    return { ok: true, outlineBefore, outlineDuringDrag };
  });

  report(
    "fileUpload: dragenter flips drop-zone to its active/hover outline color",
    dropResult.ok && dropResult.outlineDuringDrag !== dropResult.outlineBefore,
    `outline before=${dropResult.outlineBefore} during=${dropResult.outlineDuringDrag}`,
  );

  await page.waitForTimeout(150);
  const rowsAfterDrop = await page.locator('[data-block="fileUpload"] >> text=photo.png').count();
  report(
    "fileUpload: real DragEvent drop adds the dropped file's row",
    rowsAfterDrop > 0,
    rowsAfterDrop > 0 ? "file row shows 'photo.png' after dispatched drop" : "no row rendered for the dropped file",
  );

  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
