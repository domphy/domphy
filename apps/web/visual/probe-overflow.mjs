import { chromium } from "@playwright/test";

// Probe the worst horizontal-overflow contributors for solo-mounted blocks
// against the already-running standalone catalog (:4179). Reports elements
// whose MARGIN edge exceeds the viewport, plus chains whose scrollWidth
// outgrows their clientWidth (cases the spec's rect-only finder misses).
const blocks = process.argv[2].split(",");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 375, height: 667 });

for (const block of blocks) {
  await page.goto(`http://127.0.0.1:4179/?catalog=blocks&only=${block}&fit=1`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector("[data-visual-ready='1']", { timeout: 60_000 });
  await page.waitForTimeout(1200);
  const report = await page.evaluate(() => {
    const doc = document.documentElement;
    const out = { docOverflow: doc.scrollWidth - doc.clientWidth, items: [] };
    if (out.docOverflow <= 1) return out;
    for (const el of document.querySelectorAll("body *")) {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const marginRight = Number.parseFloat(style.marginRight) || 0;
      const edge = rect.right + marginRight;
      const scrollSpill = el.scrollWidth - el.clientWidth;
      if (edge > doc.clientWidth + 1 || scrollSpill > 1) {
        const cls = (el.getAttribute("class") ?? "").slice(0, 40);
        out.items.push(
          `${el.tagName.toLowerCase()}.${cls} edge=${Math.round(edge)} scrollSpill=${scrollSpill} w=${Math.round(rect.width)}`,
        );
      }
      if (out.items.length >= 6) break;
    }
    return out;
  });
  console.log(`### ${block}: docOverflow=${report.docOverflow}`);
  for (const item of report.items) console.log(`   ${item}`);
}
await browser.close();
