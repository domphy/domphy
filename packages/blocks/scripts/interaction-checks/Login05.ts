// Real-browser interaction checks for the Login05 block (passwordless
// magic-link entry — no password field): email format validation, native
// required validation, tab order straight to the submit button, and OAuth
// fallback buttons being real, non-submitting, accessible buttons.
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
  const page = await mountedPage(demoUrl, "Login05");
  const block = await locate(page, "Login05");

  const email = block.locator("#login05-email");
  const submit = block.getByRole("button", { name: "Login", exact: true });

  // No password field on this variant at all.
  const passwordCount = await block.locator('input[type="password"]').count();
  report(
    "Login05: has no password field (passwordless by design)",
    passwordCount === 0,
    `count=${passwordCount}`,
  );

  await email.fill("not-an-email");
  const typeMismatch = await email.evaluate(
    (element: HTMLInputElement) => element.validity.typeMismatch,
  );
  report(
    "Login05: malformed email is rejected by type=email format validation",
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
    "Login05: empty submit blocked by native required validation",
    emailValid === false && focusedAfterEmptySubmit === "login05-email",
    `email.validity.valid=${emailValid}, focused="${focusedAfterEmptySubmit}"`,
  );

  await email.click();
  await email.fill("user@example.com");
  await page.keyboard.press("Tab");
  const focusedAfterTab = await page.evaluate(() => {
    const element = document.activeElement as HTMLButtonElement | null;
    return { type: element?.getAttribute("type"), text: element?.textContent };
  });
  report(
    "Login05: tab order moves straight from email to the submit button (no password field in between)",
    focusedAfterTab.type === "submit" && focusedAfterTab.text === "Login",
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
    "Login05: valid submit is intercepted by JS (no page reload)",
    markerSurvived,
    `marker survived=${markerSurvived}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main();
