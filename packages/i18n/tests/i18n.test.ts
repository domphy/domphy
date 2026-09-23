// @vitest-environment jsdom

import { ElementNode, peek } from "@domphy/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "../src/index.js";

const en = {
  hello: "Hello",
  greeting: "Hello, {{name}}!",
  nested: { key: "Nested value" },
  item_one: "{{count}} item",
  item_other: "{{count}} items",
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

  it("t(listener, key) reads localeState and re-renders on setLocale()", async () => {
    const i18n = makeI18n();
    await i18n.initI18n("en");

    const listener = vi.fn();
    expect(i18n.t(listener as any, "hello")).toBe("Hello");

    const host = document.createElement("div");
    document.body.appendChild(host);
    const node = new ElementNode({
      p: (l) => i18n.t(l, "hello"),
    });
    node.render(host);
    expect(host.textContent).toBe("Hello");

    await i18n.setLocale("vi");
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(listener).toHaveBeenCalled();
    // t()'s listener overload dispatches on `typeof a === "function"`, not on
    // whether it carries a real elementNode — an empty function forces that
    // branch without wiring a subscription, unlike peek() (which passes
    // `undefined` and falls into the plain-key overload instead).
    expect(i18n.t(listener as any, "hello")).toBe("Xin chào");
    expect(host.textContent).toBe("Xin chào");

    node.remove();
    host.remove();
  });
});

describe("pluralization", () => {
  it("resolves plural forms via the base key and count (i18next v4 suffixes)", async () => {
    const i18n = makeI18n();
    await i18n.initI18n("en");
    // The base key "item" is not a leaf in the messages object — i18next
    // resolves it to item_one/item_other from count. The FlattenKeys typing
    // must admit the base key too (see WithPluralBase in src/index.ts).
    expect(i18n.t("item", { count: 1 })).toBe("1 item");
    expect(i18n.t("item", { count: 2 })).toBe("2 items");
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

  it("does not treat a fallback-locale key as present in the active locale", async () => {
    const i18n = makeI18n();
    await i18n.initI18n("vi");
    expect(i18n.exists("hello")).toBe(true);
    expect(i18n.exists("item_one" as any)).toBe(false);
  });
});

describe("currentLocale()", () => {
  it("returns the active locale", async () => {
    const i18n = makeI18n();
    await i18n.initI18n("en");
    const locale = peek((l) => i18n.currentLocale(l));
    expect(locale).toBe("en");
  });

  it("reflects locale after setLocale()", async () => {
    const i18n = makeI18n();
    await i18n.initI18n("en");
    await i18n.setLocale("vi");
    const locale = peek((l) => i18n.currentLocale(l));
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

describe("addLocale (on-demand locale loading)", () => {
  // Truth source: i18next's `addResourceBundle(lng, ns, resources, deep,
  // overwrite)` contract — a bundle added after init() becomes resolvable by
  // t()/changeLanguage(), deep-merges into an existing bundle, and overwrites
  // the keys it repeats. createI18n() snapshots `locales` at init, so without
  // this an app cannot `await import()` a locale it did not ship up front.
  it("registers a locale after init so setLocale/t/exists resolve it", async () => {
    counter++;
    const i18n = createI18n<"en" | "vi" | "fr", typeof en>({
      globalKey: `__test_add_locale_${counter}__`,
      namespace: "app",
      locales: { en, vi: viMessages },
      defaultLocale: "en",
    });
    await i18n.initI18n("en");

    // Unknown before it is added: changeLanguage falls back, getLocale rejects
    // the code because it is not in the locale set.
    await i18n.setLocale("fr");
    expect(i18n.getLocale()).toBe("en");

    await i18n.addLocale("fr", { hello: "Bonjour", nested: { key: "Valeur" } });
    await i18n.setLocale("fr");
    expect(i18n.getLocale()).toBe("fr");
    expect(i18n.t("hello")).toBe("Bonjour");
    expect(i18n.t("nested.key")).toBe("Valeur");
    expect(i18n.exists("hello")).toBe(true);
  });

  it("deep-merges and overwrites, per addResourceBundle(deep, overwrite)", async () => {
    counter++;
    const i18n = createI18n<"en" | "vi" | "fr", typeof en>({
      globalKey: `__test_add_locale_merge_${counter}__`,
      namespace: "app",
      locales: { en, vi: viMessages },
      defaultLocale: "en",
    });
    await i18n.initI18n("en");
    await i18n.addLocale("fr", { hello: "Bonjour", nested: { key: "Valeur" } });
    await i18n.addLocale("fr", { hello: "Salut" });
    await i18n.setLocale("fr");
    // Repeated key overwritten, untouched key kept.
    expect(i18n.t("hello")).toBe("Salut");
    expect(i18n.t("nested.key")).toBe("Valeur");
  });

  it("initializes first when called before initI18n", async () => {
    counter++;
    const i18n = createI18n<"en" | "vi" | "fr", typeof en>({
      globalKey: `__test_add_locale_preinit_${counter}__`,
      namespace: "app",
      locales: { en, vi: viMessages },
      defaultLocale: "en",
    });
    await i18n.addLocale("fr", { hello: "Bonjour" });
    await i18n.setLocale("fr");
    expect(i18n.t("hello")).toBe("Bonjour");
  });

  // Truth source: Domphy's reactivity contract — a reader that subscribed to a
  // value re-runs when that value changes. `initI18n("fr")` with fr not yet
  // bundled leaves i18next ALREADY on "fr" serving the fallback, so the later
  // `setLocale("fr")` short-circuits on `instance.language === locale` and the
  // locale state never changes. Before addLocale bumped a bundle version the
  // static `t()` returned "Bonjour" while every mounted reactive reader was
  // still showing "Hello" — two APIs of the same instance disagreeing.
  it("re-renders mounted readers when the locale on screen gains its bundle", async () => {
    counter++;
    const i18n = createI18n<"en" | "fr", typeof en>({
      globalKey: `__test_add_locale_rerender_${counter}__`,
      namespace: "app",
      locales: { en } as Record<"en" | "fr", typeof en>,
      defaultLocale: "en",
    });
    await i18n.initI18n("fr");

    const node = new ElementNode({ p: (l) => i18n.t(l, "hello") });
    node.render(document.body);
    expect(node.domElement?.textContent).toBe("Hello");

    await i18n.addLocale("fr", { hello: "Bonjour" });
    await i18n.setLocale("fr");
    expect(i18n.t("hello")).toBe("Bonjour");
    expect(node.domElement?.textContent).toBe("Bonjour");
  });

  // Truth source: same contract, for the partial-bundle case the README
  // advertises (ship a placeholder, fill it in later). The locale code does not
  // change at all here, so `localeState` can never carry the signal.
  it("re-renders when a key arrives for the locale already active", async () => {
    counter++;
    const i18n = createI18n<"en", { hello: string; later: string }>({
      globalKey: `__test_add_locale_partial_${counter}__`,
      namespace: "app",
      locales: { en: { hello: "Hello" } },
      defaultLocale: "en",
    });
    await i18n.initI18n("en");

    const node = new ElementNode({ p: (l) => i18n.t(l, "later") });
    node.render(document.body);
    expect(node.domElement?.textContent).toBe("later"); // key echoed back

    await i18n.addLocale("en", { later: "Loaded later" });
    expect(node.domElement?.textContent).toBe("Loaded later");
  });

  // Truth source: this package's globalThis-dedup design (module header) —
  // Vite may bundle it once per chunk, and both instances must behave as one.
  // Keeping the added code in the createI18n closure left the sibling instance
  // rejecting a locale i18next had already switched to, so its getLocale()
  // reported the default while t() returned the new locale's strings.
  it("shares added locales with a sibling instance on the same globalKey", async () => {
    counter++;
    const options = {
      globalKey: `__test_add_locale_shared_${counter}__`,
      namespace: "app",
      locales: { en } as Record<"en" | "fr", typeof en>,
      defaultLocale: "en" as const,
    };
    const chunkA = createI18n<"en" | "fr", typeof en>({ ...options });
    const chunkB = createI18n<"en" | "fr", typeof en>({ ...options });
    await chunkA.initI18n("en");
    await chunkA.addLocale("fr", { hello: "Bonjour" });
    await chunkA.setLocale("fr");

    expect(chunkB.t("hello")).toBe("Bonjour");
    expect(chunkB.getLocale()).toBe("fr");
  });
});

describe("interpolation escaping", () => {
  // Truth source: Domphy's own render boundary. A string child is always TEXT
  // — `ElementNode.generateHTML()` escapes it — so a translation must reach
  // that boundary with its ORIGINAL characters. i18next escaping them first
  // makes the boundary escape the entities again, and the reader sees the
  // entity source (`O&#39;Brien`) instead of the name.
  it("leaves interpolated values unescaped so Domphy's render boundary escapes them exactly once", async () => {
    const i18n = makeI18n();
    await i18n.initI18n("en");
    const translated = i18n.t("greeting", { name: "O'Brien & <b>Alice</b>" });
    expect(translated).toBe("Hello, O'Brien & <b>Alice</b>!");
    expect(new ElementNode({ p: translated }).generateHTML()).toContain(
      "Hello, O&#39;Brien &amp; &lt;b&gt;Alice&lt;/b&gt;!",
    );
  });

  it("honors an explicit interpolation.escapeValue:true override", async () => {
    counter++;
    const i18n = createI18n<"en" | "vi", typeof en>({
      globalKey: `__test_i18n_${counter}__`,
      namespace: "app",
      locales: { en, vi: viMessages },
      defaultLocale: "en",
      interpolation: { escapeValue: true },
    });
    await i18n.initI18n("en");
    expect(i18n.t("greeting", { name: "<b>Alice</b>" })).toBe(
      "Hello, &lt;b&gt;Alice&lt;&#x2F;b&gt;!",
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
    expect(peek((l) => i18n.currentLocale(l))).toBe("vi");
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

  it("warns in dev when a second createI18n reuses the key with different interpolation", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const key = `__test_mismatch_interp_${Date.now()}__`;

    createI18n<"en" | "vi", typeof en>({
      globalKey: key,
      namespace: "app",
      locales: { en, vi: viMessages },
      defaultLocale: "en",
    });
    // Same structural options, opposite escaping posture — must warn too.
    createI18n<"en" | "vi", typeof en>({
      globalKey: key,
      namespace: "app",
      locales: { en, vi: viMessages },
      defaultLocale: "en",
      interpolation: { escapeValue: true },
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
