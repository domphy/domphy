// Real-browser interaction check for `pulsatingButton`: an ambient/looping
// glow pulse with no default `onClick` (default demo props — see
// src/magicui/community/pulsatingButton.ts). Verify it's a real, focusable
// <button> and that the glow layer's `box-shadow` keyframe animation is
// actually running (the animation lives on the button's first child span,
// not the button itself).
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "pulsatingButton");
  const locator = await locate(page, "pulsatingButton");
  const button = locator.locator("button");
  const glowLayer = locator.locator("button > span").first();

  const tagAndType = await button.evaluate((element) => ({
    tag: element.tagName,
    type: (element as HTMLButtonElement).type,
  }));
  report(
    "pulsatingButton: renders a real <button type=button>",
    tagAndType.tag === "BUTTON" && tagAndType.type === "button",
    `tag=${tagAndType.tag} type=${tagAndType.type}`,
  );

  await page.keyboard.press("Tab");
  const isFocused = await button.evaluate((element) => element === document.activeElement);
  report("pulsatingButton: is reachable via Tab (a real focusable control)", isFocused, `activeElement matches=${isFocused}`);

  const animation = await glowLayer.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { name: computed.animationName, duration: computed.animationDuration, playState: computed.animationPlayState };
  });
  const running = animation.name !== "none" && animation.duration !== "0s" && animation.playState === "running";
  report(
    "pulsatingButton: the glow layer's box-shadow pulse keyframe animation is actually running",
    running,
    `animationName=${animation.name} duration=${animation.duration} playState=${animation.playState}`,
  );

  const first = await glowLayer.evaluate((element) => getComputedStyle(element).boxShadow);
  await page.waitForTimeout(800);
  const second = await glowLayer.evaluate((element) => getComputedStyle(element).boxShadow);
  report(
    "pulsatingButton: the glow's boxShadow spread actually changes over time (not frozen)",
    first !== second,
    `first=${first} second=${second}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
