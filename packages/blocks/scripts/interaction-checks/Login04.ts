// Real-browser interaction checks for the Login04 block (two-column card
// frame, three OAuth providers): password masking, native required
// validation, tab order through the forgot-password link, and that a valid
// submit doesn't reload.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "Login04");
  const block = await locate(page, "Login04");

  const email = block.locator("#login04-email");
  const password = block.locator("#login04-password");
  const submit = block.getByRole("button", { name: "Login", exact: true });

  const passwordType = await password.getAttribute("type");
  report("Login04: password field masks input", passwordType === "password", `type="${passwordType}"`);

  await submit.click();
  const emailValid = await email.evaluate((element: HTMLInputElement) => element.validity.valid);
  const focusedAfterEmptySubmit = await page.evaluate(() => document.activeElement?.id);
  report(
    "Login04: empty submit blocked by native required validation",
    emailValid === false && focusedAfterEmptySubmit === "login04-email",
    `email.validity.valid=${emailValid}, focused="${focusedAfterEmptySubmit}"`,
  );

  await email.click();
  await email.fill("user@example.com");
  await page.keyboard.press("Tab");
  const forgotLinkFocus = await page.evaluate(() => {
    const element = document.activeElement as HTMLAnchorElement | null;
    return { tag: element?.tagName, href: element?.getAttribute("href"), text: element?.textContent };
  });
  await page.keyboard.press("Tab");
  const focusedAfterSecondTab = await page.evaluate(() => document.activeElement?.id);
  report(
    "Login04: tab order is email -> forgot-password link (real href) -> password",
    forgotLinkFocus.tag === "A" &&
      forgotLinkFocus.text === "Forgot your password?" &&
      !!forgotLinkFocus.href &&
      focusedAfterSecondTab === "login04-password",
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
    "Login04: valid submit is intercepted by JS (no page reload)",
    markerSurvived,
    `marker survived=${markerSurvived}`,
  );

  // Three OAuth buttons are icon-only (no visible label) — their accessible
  // name must come entirely from aria-label, and they must not participate in
  // form's native required-field validation (type="button", not "submit").
  const appleButton = block.getByRole("button", { name: "Login with Apple" });
  report(
    "Login04: icon-only OAuth button has a real accessible name and won't submit the form",
    (await appleButton.getAttribute("type")) === "button",
    `type="${await appleButton.getAttribute("type")}"`,
  );

  await page.close();
  await teardown();
  summarize();
}

main();
