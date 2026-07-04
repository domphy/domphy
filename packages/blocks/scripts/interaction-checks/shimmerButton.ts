// Real-browser interaction check for `shimmerButton`: an ambient/looping
// border highlight with no default `onClick` (default demo props — see
// src/magicui/buttons/shimmerButton.ts). Verify it's a real, focusable
// <button> and that the rotating-sliver layer's `rotate()` keyframe animation
// is actually running (the button itself has no `animation`, only its first
// child span does).
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "shimmerButton");
  const locator = await locate(page, "shimmerButton");
  const button = locator.locator("button");
  // Component's first child is the rotating conic-gradient sliver — the
  // element that actually carries the `animation` declaration.
  const sliver = locator.locator("button > span").first();

  const tagAndType = await button.evaluate((element) => ({
    tag: element.tagName,
    type: (element as HTMLButtonElement).type,
  }));
  report(
    "shimmerButton: renders a real <button type=button>",
    tagAndType.tag === "BUTTON" && tagAndType.type === "button",
    `tag=${tagAndType.tag} type=${tagAndType.type}`,
  );

  await page.keyboard.press("Tab");
  const isFocused = await button.evaluate((element) => element === document.activeElement);
  report("shimmerButton: is reachable via Tab (a real focusable control)", isFocused, `activeElement matches=${isFocused}`);

  const animation = await sliver.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { name: computed.animationName, duration: computed.animationDuration, playState: computed.animationPlayState };
  });
  const running = animation.name !== "none" && animation.duration !== "0s" && animation.playState === "running";
  report(
    "shimmerButton: the border-highlight rotate() keyframe animation is actually running",
    running,
    `animationName=${animation.name} duration=${animation.duration} playState=${animation.playState}`,
  );

  const first = await sliver.evaluate((element) => getComputedStyle(element).transform);
  await page.waitForTimeout(500);
  const second = await sliver.evaluate((element) => getComputedStyle(element).transform);
  report(
    "shimmerButton: the sliver's rotation transform actually changes over time (not frozen)",
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
