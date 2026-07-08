// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sidebar03 } from "../../../src/shadcn/sidebar/sidebar03.js";

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
    (HTMLDialogElement.prototype as any).showModal = function (this: HTMLDialogElement) {
      this.open = true;
    };
  }
  if (!(HTMLDialogElement.prototype as any).close) {
    (HTMLDialogElement.prototype as any).close = function (this: HTMLDialogElement) {
      this.open = false;
    };
  }
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("sidebar03", () => {
  it("renders a working demo with zero arguments", () => {
    const { host } = render(sidebar03());

    expect(host.querySelectorAll("aside").length).toBe(1);
    expect(host.querySelectorAll("dialog").length).toBe(1);
    expect(host.querySelectorAll("main").length).toBe(1);
  });

  it("renders a flat bold-link nav with always-visible sub-lists (no disclosure widgets, no icons)", () => {
    const { host } = render(sidebar03());
    const aside = host.querySelector("aside")!;

    // Upstream sidebar-03 renders each top-level entry as a plain BOLD link
    // with its sub-list ALWAYS visible — not a collapsible <details>.
    expect(aside.querySelectorAll("nav details").length).toBe(0);
    // Flat nav (no group-label headings) with no per-row icons.
    expect(aside.querySelectorAll("nav svg").length).toBe(0);

    const parents = aside.querySelectorAll("nav > ul > li");
    expect(parents.length).toBe(5);
    const first = parents[0];
    expect(first.querySelector(":scope > a strong")).toBeTruthy();
    expect(first.querySelector(":scope > ul")).toBeTruthy();
  });

  it("renders a static docs identity header and a toggle rail (no switcher/footer)", () => {
    const { host } = render(sidebar03());
    const aside = host.querySelector("aside")!;

    // Static header is a plain <a> logo/title link, not a switcher button.
    expect(aside.querySelector('a[href="#"]')).toBeTruthy();
    // The flush (non-floating) variant renders a <SidebarRail/> toggle button.
    const rail = aside.querySelector('button[aria-label="Toggle Sidebar"]');
    expect(rail).toBeTruthy();
  });

  it("marks the active child link with aria-current=page", () => {
    const { host } = render(sidebar03());
    const activeLinks = Array.from(host.querySelectorAll('a[aria-current="page"]'));
    const activeLabels = activeLinks.map((link) => link.textContent);

    expect(activeLabels.some((label) => label?.includes("Data Fetching"))).toBe(true);
  });
});
