import { expect, test } from "@playwright/test";
import { mountBlock, openDemo } from "./helpers";

test("Login01: password is masked and empty submit hits native required", async ({
  page,
}) => {
  await openDemo(page);
  await mountBlock(page, "Login01");
  const block = page.locator('[data-block="Login01"]');

  const email = block.locator("#login01-email");
  const password = block.locator("#login01-password");
  const submit = block.getByRole("button", { name: "Login", exact: true });

  await expect(password).toHaveAttribute("type", "password");
  await submit.click();
  await expect(email).toHaveJSProperty("validity.valid", false);
  await expect(email).toBeFocused();
});
