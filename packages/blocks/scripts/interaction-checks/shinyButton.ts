// Real-browser interaction check for `shinyButton`: an ambient/looping
// diagonal sheen sweep with no default `onClick` (default demo props — see
// src/magicui/community/shinyButton.ts). Verify it's a real, focusable
// <button> and that its own `background-position` keyframe animation is
// actually running.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "shinyButton");
  const locator = await locate(page, "shinyButton");
  const button = locator.locator("button");

  const tagAndType = await button.evaluate((element) => ({
    tag: element.tagName,
    type: (element as HTMLButtonElement).type,
  }));
  report(
    "shinyButton: renders a real <button type=button>",
    tagAndType.tag === "BUTTON" && tagAndType.type === "button",
    `tag=${tagAndType.tag} type=${tagAndType.type}`,
  );

  await page.keyboard.press("Tab");
  const isFocused = await button.evaluate((element) => element === document.activeElement);
  report("shinyButton: is reachable via Tab (a real focusable control)", isFocused, `activeElement matches=${isFocused}`);

  const animation = await button.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { name: computed.animationName, duration: computed.animationDuration, playState: computed.animationPlayState };
  });
  const running = animation.name !== "none" && animation.duration !== "0s" && animation.playState === "running";
  report(
    "shinyButton: the diagonal-sheen background-position keyframe animation is actually running",
    running,
    `animationName=${animation.name} duration=${animation.duration} playState=${animation.playState}`,
  );

  const first = await button.evaluate((element) => getComputedStyle(element).backgroundPosition);
  await page.waitForTimeout(700);
  const second = await button.evaluate((element) => getComputedStyle(element).backgroundPosition);
  report(
    "shinyButton: backgroundPosition actually sweeps over time (not frozen)",
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
