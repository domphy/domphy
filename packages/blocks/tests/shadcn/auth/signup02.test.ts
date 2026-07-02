// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { signup02 } from "../../../src/shadcn/auth/signup02.ts";

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

describe("signup02", () => {
  it("renders a working demo tree with zero args: two-column grid, logo, form, cover image", () => {
    const { host } = render(signup02() as DomphyElement);
    expect(host.querySelector("h2")?.textContent).toBe("Create your account");
    expect(host.querySelectorAll("form input").length).toBe(4);
    expect(host.querySelector("img")).toBeTruthy();
    expect(host.querySelector("a strong")?.textContent).toBe("Acme Inc.");
  });

  it("renders the GitHub button by default and hides it when disabled", () => {
    const { host: withGithub } = render(signup02() as DomphyElement);
    expect(
      Array.from(withGithub.querySelectorAll("form button")).some((el) =>
        el.textContent?.includes("Sign up with GitHub"),
      ),
    ).toBe(true);

    document.body.innerHTML = "";
    const { host: withoutGithub } = render(
      signup02({ showGithubButton: false }) as DomphyElement,
    );
    expect(
      Array.from(withoutGithub.querySelectorAll("form button")).some((el) =>
        el.textContent?.includes("GitHub"),
      ),
    ).toBe(false);
  });

  it("uses the provided cover image source", () => {
    const { host } = render(
      signup02({ coverImageSrc: "/cover.jpg" }) as DomphyElement,
    );
    expect(host.querySelector("img")?.getAttribute("src")).toBe("/cover.jpg");
  });

  it("preventDefault()s the native submit and invokes onSubmit", () => {
    let called = false;
    const { host } = render(
      signup02({ onSubmit: () => (called = true) }) as DomphyElement,
    );
    const form = host.querySelector("form")!;
    const event = new Event("submit", { cancelable: true, bubbles: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(called).toBe(true);
  });
});
