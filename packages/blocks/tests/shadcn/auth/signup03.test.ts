// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import { signup03 } from "../../../src/shadcn/auth/signup03.ts";

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

describe("signup03", () => {
  it("renders a working demo tree with zero args: muted page, logo, four fields, no social button", () => {
    const { host } = render(signup03() as DomphyElement);
    expect(host.querySelector("h2")?.textContent).toBe("Create your account");
    expect(host.querySelectorAll("form input").length).toBe(4);
    expect(host.querySelectorAll("form button").length).toBe(1);
    expect(host.querySelector("form button")?.getAttribute("type")).toBe(
      "submit",
    );
  });

  it("lays out password and confirm-password side by side in a two-column grid", () => {
    const { host } = render(signup03() as DomphyElement);
    const passwordInput = host.querySelector('input[type="password"]');
    const grid = passwordInput?.closest("div")?.parentElement?.parentElement;
    expect(grid).toBeTruthy();
    expect(grid?.querySelectorAll('input[type="password"]').length).toBe(2);
  });

  it("renders the legal links with the provided hrefs", () => {
    const { host } = render(
      signup03({
        termsHref: "/terms",
        privacyHref: "/privacy",
      }) as DomphyElement,
    );
    const links = Array.from(
      host.querySelectorAll("small a"),
    ) as HTMLAnchorElement[];
    const legalLinks = links.filter(
      (a) =>
        a.getAttribute("href") === "/terms" ||
        a.getAttribute("href") === "/privacy",
    );
    expect(legalLinks.length).toBe(2);
  });

  it("preventDefault()s the native submit and invokes onSubmit", () => {
    let called = false;
    const { host } = render(
      signup03({ onSubmit: () => (called = true) }) as DomphyElement,
    );
    const form = host.querySelector("form")!;
    const event = new Event("submit", { cancelable: true, bubbles: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(called).toBe(true);
  });
});
