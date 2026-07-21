// Real-browser interaction checks for the Login02 block (split-screen with
// cover photo): password masking, native required validation, tab order
// through the forgot-password link, and that a valid submit doesn't reload.
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
  const page = await mountedPage(demoUrl, "Login02");
  const block = await locate(page, "Login02");

  const email = block.locator("#login02-email");
  const password = block.locator("#login02-password");
  const submit = block.getByRole("button", { name: "Login", exact: true });

  const passwordType = await password.getAttribute("type");
  report(
    "Login02: password field masks input",
    passwordType === "password",
    `type="${passwordType}"`,
  );

  await submit.click();
  const emailValid = await email.evaluate(
    (element: HTMLInputElement) => element.validity.valid,
  );
  const focusedAfterEmptySubmit = await page.evaluate(
    () => document.activeElement?.id,
  );
  report(
    "Login02: empty submit blocked by native required validation",
    emailValid === false && focusedAfterEmptySubmit === "login02-email",
    `email.validity.valid=${emailValid}, focused="${focusedAfterEmptySubmit}"`,
  );

  await email.click();
  await email.fill("user@example.com");
  await page.keyboard.press("Tab");
  const forgotLinkFocus = await page.evaluate(() => {
    const element = document.activeElement as HTMLAnchorElement | null;
    return {
      tag: element?.tagName,
      href: element?.getAttribute("href"),
      text: element?.textContent,
    };
  });
  await page.keyboard.press("Tab");
  const focusedAfterSecondTab = await page.evaluate(
    () => document.activeElement?.id,
  );
  report(
    "Login02: tab order is email -> forgot-password link (real href) -> password",
    forgotLinkFocus.tag === "A" &&
      forgotLinkFocus.text === "Forgot your password?" &&
      !!forgotLinkFocus.href &&
      focusedAfterSecondTab === "login02-password",
    `forgotLink=${JSON.stringify(forgotLinkFocus)}, thenFocused="${focusedAfterSecondTab}"`,
  );

  await password.fill("hunter2");
  await page.evaluate(() => {
    (window as unknown as { __marker: boolean }).__marker = true;
  });
  await submit.click();
  await page.waitForTimeout(200);
  const markerSurvived = await page.evaluate(
    () => (window as unknown as { __marker?: boolean }).__marker === true,
  );
  report(
    "Login02: valid submit is intercepted by JS (no page reload)",
    markerSurvived,
    `marker survived=${markerSurvived}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main();
