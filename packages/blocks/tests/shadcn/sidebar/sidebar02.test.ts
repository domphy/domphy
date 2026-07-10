// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sidebar02 } from "../../../src/shadcn/sidebar/sidebar02.js";

// Each test renders the full aside + mobile-drawer + main tree (nav content
// is duplicated across both), which is legitimately slow under jsdom when
// many sibling sidebar test files run in the same worker pool — raise the
// per-test timeout above vitest's 5s default to avoid contention flakiness.
vi.setConfig({ testTimeout: 20000 });

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

beforeEach(() => {
  // jsdom's <dialog> support is partial in this repo's jsdom version — stub
  // showModal/close so the mobile drawer's `_onMount` (and its 350ms
  // fallback-close timer) never throws "close is not a function" (mirrors
  // packages/ui/tests/overlay.test.ts's drawer suite).
  if (!(HTMLDialogElement.prototype as any).showModal) {
    (HTMLDialogElement.prototype as any).showModal = function (
      this: HTMLDialogElement,
    ) {
      this.open = true;
    };
  }
  if (!(HTMLDialogElement.prototype as any).close) {
    (HTMLDialogElement.prototype as any).close = function (
      this: HTMLDialogElement,
    ) {
      this.open = false;
    };
  }
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("sidebar02", () => {
  it("renders a working demo with zero arguments", () => {
    const { host } = render(sidebar02());

    expect(host.querySelectorAll("aside").length).toBe(1);
    expect(host.querySelectorAll("dialog").length).toBe(1);
    expect(host.querySelectorAll("main").length).toBe(1);
  });

  it("renders each nav group as an independent <details> disclosure", () => {
    const { host } = render(sidebar02());
    const aside = host.querySelector("aside")!;
    const sections = aside.querySelectorAll("nav > ul > li > details");

    // Upstream sidebar-02 navMain has 5 groups, each its own accordion section.
    expect(sections.length).toBe(5);
    sections.forEach((section) => {
      expect(section.querySelector("summary")).toBeTruthy();
    });
  });

  it("renders the docs search field in the header (aside + mobile drawer)", () => {
    const { host } = render(sidebar02());

    expect(host.querySelector("aside input[type='search']")).toBeTruthy();
    expect(host.querySelector("dialog input[type='search']")).toBeTruthy();
  });

  it("fills the content pane with many stacked placeholder rows", () => {
    const { host } = render(sidebar02());
    const main = host.querySelector("main")!;
    const placeholderRows = main.querySelectorAll(":scope > div > div");

    expect(placeholderRows.length).toBeGreaterThan(10);
  });
});
