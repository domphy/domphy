// Real-browser interaction checks for the signup05 block (most minimal
// variant — email only, no password field): email format validation, native
// required validation, tab order straight to the submit button, a valid
// submit not reloading, and the social-provider buttons being real,
// non-submitting, accessible buttons.
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
  const page = await mountedPage(demoUrl, "signup05");
  const block = await locate(page, "signup05");

  const email = block.locator("#signup05-email");
  const submit = block.getByRole("button", { name: "Create Account" });

  const passwordCount = await block.locator('input[type="password"]').count();
  report(
    "signup05: has no password field (email-only by design)",
    passwordCount === 0,
    `count=${passwordCount}`,
  );

  await email.fill("not-an-email");
  const typeMismatch = await email.evaluate(
    (element: HTMLInputElement) => element.validity.typeMismatch,
  );
  report(
    "signup05: malformed email is rejected by type=email format validation",
    typeMismatch === true,
    `validity.typeMismatch=${typeMismatch}`,
  );

  await email.fill("");
  await submit.click();
  const emailValid = await email.evaluate(
    (element: HTMLInputElement) => element.validity.valid,
  );
  const focusedAfterEmptySubmit = await page.evaluate(
    () => document.activeElement?.id,
  );
  report(
    "signup05: empty submit blocked by native required validation",
    emailValid === false && focusedAfterEmptySubmit === "signup05-email",
    `email.validity.valid=${emailValid}, focused="${focusedAfterEmptySubmit}"`,
  );

  await email.click();
  await email.fill("jane@example.com");
  await page.keyboard.press("Tab");
  const focusedAfterTab = await page.evaluate(() => {
    const element = document.activeElement as HTMLButtonElement | null;
    return { type: element?.getAttribute("type"), text: element?.textContent };
  });
  report(
    "signup05: tab order moves straight from email to the submit button",
    focusedAfterTab.type === "submit" &&
      focusedAfterTab.text === "Create Account",
    `focused=${JSON.stringify(focusedAfterTab)}`,
  );

  await page.evaluate(() => {
    (window as unknown as { __marker: boolean }).__marker = true;
  });
  await submit.click();
  await page.waitForTimeout(200);
  const markerSurvived = await page.evaluate(
    () => (window as unknown as { __marker?: boolean }).__marker === true,
  );
  report(
    "signup05: valid submit is intercepted by JS (no page reload)",
    markerSurvived,
    `marker survived=${markerSurvived}`,
  );

  const appleProvider = block.getByRole("button", {
    name: "Sign up with Apple",
  });
  const providerType = await appleProvider.getAttribute("type");
  report(
    "signup05: social-provider button is a real accessible, non-submitting button",
    providerType === "button",
    `type="${providerType}"`,
  );

  await page.close();
  await teardown();
  summarize();
}

main();
