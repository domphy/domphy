// Real-browser interaction checks for the signup04 block (no Full Name
// field, icon-only social-provider row): password/confirm masking, minlength
// enforcement, native required validation (focus lands on Email first, since
// there is no name field), a valid submit not reloading, and the icon-only
// OAuth buttons still being real accessible, non-submitting buttons.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "signup04");
  const block = await locate(page, "signup04");

  const email = block.locator("#signup04-email");
  const password = block.locator("#signup04-password");
  const confirmPassword = block.locator("#signup04-confirm-password");
  const submit = block.getByRole("button", { name: "Create Account" });

  const passwordType = await password.getAttribute("type");
  const confirmType = await confirmPassword.getAttribute("type");
  report(
    "signup04: password + confirm-password fields mask input",
    passwordType === "password" && confirmType === "password",
    `password type="${passwordType}", confirm type="${confirmType}"`,
  );

  await password.fill("abc");
  const tooShort = await password.evaluate((element: HTMLInputElement) => element.validity.tooShort);
  await password.fill("longenough123");
  const validAfterFix = await password.evaluate((element: HTMLInputElement) => element.validity.valid);
  report(
    "signup04: password minlength=8 is actually enforced",
    tooShort === true && validAfterFix === true,
    `tooShort(3 chars)=${tooShort}, valid(13 chars)=${validAfterFix}`,
  );
  await password.fill("");

  await submit.click();
  const emailValid = await email.evaluate((element: HTMLInputElement) => element.validity.valid);
  const focusedAfterEmptySubmit = await page.evaluate(() => document.activeElement?.id);
  report(
    "signup04: empty submit blocked by native required validation (focus -> Email, no Full Name field)",
    emailValid === false && focusedAfterEmptySubmit === "signup04-email",
    `email.validity.valid=${emailValid}, focused="${focusedAfterEmptySubmit}"`,
  );

  await email.fill("jane@example.com");
  await password.fill("longenough123");
  await confirmPassword.fill("longenough123");
  await page.evaluate(() => {
    (window as unknown as { __marker: boolean }).__marker = true;
  });
  await submit.click();
  await page.waitForTimeout(200);
  const markerSurvived = await page.evaluate(
    () => (window as unknown as { __marker?: boolean }).__marker === true,
  );
  report(
    "signup04: valid submit is intercepted by JS (no page reload)",
    markerSurvived,
    `marker survived=${markerSurvived}`,
  );

  // Provider buttons render icon-only (no visible label text) — their
  // accessible name comes entirely from aria-label, and they must be
  // type="button" so clicking them never triggers the form's own submit.
  const appleProvider = block.getByRole("button", { name: "Sign up with Apple" });
  const providerType = await appleProvider.getAttribute("type");
  const providerHTML = await appleProvider.innerHTML();
  report(
    "signup04: icon-only provider button has a real accessible name and won't submit the form",
    providerType === "button" && !providerHTML.includes("Apple"),
    `type="${providerType}", has no visible "Apple" text (icon-only)=${!providerHTML.includes("Apple")}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main();
