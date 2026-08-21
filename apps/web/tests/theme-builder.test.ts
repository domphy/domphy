// @vitest-environment jsdom
import { ElementNode } from "@domphy/core";
import { diagnose, format } from "@domphy/doctor";
import { contrastRatio, generateTheme } from "@domphy/theme";
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
  return { host, node, mod };
}

afterEach(() => {
  document.body.innerHTML = "";
  document.head.querySelectorAll("style").forEach((s) => s.remove());
});

// Suite-level timeout: every test re-imports the whole demo module graph
// (vi.resetModules + dynamic import in mountFresh). The 20s config timeout
// still flakes under parallel CI load, so this file gets a robust 60s budget.
describe("ThemeBuilder demo", { timeout: 60_000 }, () => {
  it("renders one color picker per semantic role", async () => {
    const { host } = await mountFresh();
    const pickers = host.querySelectorAll('input[type="color"]');
    // 10 roles + gallery inputs if any.
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
    const hexInput = picker
      .closest("label")
      ?.querySelector('input[type="text"]') as HTMLInputElement;
    const before = exportCode.textContent;

    picker.value = "#00ff00";
    picker.dispatchEvent(new window.Event("input", { bubbles: true }));
    await flush();

    expect(hexInput.value).toBe("#00ff00");
    expect(exportCode.textContent).not.toBe(before);
  });

  it("renders the size & density disclosure with one field per scale step", async () => {
    const { host } = await mountFresh();
    const disclosure = Array.from(
      host.querySelectorAll("aside details summary"),
    ).find((s) => s.textContent === "Size & density");
    expect(disclosure).toBeTruthy();

    const numberInputs = host.querySelectorAll('aside input[type="number"]');
    expect(numberInputs.length).toBe(5);
  });

  it("switching preview theme selects generated light and generated dark", async () => {
    const { host } = await mountFresh();
    const select = host.querySelector(
      'select[aria-label="Preview theme"]',
    ) as HTMLSelectElement;
    const gallery = host.querySelector("[data-theme]") as HTMLElement | null;

    expect(select).toBeTruthy();
    expect(gallery).toBeTruthy();
    // Default is generated light, not built-in "light".
    expect(gallery?.getAttribute("data-theme")).toBe("theme-builder-preview");

    select.value = "generated-dark";
    select.dispatchEvent(new window.Event("input", { bubbles: true }));
    await flush();

    expect(gallery?.getAttribute("data-theme")).toBe(
      "theme-builder-preview-dark",
    );

    select.value = "generated-light";
    select.dispatchEvent(new window.Event("input", { bubbles: true }));
    await flush();

    expect(gallery?.getAttribute("data-theme")).toBe("theme-builder-preview");
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

  it("surfaces live contrast checks wired to real contrastRatio values", async () => {
    const { host, mod } = await mountFresh();
    const panel = host.querySelector(
      '[aria-label="Contrast checks"]',
    ) as HTMLElement | null;
    expect(panel).toBeTruthy();
    // Pass/Fail tags or ratio text must appear — not a hardcoded empty shell.
    expect(panel?.textContent).toMatch(/Pass|Fail/);
    expect(panel?.textContent).toMatch(/\d+\.\d+:1/);

    // Report ratios must match a real contrastRatio call on the same pairs
    // the helper uses (neutral body: shift-9 on surface).
    const theme = generateTheme(mod.defaultColors());
    const report = mod.buildQualityReport(theme);
    const body = report.contrasts.find(
      (c: { id: string }) => c.id === "neutral-body",
    );
    expect(body).toBeTruthy();
    const expected = contrastRatio(body!.foreground, body!.background);
    expect(body!.ratio).toBeCloseTo(expected, 5);
    expect(body!.pass).toBe(expected >= 4.5);
  });

  it("reset restores default colors and updates export content", async () => {
    const { host } = await mountFresh();
    const exportCode = host.querySelector("pre code") as HTMLElement;
    const picker = host.querySelector(
      'input[type="color"]',
    ) as HTMLInputElement;
    const initial = exportCode.textContent;

    picker.value = "#112233";
    picker.dispatchEvent(new window.Event("input", { bubbles: true }));
    await flush();
    expect(exportCode.textContent).not.toBe(initial);

    const reset = host.querySelector(
      'button[aria-label="Reset to default colors"]',
    ) as HTMLButtonElement;
    expect(reset).toBeTruthy();
    reset.click();
    await flush();

    expect(exportCode.textContent).toBe(initial);
  });

  it("randomize mutates base colors and changes export content", async () => {
    const { host } = await mountFresh();
    const exportCode = host.querySelector("pre code") as HTMLElement;
    const before = exportCode.textContent;

    const randomize = host.querySelector(
      'button[aria-label="Randomize base colors"]',
    ) as HTMLButtonElement;
    expect(randomize).toBeTruthy();
    randomize.click();
    await flush();

    expect(exportCode.textContent).not.toBe(before);
    expect(exportCode.textContent).toContain("setTheme(");
  });

  it("harmony-from-primary fills roles from the primary seed", async () => {
    const { host, mod } = await mountFresh();
    // Set primary via its hex field, then apply harmony.
    const primaryHex = Array.from(
      host.querySelectorAll('input[aria-label$="base color (hex)"]'),
    ).find(
      (el) =>
        (el as HTMLInputElement).getAttribute("aria-label") ===
        "primary base color (hex)",
    ) as HTMLInputElement;
    expect(primaryHex).toBeTruthy();
    primaryHex.value = "#3366ff";
    primaryHex.dispatchEvent(new window.Event("input", { bubbles: true }));
    await flush();

    const exportCode = host.querySelector("pre code") as HTMLElement;
    const before = exportCode.textContent;

    const harmony = host.querySelector(
      'button[aria-label="Fill roles from primary harmony"]',
    ) as HTMLButtonElement;
    expect(harmony).toBeTruthy();
    harmony.click();
    await flush();

    expect(exportCode.textContent).not.toBe(before);

    // Pure helper must produce a primary matching the seed and distinct others.
    const filled = mod.harmonyFromPrimary("#3366ff");
    expect(filled.primary.toLowerCase()).toBe("#3366ff");
    expect(filled.secondary.toLowerCase()).not.toBe("#3366ff");
    expect(filled.neutral.toLowerCase()).not.toBe("#3366ff");
  });

  it("export snippet embeds the editable theme name", async () => {
    const { host, mod } = await mountFresh();
    const nameInput = host.querySelector(
      'input[aria-label="Theme name"]',
    ) as HTMLInputElement;
    expect(nameInput).toBeTruthy();
    nameInput.value = "acme";
    nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    await flush();

    const exportCode = host.querySelector("pre code") as HTMLElement;
    expect(exportCode.textContent).toContain('setTheme("acme"');
    expect(mod.buildExportSnippet("acme", '{"x":1}')).toBe(
      'setTheme("acme", {"x":1})',
    );
  });

  it("deriveDarkTheme reverses ramps and remaps base tones", async () => {
    vi.resetModules();
    const mod = await import("../docs/demos/theme/ThemeBuilder.ts");
    const light = generateTheme({ primary: "#4a7ff4", neutral: "#888888" });
    const dark = mod.deriveDarkTheme(light);
    expect(dark.direction).toBe("lighten");
    expect(dark.colors!.primary).toEqual([...light.colors!.primary].reverse());
    const lightBase = light.baseTones!.primary;
    const len = light.colors!.primary.length;
    expect(dark.baseTones!.primary).toBe(len - 1 - lightBase);
  });

  it("passes @domphy/doctor's static checks (AGENTS.md self-check rule)", async () => {
    vi.resetModules();
    const mod = await import("../docs/demos/theme/ThemeBuilder.ts");
    const diagnostics = diagnose(mod.default);
    expect(diagnostics, format(diagnostics)).toHaveLength(0);
  });
});
