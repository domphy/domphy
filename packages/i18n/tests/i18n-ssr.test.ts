// @vitest-environment node
//
// SSR isolation: two concurrent requests must be able to initI18n('en') and
// initI18n('vi') on the same createI18n() singleton without clobbering each
// other. Client tests live in i18n.test.ts (@vitest-environment jsdom) and
// keep the globalThis dedup path (document is defined there).
import { describe, expect, it } from "vitest";
import { createI18n, runWithI18n } from "../src/index.ts";

const en = {
  hello: "Hello",
  greeting: "Hello, {{name}}!",
};
const viMessages = {
  hello: "Xin chào",
  greeting: "Xin chào, {{name}}!",
};

function makeI18n(globalKey: string) {
  return createI18n<"en" | "vi", typeof en>({
    globalKey,
    namespace: "app",
    locales: { en, vi: viMessages },
    defaultLocale: "en",
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runInRequest<T>(work: () => Promise<T>): Promise<T> {
  return runWithI18n(work);
}

describe("SSR per-request locale isolation", () => {
  it("two concurrent initI18n('en') and initI18n('vi') do not clobber each other", async () => {
    const key = `__test_ssr_isolate_${Date.now()}__`;
    const i18n = makeI18n(key);

    const [enResult, viResult] = await Promise.all([
      runInRequest(async () => {
        await i18n.initI18n("en");
        await delay(20);
        return {
          locale: i18n.getLocale(),
          current: i18n.currentLocale(() => {}),
          hello: i18n.t("hello"),
          greeting: i18n.t("greeting", { name: "Ada" }),
        };
      }),
      runInRequest(async () => {
        await i18n.initI18n("vi");
        await delay(20);
        return {
          locale: i18n.getLocale(),
          current: i18n.currentLocale(() => {}),
          hello: i18n.t("hello"),
          greeting: i18n.t("greeting", { name: "Ada" }),
        };
      }),
    ]);

    expect(enResult).toEqual({
      locale: "en",
      current: "en",
      hello: "Hello",
      greeting: "Hello, Ada!",
    });
    expect(viResult).toEqual({
      locale: "vi",
      current: "vi",
      hello: "Xin chào",
      greeting: "Xin chào, Ada!",
    });
  });

  it("does not mutate the shared globalThis store locale on initI18n", async () => {
    const key = `__test_ssr_nomutate_${Date.now()}__`;
    const i18n = makeI18n(key);

    await runInRequest(async () => {
      await i18n.initI18n("vi");
      expect(i18n.getLocale()).toBe("vi");
      expect(i18n.t("hello")).toBe("Xin chào");
    });

    const store = (globalThis as unknown as Record<string, { instance: { language: string } }>)[
      key
    ];
    expect(store.instance.language).toBe("en");
    expect(i18n.locale.get()).toBe("en");
  });

  it("same request can switch locale without leaking into another request", async () => {
    const key = `__test_ssr_switch_${Date.now()}__`;
    const i18n = makeI18n(key);

    const viHold = Promise.withResolvers<void>();
    const enSaw = Promise.withResolvers<string>();

    const enRequest = runInRequest(async () => {
      await i18n.initI18n("en");
      await viHold.promise;
      return i18n.t("hello");
    });
    const viRequest = runInRequest(async () => {
      await i18n.initI18n("en");
      await i18n.setLocale("vi");
      enSaw.resolve(i18n.t("hello"));
      viHold.resolve();
      return i18n.t("hello");
    });

    const [enHello, viHello] = await Promise.all([enRequest, viRequest]);
    expect(enHello).toBe("Hello");
    expect(viHello).toBe("Xin chào");
    expect(await enSaw.promise).toBe("Xin chào");
  });
});
