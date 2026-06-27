import { describe, expect, it } from "vitest";
import { createI18nMiddleware, getLocale } from "../src/i18n.js";

const opts = {
  locales: ["en", "vi", "fr"] as const,
  defaultLocale: "en" as const,
};

function makeContext(pathname: string) {
  return {
    url: new URL(`http://localhost${pathname}`),
    pathname,
    searchParams: new URLSearchParams(),
  };
}

describe("createI18nMiddleware", () => {
  it("rewrites /vi/about to /about", () => {
    const mw = createI18nMiddleware(opts);
    const result = mw(makeContext("/vi/about"));
    expect(result).toEqual({ __domphyRewrite: "/about" });
  });

  it("rewrites /vi to /", () => {
    const mw = createI18nMiddleware(opts);
    const result = mw(makeContext("/vi"));
    expect(result).toEqual({ __domphyRewrite: "/" });
  });

  it("rewrites /en/docs/start to /docs/start", () => {
    const mw = createI18nMiddleware(opts);
    const result = mw(makeContext("/en/docs/start"));
    expect(result).toEqual({ __domphyRewrite: "/docs/start" });
  });

  it("passes through paths without a locale prefix (prefixDefault: false)", () => {
    const mw = createI18nMiddleware(opts);
    const result = mw(makeContext("/about"));
    expect(result).toBeUndefined();
  });

  it("passes through / (prefixDefault: false)", () => {
    const mw = createI18nMiddleware(opts);
    const result = mw(makeContext("/"));
    expect(result).toBeUndefined();
  });

  it("does not rewrite unknown segments", () => {
    const mw = createI18nMiddleware(opts);
    const result = mw(makeContext("/de/about"));
    expect(result).toBeUndefined();
  });

  it("redirects bare path when prefixDefault is true", () => {
    const mwPrefix = createI18nMiddleware({ ...opts, prefixDefault: true });
    expect(() => mwPrefix(makeContext("/about"))).toThrow("Redirect to /en/about");
  });

  it("redirects / to /en when prefixDefault is true", () => {
    const mwPrefix = createI18nMiddleware({ ...opts, prefixDefault: true });
    expect(() => mwPrefix(makeContext("/"))).toThrow("Redirect to /en");
  });

  it("still rewrites /vi/about when prefixDefault is true", () => {
    const mwPrefix = createI18nMiddleware({ ...opts, prefixDefault: true });
    const result = mwPrefix(makeContext("/vi/about"));
    expect(result).toEqual({ __domphyRewrite: "/about" });
  });
});

describe("getLocale", () => {
  it("returns locale from URL prefix /vi/about", () => {
    expect(getLocale({ url: "/vi/about" }, opts)).toBe("vi");
  });

  it("returns locale from URL prefix /en/about", () => {
    expect(getLocale({ url: "/en/about" }, opts)).toBe("en");
  });

  it("returns defaultLocale for /about (no prefix)", () => {
    expect(getLocale({ url: "/about" }, opts)).toBe("en");
  });

  it("returns defaultLocale for /", () => {
    expect(getLocale({ url: "/" }, opts)).toBe("en");
  });

  it("returns defaultLocale for unknown locale prefix", () => {
    expect(getLocale({ url: "/de/about" }, opts)).toBe("en");
  });

  it("returns locale for root locale path /fr", () => {
    expect(getLocale({ url: "/fr" }, opts)).toBe("fr");
  });
});
