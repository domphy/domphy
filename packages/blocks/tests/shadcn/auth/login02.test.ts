// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { Login02 } from "../../../src/shadcn/auth/login02.ts";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Login02", () => {
  it("renders a working demo tree with zero args: split grid, form column, cover image column", () => {
    const { host } = render(Login02() as DomphyElement);
    expect(host.querySelector("form")).toBeTruthy();
    expect(host.querySelector('input[name="email"][type="email"]')).toBeTruthy();
    expect(host.querySelector('input[name="password"][type="password"]')).toBeTruthy();
    expect(host.querySelector("img")).toBeTruthy();
  });

  it("renders the brand row, GitHub OAuth button and sign-up footer line", () => {
    const { host } = render(Login02() as DomphyElement);
    expect(host.textContent).toContain("Acme Inc.");
    expect(host.textContent).toContain("Login with GitHub");
    expect(host.textContent).toContain("Sign up");
  });

  it("submitting the form calls onSubmit with the entered email/password", () => {
    const values: { email: string; password: string }[] = [];
    const { host } = render(
      Login02({ onSubmit: (v) => values.push(v) }) as DomphyElement,
    );
    const form = host.querySelector("form") as HTMLFormElement;
    const email = host.querySelector('input[name="email"]') as HTMLInputElement;
    const password = host.querySelector('input[name="password"]') as HTMLInputElement;
    email.value = "user@example.com";
    password.value = "secret";
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    expect(values).toEqual([{ email: "user@example.com", password: "secret" }]);
  });

  it("accepts a custom cover image source/alt", () => {
    const { host } = render(
      Login02({ coverImageSrc: "https://example.com/photo.jpg", coverImageAlt: "Office" }) as DomphyElement,
    );
    const img = host.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("https://example.com/photo.jpg");
    expect(img.getAttribute("alt")).toBe("Office");
  });
});
