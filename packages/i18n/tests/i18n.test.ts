// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "../src/index.ts";

const en = {
  hello: "Hello",
  greeting: "Hello, {{name}}!",
  nested: { key: "Nested value" },
};
const viMessages = {
  hello: "Xin chào",
  greeting: "Xin chào, {{name}}!",
  nested: { key: "Giá trị lồng nhau" },
};

let counter = 0;
function makeI18n() {
  counter++;
  return createI18n<"en" | "vi", typeof en>({
    globalKey: `__test_i18n_${counter}__`,
    namespace: "app",
    locales: { en, vi: viMessages },
    defaultLocale: "en",
  });
}

describe("createI18n", () => {
  it("returns an instance with the required API surface", () => {
    const i18n = makeI18n();
    expect(typeof i18n.t).toBe("function");
    expect(typeof i18n.initI18n).toBe("function");
    expect(typeof i18n.setLocale).toBe("function");
    expect(typeof i18n.getLocale).toBe("function");
    expect(typeof i18n.detectLocale).toBe("function");
    expect(i18n.locale).toBeDefined();
  });
});

describe("t()", () => {
  it("translates a key after init", async () => {
    const i18n = makeI18n();
    await i18n.initI18n("en");
    expect(i18n.t("hello")).toBe("Hello");
  });

  it("interpolates variables", async () => {
    const i18n = makeI18n();
    await i18n.initI18n("en");
    expect(i18n.t("greeting", { name: "Alice" })).toBe("Hello, Alice!");
  });

  it("translates nested keys with dot notation", async () => {
    const i18n = makeI18n();
    await i18n.initI18n("en");
    expect(i18n.t("nested.key" as any)).toBe("Nested value");
  });
});

describe("setLocale() / getLocale()", () => {
  it("switches locale and getLocale() reflects the change", async () => {
    const i18n = makeI18n();
    await i18n.initI18n("en");
    expect(i18n.getLocale()).toBe("en");
    await i18n.setLocale("vi");
    expect(i18n.getLocale()).toBe("vi");
  });

  it("t() returns translation in the new locale after switch", async () => {
    const i18n = makeI18n();
    await i18n.initI18n("en");
    await i18n.setLocale("vi");
    expect(i18n.t("hello")).toBe("Xin chào");
  });

  it("switching back to original locale works", async () => {
    const i18n = makeI18n();
    await i18n.initI18n("en");
    await i18n.setLocale("vi");
    await i18n.setLocale("en");
    expect(i18n.t("hello")).toBe("Hello");
  });
});

describe("singleton behavior", () => {
  it("same globalKey returns the same underlying store", async () => {
    const key = `__test_singleton_${Date.now()}__`;
    const i18nA = createI18n<"en" | "vi", typeof en>({
      globalKey: key,
      namespace: "app",
      locales: { en, vi: viMessages },
      defaultLocale: "en",
    });
    await i18nA.initI18n("en");
    await i18nA.setLocale("vi");

    const i18nB = createI18n<"en" | "vi", typeof en>({
      globalKey: key,
      namespace: "app",
      locales: { en, vi: viMessages },
      defaultLocale: "en",
    });
    expect(i18nB.getLocale()).toBe("vi");
  });
});

describe("exists()", () => {
  it("returns true for an existing key", async () => {
    const i18n = makeI18n();
    await i18n.initI18n("en");
    expect(i18n.exists("hello")).toBe(true);
  });

  it("returns false for a missing key", async () => {
    const i18n = makeI18n();
    await i18n.initI18n("en");
    expect(i18n.exists("nonexistent.key" as any)).toBe(false);
  });
});

describe("currentLocale()", () => {
  it("returns the active locale", async () => {
    const i18n = makeI18n();
    await i18n.initI18n("en");
    const locale = i18n.currentLocale(() => {});
    expect(locale).toBe("en");
  });

  it("reflects locale after setLocale()", async () => {
    const i18n = makeI18n();
    await i18n.initI18n("en");
    await i18n.setLocale("vi");
    const locale = i18n.currentLocale(() => {});
    expect(locale).toBe("vi");
  });
});

describe("detectLocale()", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaultLocale when no signals are present", () => {
    const i18n = makeI18n();
    const locale = i18n.detectLocale({
      storageKey: "lang",
      pathSegment: false,
    });
    expect(locale).toBe("en");
  });

  it("reads locale from localStorage when storageKey is provided", () => {
    localStorage.setItem("lang", "vi");
    const i18n = makeI18n();
    const locale = i18n.detectLocale({
      storageKey: "lang",
      pathSegment: false,
    });
    expect(locale).toBe("vi");
  });

  it("ignores an unknown locale in localStorage and falls back to default", () => {
    localStorage.setItem("lang", "fr");
    const i18n = makeI18n();
    const locale = i18n.detectLocale({
      storageKey: "lang",
      pathSegment: false,
    });
    expect(locale).toBe("en");
  });

  it("ignores inherited Object.prototype keys (e.g. 'constructor') as locale matches", () => {
    localStorage.setItem("lang", "constructor");
    const i18n = makeI18n();
    const locale = i18n.detectLocale({
      storageKey: "lang",
      pathSegment: false,
    });
    expect(locale).toBe("en");
  });
});

describe("interpolation escaping", () => {
  it("escapes HTML in interpolated values by default (i18next's own safe default)", async () => {
    const i18n = makeI18n();
    await i18n.initI18n("en");
    expect(i18n.t("greeting", { name: "<b>Alice</b>" })).toBe(
      "Hello, &lt;b&gt;Alice&lt;&#x2F;b&gt;!",
    );
  });

  it("honors an explicit interpolation.escapeValue:false override", async () => {
    counter++;
    const i18n = createI18n<"en" | "vi", typeof en>({
      globalKey: `__test_i18n_${counter}__`,
      namespace: "app",
      locales: { en, vi: viMessages },
      defaultLocale: "en",
      interpolation: { escapeValue: false },
    });
    await i18n.initI18n("en");
    expect(i18n.t("greeting", { name: "<b>Alice</b>" })).toBe(
      "Hello, <b>Alice</b>!",
    );
  });
});

describe("concurrent initI18n() / setLocale()", () => {
  it("does not let a racing setLocale() get clobbered by the original initI18n()'s locale", async () => {
    const i18n = makeI18n();
    await Promise.all([i18n.initI18n("en"), i18n.setLocale("vi")]);
    // getLocale() (reads instance.language) and currentLocale() (reads the
    // reactive store) must agree — the race used to leave them inconsistent.
    expect(i18n.getLocale()).toBe("vi");
    expect(i18n.currentLocale(() => {})).toBe("vi");
  });
});

describe("t() before initI18n()", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns once in dev while translations are unavailable", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const i18n = makeI18n();

    // Not initialized: i18next cannot translate (returns undefined here) —
    // the dev warning must point at initI18n() and fire exactly once.
    expect(i18n.t("hello")).not.toBe("Hello");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("initI18n()");

    i18n.t("hello");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("does not warn after initI18n() resolved", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const i18n = makeI18n();
    await i18n.initI18n("en");

    expect(i18n.t("hello")).toBe("Hello");
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("globalKey reuse with different options", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });
  it("warns in dev when a second createI18n reuses the key with different locales", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const key = `__test_mismatch_${Date.now()}__`;

    createI18n<"en" | "vi", typeof en>({
      globalKey: key,
      namespace: "app",
      locales: { en, vi: viMessages },
      defaultLocale: "en",
    });
    // Same key, different locale set — the first store silently wins.
    createI18n<"en" | "fr", typeof en>({
      globalKey: key,
      namespace: "app",
      locales: { en, fr: en },
      defaultLocale: "en",
    });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("globalKey");

    warn.mockRestore();
  });

  it("does not warn when the options match (the Vite chunk-split dedup case)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const key = `__test_match_${Date.now()}__`;

    createI18n<"en" | "vi", typeof en>({
      globalKey: key,
      namespace: "app",
      locales: { en, vi: viMessages },
      defaultLocale: "en",
    });
    createI18n<"en" | "vi", typeof en>({
      globalKey: key,
      namespace: "app",
      locales: { en, vi: viMessages },
      defaultLocale: "en",
    });

    expect(warn).not.toHaveBeenCalled();

    warn.mockRestore();
  });
});

describe("initPromise lifecycle", () => {
  it("clears the in-flight initPromise after a successful init", async () => {
    const key = `__test_initpromise_${Date.now()}__`;
    const i18n = createI18n<"en" | "vi", typeof en>({
      globalKey: key,
      namespace: "app",
      locales: { en, vi: viMessages },
      defaultLocale: "en",
    });

    await i18n.initI18n("en");

    const store = (globalThis as unknown as Record<string, any>)[key];
    expect(store.initialized).toBe(true);
    expect(store.initPromise).toBeUndefined();
  });
});
