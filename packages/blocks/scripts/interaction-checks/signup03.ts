// Real-browser interaction checks for the signup03 block (muted background,
// 2-column password grid): password/confirm masking, minlength=8
// enforcement, native required validation, tab order across the full form
// (including the password/confirm grid), and a valid submit not reloading.
import { boot, locate, mountedPage, report, summarize, teardown } from "../interaction-harness.js";

async function main() {
  const { demoUrl } = await boot();
  const page = await mountedPage(demoUrl, "signup03");
  const block = await locate(page, "signup03");

  const name = block.locator("#signup03-name");
  const email = block.locator("#signup03-email");
  const password = block.locator("#signup03-password");
  const confirmPassword = block.locator("#signup03-confirm-password");
  const submit = block.getByRole("button", { name: "Create Account" });

  const passwordType = await password.getAttribute("type");
  const confirmType = await confirmPassword.getAttribute("type");
  report(
    "signup03: password + confirm-password fields mask input",
    passwordType === "password" && confirmType === "password",
    `password type="${passwordType}", confirm type="${confirmType}"`,
  );

  await password.fill("abc");
  const tooShort = await password.evaluate((element: HTMLInputElement) => element.validity.tooShort);
  await password.fill("longenough123");
  const validAfterFix = await password.evaluate((element: HTMLInputElement) => element.validity.valid);
  report(
    "signup03: password minlength=8 is actually enforced",
    tooShort === true && validAfterFix === true,
    `tooShort(3 chars)=${tooShort}, valid(13 chars)=${validAfterFix}`,
  );
  await password.fill("");

  await submit.click();
  const nameValid = await name.evaluate((element: HTMLInputElement) => element.validity.valid);
  const focusedAfterEmptySubmit = await page.evaluate(() => document.activeElement?.id);
  report(
    "signup03: empty submit blocked by native required validation (focus -> Full Name)",
    nameValid === false && focusedAfterEmptySubmit === "signup03-name",
    `name.validity.valid=${nameValid}, focused="${focusedAfterEmptySubmit}"`,
  );

  // Tab through the whole form, including the 2-column password/confirm grid
  // (visually side-by-side, but must still tab in reading order: password
  // then confirm, not jump around the grid).
  await name.click();
  await name.fill("Jane Doe");
  await page.keyboard.press("Tab");
  const afterName = await page.evaluate(() => document.activeElement?.id);
  await email.fill("jane@example.com");
  await page.keyboard.press("Tab");
  const afterEmail = await page.evaluate(() => document.activeElement?.id);
  await password.fill("longenough123");
  await page.keyboard.press("Tab");
  const afterPassword = await page.evaluate(() => document.activeElement?.id);
  report(
    "signup03: tab order is name -> email -> password -> confirm-password",
    afterName === "signup03-email" &&
      afterEmail === "signup03-password" &&
      afterPassword === "signup03-confirm-password",
    `afterName="${afterName}", afterEmail="${afterEmail}", afterPassword="${afterPassword}"`,
  );

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
    "signup03: valid submit is intercepted by JS (no page reload)",
    markerSurvived,
    `marker survived=${markerSurvived}`,
  );

  await page.close();
  await teardown();
  summarize();
}

main();
