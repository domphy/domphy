// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createMemoryHistory,
  defineRoutes,
  type DomphyApp,
  type Route,
} from "../src/index";

const flush = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

let app: DomphyApp;
let container: HTMLElement;

function parallelRoutes(): Route[] {
  return defineRoutes([
    {
      path: "dash",
      layout: (children, _context, slots) => ({
        div: [
          { section: [slots.team ?? { span: "" }], dataSlot: "team" },
          { section: [slots.metrics ?? { span: "no-metrics" }], dataSlot: "metrics" },
          children,
        ],
      }),
      slots: {
        team: [
          { path: "", page: () => ({ span: "team-home" }) },
          { path: "users", page: () => ({ span: "team-users" }) },
        ],
        metrics: [{ path: "", page: () => ({ span: "metrics-home" }) }],
      },
      children: [
        { path: "", page: () => ({ h1: "Dash home" }) },
        { path: "users", page: () => ({ h1: "Dash users" }) },
      ],
    },
  ]);
}

function interceptRoutes(): Route[] {
  return defineRoutes([
    {
      path: "gallery",
      layout: (children, _context, slots) => ({
        div: [children, slots.modal ?? { span: "" }],
      }),
      slots: {
        modal: [{ path: "item", intercept: true, page: () => ({ span: "modal-item" }) }],
      },
      children: [
        { path: "", page: () => ({ h1: "Gallery" }) },
        { path: "item", page: () => ({ h1: "real-item" }) },
      ],
    },
  ]);
}

async function mount(routes: Route[], initial: string): Promise<void> {
  app = createApp(routes, { history: createMemoryHistory(initial) });
  container = document.createElement("div");
  document.body.appendChild(container);
  await app.render(container);
  await flush();
}

beforeEach(() => {
  vi.stubGlobal("scrollTo", () => {});
});

afterEach(() => {
  app?.destroy();
  container?.remove();
  vi.unstubAllGlobals();
});

describe("parallel routes", () => {
  it("renders each slot independently alongside the page", async () => {
    await mount(parallelRoutes(), "/dash");
    expect(container.textContent).toContain("Dash home");
    expect(container.textContent).toContain("team-home");
    expect(container.textContent).toContain("metrics-home");
  });

  it("matches slots against the sub-path independently", async () => {
    await mount(parallelRoutes(), "/dash/users");
    expect(container.textContent).toContain("Dash users");
    expect(container.textContent).toContain("team-users"); // team slot followed the sub-path
    expect(container.textContent).not.toContain("team-home");
    // metrics slot has no match for /dash/users -> omitted
    expect(container.textContent).toContain("no-metrics");
  });
});

describe("intercepting routes", () => {
  it("does NOT intercept on a hard load (renders the real route)", async () => {
    await mount(interceptRoutes(), "/gallery/item");
    expect(container.textContent).toContain("real-item");
    expect(container.textContent).not.toContain("modal-item");
  });

  it("intercepts on soft (client) navigation", async () => {
    await mount(interceptRoutes(), "/gallery");
    expect(container.textContent).toContain("Gallery");
    expect(container.textContent).not.toContain("modal-item");

    await app.router.navigate("/gallery/item");
    await flush();
    expect(container.textContent).toContain("modal-item"); // interception slot rendered
  });
});
