// @domphy/i18n — generic i18next wrapper with Domphy reactivity.
//
// Why globalThis: Vite sometimes bundles a workspace package separately into
// each consuming chunk. Without the global pin, every chunk creates its own
// i18next instance — one caller mutates it, another reads blank labels.
//
// Usage:
//   // i18n.ts
//   import { createI18n } from '@domphy/i18n'
//   import en from './locales/en.json'
//   import vi from './locales/vi.json'
//   export type Locale = 'en' | 'vi'
//   export const i18n = createI18n<'en' | 'vi', typeof en>({
//     globalKey: '__myapp_i18n__',
//     namespace: 'app',
//     locales: { en, vi },
//     defaultLocale: 'en',
//   })

import { type Listener, toState } from "@domphy/core";
import { createInstance, type i18n } from "i18next";

export type { i18n };

export interface DetectOptions {
  /** localStorage key to read persisted locale from. */
  storageKey?: string;
  /** Whether to try reading locale from the first URL path segment (e.g. /vi/...). */
  pathSegment?: boolean;
}

export interface CreateI18nOptions<TLocale extends string> {
  /** Unique key under globalThis — must differ per app to avoid cross-app collision. */
  globalKey: string;
  /** i18next resource namespace. */
  namespace: string;
  /** Translation objects keyed by locale code. */
  locales: Record<TLocale, Record<string, unknown>>;
  /** Locale used before initI18n / detectLocale is called. */
  defaultLocale: TLocale;
}

export interface I18nInstance<TKey extends string, TLocale extends string> {
  /** Static call: t("key") — no reactivity. */
  t(key: TKey, options?: Record<string, unknown>): string;
  /** Reactive call: t(listener, "key") — Domphy re-renders on setLocale(). */
  t(listener: Listener, key: TKey, options?: Record<string, unknown>): string;
  /** Reactive locale state — subscribe in Domphy render functions. */
  locale: ReturnType<typeof toState<TLocale>>;
  initI18n(locale?: TLocale): Promise<void>;
  setLocale(locale: TLocale): Promise<void>;
  getLocale(): TLocale;
  detectLocale(options?: DetectOptions): TLocale;
}

interface Store<TLocale extends string> {
  instance: i18n;
  localeState: ReturnType<typeof toState<TLocale>>;
  initialized: boolean;
}

function getOrCreateStore<TLocale extends string>(
  globalKey: string,
  defaultLocale: TLocale,
): Store<TLocale> {
  const g = globalThis as unknown as Record<string, Store<TLocale> | undefined>;
  let store = g[globalKey];
  if (!store) {
    store = {
      instance: createInstance(),
      localeState: toState<TLocale>(defaultLocale),
      initialized: false,
    };
    g[globalKey] = store;
  }
  return store;
}

export function createI18n<
  TLocale extends string,
  TMessages extends Record<string, unknown> = Record<string, unknown>,
>(
  options: CreateI18nOptions<TLocale>,
): I18nInstance<Extract<keyof FlattenKeys<TMessages>, string>, TLocale> {
  const { globalKey, namespace, locales, defaultLocale } = options;

  const resources = Object.fromEntries(
    Object.entries(locales).map(([locale, messages]) => [
      locale,
      { [namespace]: messages },
    ]),
  ) as Record<TLocale, Record<string, Record<string, unknown>>>;

  function getStore() {
    return getOrCreateStore<TLocale>(globalKey, defaultLocale);
  }

  async function initI18n(locale: TLocale = defaultLocale): Promise<void> {
    const store = getStore();
    if (store.initialized) {
      await setLocale(locale);
      return;
    }
    store.initialized = true;
    await store.instance.init({
      lng: locale,
      fallbackLng: defaultLocale,
      defaultNS: namespace,
      ns: [namespace],
      interpolation: { escapeValue: false },
      resources,
      initImmediate: false,
    });
    store.localeState.set(locale);
  }

  async function setLocale(locale: TLocale): Promise<void> {
    const store = getStore();
    if (!store.initialized) {
      await initI18n(locale);
      return;
    }
    if (store.instance.language === locale) return;
    await store.instance.changeLanguage(locale);
    store.localeState.set(locale);
  }

  function getLocale(): TLocale {
    const lang = getStore().instance.language;
    return (lang in locales ? lang : defaultLocale) as TLocale;
  }

  function detectLocale(opts: DetectOptions = {}): TLocale {
    const { storageKey, pathSegment = true } = opts;
    if (pathSegment) {
      try {
        const seg = location.pathname.split("/")[1];
        if (seg && seg in locales) return seg as TLocale;
      } catch {
        /* SSR */
      }
    }
    if (storageKey) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored && stored in locales) return stored as TLocale;
      } catch {
        /* SSR / private mode */
      }
    }
    return defaultLocale;
  }

  function t(
    a: Extract<keyof FlattenKeys<TMessages>, string> | Listener,
    b?: Extract<keyof FlattenKeys<TMessages>, string> | Record<string, unknown>,
    c?: Record<string, unknown>,
  ): string {
    const store = getStore();
    if (typeof a === "function") {
      store.localeState.get(a as Listener);
      return store.instance.t(b as string, c) as string;
    }
    return store.instance.t(
      a as string,
      b as Record<string, unknown> | undefined,
    ) as string;
  }

  return {
    t,
    get locale() {
      return getStore().localeState;
    },
    initI18n,
    setLocale,
    getLocale,
    detectLocale,
  } as I18nInstance<Extract<keyof FlattenKeys<TMessages>, string>, TLocale>;
}

// Utility: flatten nested object keys to dot-notation string literals.
// FlattenKeys<{ a: { b: string }, c: string }> = "a.b" | "c"
type FlattenKeys<T, Prefix extends string = ""> = {
  [K in Extract<keyof T, string>]: T[K] extends Record<string, unknown>
    ? FlattenKeys<T[K], `${Prefix}${K}.`>
    : `${Prefix}${K}`;
}[Extract<keyof T, string>];
