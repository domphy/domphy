// Real-browser interaction checks for the Login01 block: native required-field
// validation, password masking, tab order, and that a valid submit is
// actually intercepted by JS (no full-page reload).
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "Login01");
  const block = await locate(page, "Login01");

  const email = block.locator("#login01-email");
  const password = block.locator("#login01-password");
  const submit = block.getByRole("button", { name: "Login", exact: true });

  const passwordType = await password.getAttribute("type");
  report("Login01: password field masks input", passwordType === "password", `type="${passwordType}"`);

  await submit.click();
  const emailValid = await email.evaluate((element: HTMLInputElement) => element.validity.valid);
  const focusedAfterEmptySubmit = await page.evaluate(() => document.activeElement?.id);
  report(
    "Login01: empty submit blocked by native required validation",
    emailValid === false && focusedAfterEmptySubmit === "login01-email",
    `email.validity.valid=${emailValid}, focused="${focusedAfterEmptySubmit}"`,
  );

  // The "Forgot your password?" link lives in the label row directly above
  // the password input, so DOM/tab order is email -> forgot-link -> password
  // (matches upstream shadcn/ui login-01 markup, not a naive email->password jump).
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
    "Login01: tab order is email -> forgot-password link (real href) -> password",
    forgotLinkFocus.tag === "A" &&
      forgotLinkFocus.text === "Forgot your password?" &&
      !!forgotLinkFocus.href &&
      focusedAfterSecondTab === "login01-password",
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
    "Login01: valid submit is intercepted by JS (no page reload)",
    markerSurvived,
    `marker survived=${markerSurvived}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main();
