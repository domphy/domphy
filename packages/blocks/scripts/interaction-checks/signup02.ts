// Real-browser interaction checks for the signup02 block (two-column, cover
// photo): password/confirm masking, minlength=8 enforcement, native required
// validation, and a valid submit not reloading the page.
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
  const page = await mountedPage(demoUrl, "signup02");
  const block = await locate(page, "signup02");

  const name = block.locator("#signup02-name");
  const email = block.locator("#signup02-email");
  const password = block.locator("#signup02-password");
  const confirmPassword = block.locator("#signup02-confirm-password");
  const submit = block.getByRole("button", { name: "Create Account" });

  const passwordType = await password.getAttribute("type");
  const confirmType = await confirmPassword.getAttribute("type");
  report(
    "signup02: password + confirm-password fields mask input",
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
    "signup02: password minlength=8 is actually enforced",
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
    "signup02: empty submit blocked by native required validation (focus -> Full Name)",
    nameValid === false && focusedAfterEmptySubmit === "signup02-name",
    `name.validity.valid=${nameValid}, focused="${focusedAfterEmptySubmit}"`,
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
    "signup02: valid submit is intercepted by JS (no page reload)",
    markerSurvived,
    `marker survived=${markerSurvived}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main();
