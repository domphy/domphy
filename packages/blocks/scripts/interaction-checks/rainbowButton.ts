// Real-browser interaction check for `rainbowButton`: an ambient/looping
// gradient sweep with no default `onClick` (default demo props — see
// src/magicui/buttons/rainbowButton.ts). Verify it's a real, focusable
// <button> and that its background-position animation is actually running,
// not a static frame.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "rainbowButton");
  const locator = await locate(page, "rainbowButton");
  const button = locator.locator("button");

  const tagAndFocus = await button.evaluate((element) => {
    element.blur();
    return { tag: element.tagName, type: (element as HTMLButtonElement).type };
  });
  report(
    "rainbowButton: renders a real <button type=button>",
    tagAndFocus.tag === "BUTTON" && tagAndFocus.type === "button",
    `tag=${tagAndFocus.tag} type=${tagAndFocus.type}`,
  );

  // Tab to it from the top of the page and confirm it's the focused element —
  // a real interactive control, not a decorative div masquerading as one.
  await page.keyboard.press("Tab");
  const isFocused = await button.evaluate((element) => element === document.activeElement);
  report("rainbowButton: is reachable via Tab (a real focusable control)", isFocused, `activeElement matches=${isFocused}`);

  const animation = await button.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { name: computed.animationName, duration: computed.animationDuration, playState: computed.animationPlayState };
  });
  const running = animation.name !== "none" && animation.duration !== "0s" && animation.playState === "running";
  report(
    "rainbowButton: the gradient-pan keyframe animation is actually running (not a static frame)",
    running,
    `animationName=${animation.name} duration=${animation.duration} playState=${animation.playState}`,
  );

  // Sample backgroundPosition twice with a delay — if the animation is really
  // running, the panned position should differ between samples.
  const first = await button.evaluate((element) => getComputedStyle(element).backgroundPosition);
  await page.waitForTimeout(500);
  const second = await button.evaluate((element) => getComputedStyle(element).backgroundPosition);
  report(
    "rainbowButton: backgroundPosition actually changes over time (not frozen)",
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
