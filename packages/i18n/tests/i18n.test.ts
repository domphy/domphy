// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { createI18n } from "../src/index.ts";

const en = {
  hello: "Hello",
  greeting: "Hello, {{name}}!",
  nested: { key: "Nested value" },
};
const vi = {
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
    locales: { en, vi },
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
      locales: { en, vi },
      defaultLocale: "en",
    });
    await i18nA.initI18n("en");
    await i18nA.setLocale("vi");

    const i18nB = createI18n<"en" | "vi", typeof en>({
      globalKey: key,
      namespace: "app",
      locales: { en, vi },
      defaultLocale: "en",
    });
    expect(i18nB.getLocale()).toBe("vi");
  });
});

describe("detectLocale()", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaultLocale when no signals are present", () => {
    const i18n = makeI18n();
    const locale = i18n.detectLocale({ storageKey: "lang", pathSegment: false });
    expect(locale).toBe("en");
  });

  it("reads locale from localStorage when storageKey is provided", () => {
    localStorage.setItem("lang", "vi");
    const i18n = makeI18n();
    const locale = i18n.detectLocale({ storageKey: "lang", pathSegment: false });
    expect(locale).toBe("vi");
  });

  it("ignores an unknown locale in localStorage and falls back to default", () => {
    localStorage.setItem("lang", "fr");
    const i18n = makeI18n();
    const locale = i18n.detectLocale({ storageKey: "lang", pathSegment: false });
    expect(locale).toBe("en");
  });
});
