// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sidebar01 } from "../../../src/shadcn/sidebar/sidebar01.js";

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

describe("sidebar01", () => {
  it("renders a working demo with zero arguments", () => {
    const { host } = render(sidebar01());

    // Docked aside, mobile drawer dialog and main content column.
    expect(host.querySelectorAll("aside").length).toBe(1);
    expect(host.querySelectorAll("dialog").length).toBe(1);
    expect(host.querySelectorAll("main").length).toBe(1);
  });

  it("renders the version switcher, labeled nav groups and a toggle rail (no footer)", () => {
    const { host } = render(sidebar01());
    const aside = host.querySelector("aside")!;

    // Upstream sidebar-01 header is a VersionSwitcher (Documentation / v{ver}).
    expect(
      aside.querySelector('button[aria-label="Select a version"]'),
    ).toBeTruthy();
    // Nav groups render as labeled <ul> lists with plain text rows.
    expect(aside.querySelectorAll("nav ul li a").length).toBeGreaterThan(0);
    expect(aside.querySelectorAll("small").length).toBeGreaterThan(0);
    // Non-floating shell renders a <SidebarRail/> toggle; upstream has no footer.
    expect(
      aside.querySelector('button[aria-label="Toggle Sidebar"]'),
    ).toBeTruthy();
  });

  it("renders the docs search field in the header (aside + mobile drawer)", () => {
    const { host } = render(sidebar01());

    // Upstream sidebar-01's header pairs the version/workspace switcher with a
    // SearchForm; it appears in both the docked aside and the mobile drawer.
    expect(host.querySelector("aside input[type='search']")).toBeTruthy();
    expect(host.querySelector("dialog input[type='search']")).toBeTruthy();
  });

  it("renders a sticky content header with toggle, divider and breadcrumb", () => {
    const { host } = render(sidebar01());
    const main = host.querySelector("main")!;
    const header = main.querySelector("header")!;

    expect(header).toBeTruthy();
    expect(header.querySelector("button")).toBeTruthy();
    expect(header.querySelector("nav")).toBeTruthy();
  });

  it("accepts custom nav groups and breadcrumb props", () => {
    const { host } = render(
      sidebar01({
        navGroups: [
          {
            label: "Custom",
            items: [{ label: "Only Item", iconName: "home", href: "#" }],
          },
        ],
        breadcrumb: [{ label: "Root", current: true }],
      }),
    );

    expect(host.textContent).toContain("Only Item");
    expect(host.textContent).toContain("Root");
  });
});
