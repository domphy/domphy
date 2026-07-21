// Real-browser interaction checks for the signup01 block: password/confirm
// masking, minlength=8 enforcement on the password field, native required
// validation, a valid submit not reloading the page, and the default
// (non-loading) reactive button state.
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
  const page = await mountedPage(demoUrl, "signup01");
  const block = await locate(page, "signup01");

  const name = block.locator("#signup01-name");
  const email = block.locator("#signup01-email");
  const password = block.locator("#signup01-password");
  const confirmPassword = block.locator("#signup01-confirm-password");
  const submit = block.getByRole("button", { name: "Create Account" });

  const passwordType = await password.getAttribute("type");
  const confirmType = await confirmPassword.getAttribute("type");
  report(
    "signup01: password + confirm-password fields mask input",
    passwordType === "password" && confirmType === "password",
    `password type="${passwordType}", confirm type="${confirmType}"`,
  );

  await password.fill("abc");
  const tooShort = await password.evaluate(
    (element: HTMLInputElement) => element.validity.tooShort,
  );
  await password.fill("longenough123");
  const validAfterFix = await password.evaluate(
    (element: HTMLInputElement) => element.validity.valid,
  );
  report(
    "signup01: password minlength=8 is actually enforced",
    tooShort === true && validAfterFix === true,
    `tooShort(3 chars)=${tooShort}, valid(13 chars)=${validAfterFix}`,
  );
  await password.fill("");

  await submit.click();
  const nameValid = await name.evaluate(
    (element: HTMLInputElement) => element.validity.valid,
  );
  const focusedAfterEmptySubmit = await page.evaluate(
    () => document.activeElement?.id,
  );
  report(
    "signup01: empty submit blocked by native required validation (focus -> Full Name)",
    nameValid === false && focusedAfterEmptySubmit === "signup01-name",
    `name.validity.valid=${nameValid}, focused="${focusedAfterEmptySubmit}"`,
  );

  // Default (zero-arg) render: loading=false must leave the submit button
  // enabled and not aria-busy — this is the reactive `loading` prop's
  // resting state, wired via toState().
  const disabledAttr = await submit.getAttribute("disabled");
  const ariaBusy = await submit.getAttribute("aria-busy");
  report(
    "signup01: default render is not stuck in the loading state",
    disabledAttr === null && ariaBusy === "false",
    `disabled=${disabledAttr === null ? "absent" : disabledAttr}, aria-busy="${ariaBusy}"`,
  );

  await name.fill("Jane Doe");
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
    "signup01: valid submit is intercepted by JS (no page reload)",
    markerSurvived,
    `marker survived=${markerSurvived}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main();
