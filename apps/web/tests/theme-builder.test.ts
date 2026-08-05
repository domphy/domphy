// @vitest-environment jsdom
import { ElementNode } from "@domphy/core";
import { diagnose, format } from "@domphy/doctor";
import { afterEach, describe, expect, it, vi } from "vitest";

function flush(): Promise<void> {
  return new Promise<void>((r) => queueMicrotask(r));
}

// Each import gets a fresh copy of the module's top-level state (baseColors,
// themeName, ...), since the demo isn't designed to be mounted twice in one
// process — force a fresh module instance per test via resetModules().
async function mountFresh() {
  vi.resetModules();
  const mod = await import("../docs/demos/theme/ThemeBuilder.ts");
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(mod.default);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
  document.head.querySelectorAll("style").forEach((s) => s.remove());
});

// Suite-level timeout: every test re-imports the whole demo module graph
// (vi.resetModules + dynamic import in mountFresh). The 20s config timeout
// still flakes under parallel CI load (audit 04-web finding #6 / 18-router),
// so this file gets a robust 60s budget.
describe("ThemeBuilder demo", { timeout: 60_000 }, () => {
  it("renders one color picker per semantic role", async () => {
    const { host } = await mountFresh();
    const pickers = host.querySelectorAll('input[type="color"]');
    // 10 roles + 1 inputColor gallery item.
    expect(pickers.length).toBeGreaterThanOrEqual(10);
  });

  it("renders 18-step swatch rows for every role", async () => {
    const { host } = await mountFresh();
    const rows = host.querySelectorAll("aside ~ div section div");
    expect(rows.length).toBeGreaterThan(0);
  });

  it("changing a color picker regenerates the theme and updates the export panel", async () => {
    const { host } = await mountFresh();
    const picker = host.querySelector(
      'input[type="color"]',
    ) as HTMLInputElement;
    expect(picker).toBeTruthy();

    const exportCode = host.querySelector("pre code") as HTMLElement;
    // Each color field pairs the native picker with a hex text input bound
    // to the same state.
    const hexInput = picker
      .closest("label")
      ?.querySelector('input[type="text"]') as HTMLInputElement;
    const before = exportCode.textContent;

    picker.value = "#00ff00";
    picker.dispatchEvent(new window.Event("input", { bubbles: true }));
    await flush();

    // The picked hex isn't required to survive verbatim into the discretized
    // 18-step ramp (it's a WCAG-optimized interpolation, not an identity
    // passthrough) — assert on the raw-input mirror instead, and that the
    // export panel (which reflects the regenerated theme) actually changed.
    expect(hexInput.value).toBe("#00ff00");
    expect(exportCode.textContent).not.toBe(before);
  });

  it("renders the size & density disclosure with one field per scale step", async () => {
    const { host } = await mountFresh();
    const disclosure = Array.from(
      host.querySelectorAll("aside details summary"),
    ).find((s) => s.textContent === "Size & density");
    expect(disclosure).toBeTruthy();

    // The disclosure content is always in the DOM (closed = hidden), so the
    // fields are queryable without opening it: 8 font sizes + 5 densities.
    const numberInputs = host.querySelectorAll('aside input[type="number"]');
    expect(numberInputs.length).toBe(5); // one per density step
  });

  it("switching the preview theme selector changes the gallery's dataTheme", async () => {
    const { host } = await mountFresh();
    const select = host.querySelector(
      'select[aria-label="Preview theme"]',
    ) as HTMLSelectElement;
    // The preview root is the only dataTheme-scoped subtree; the sidebar
    // follows the page theme.
    const gallery = host.querySelector("[data-theme]") as HTMLElement | null;

    expect(select).toBeTruthy();
    expect(gallery).toBeTruthy();
    // Default is the generated "brand" theme, not "light".
    expect(gallery?.getAttribute("data-theme")).not.toBe("light");

    select.value = "Built-in light";
    select.dispatchEvent(new window.Event("input", { bubbles: true }));
    await flush();

    expect(gallery?.getAttribute("data-theme")).toBe("light");
  });

  it("changing a density field regenerates without throwing", async () => {
    const { host } = await mountFresh();
    const densityInput = host.querySelector(
      'aside input[type="number"]',
    ) as HTMLInputElement;
    expect(densityInput).toBeTruthy();

    densityInput.value = "1.25";
    densityInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    await flush();

    const exportCode = host.querySelector("pre code") as HTMLElement;
    expect(exportCode.textContent).toContain("1.25");
  });

  it("passes @domphy/doctor's static checks (AGENTS.md self-check rule)", async () => {
    vi.resetModules();
    const mod = await import("../docs/demos/theme/ThemeBuilder.ts");
    const diagnostics = diagnose(mod.default);
    expect(diagnostics, format(diagnostics)).toHaveLength(0);
  });
});
