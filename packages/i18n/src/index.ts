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

declare const process: { env: Record<string, string | undefined> } | undefined;

// Dev-only warning guard, same pattern as @domphy/core's dev.ts: bundlers
// statically replace `process.env.NODE_ENV`, so production builds fold this to
// `false` and tree-shake the guarded warnings; the `typeof process` check keeps
// process-less runtimes from throwing at load time.
const __DEV__: boolean =
  typeof process !== "undefined" &&
  process.env != null &&
  process.env.NODE_ENV !== "production";

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
  /** i18next interpolation options. `escapeValue` defaults to `true` (i18next's own safe default); pass `false` to opt out globally. */
  interpolation?: { escapeValue?: boolean };
}

export interface I18nInstance<TKey extends string, TLocale extends string> {
  /** Static call: t("key") — no reactivity. */
  t(key: TKey, options?: Record<string, unknown>): string;
  /** Reactive call: t(listener, "key") — Domphy re-renders on setLocale(). */
  t(listener: Listener, key: TKey, options?: Record<string, unknown>): string;
  /** Reactive locale state — subscribe in Domphy render functions. */
  locale: ReturnType<typeof toState<TLocale>>;
  /** Reactive read of the current locale code. Sugar for locale.get(listener). */
  currentLocale(listener: Listener): TLocale;
  /** Returns true if the key exists in the active locale's translations. */
  exists(key: TKey): boolean;
  initI18n(locale?: TLocale): Promise<void>;
  setLocale(locale: TLocale): Promise<void>;
  getLocale(): TLocale;
  detectLocale(options?: DetectOptions): TLocale;
}

interface Store<TLocale extends string> {
  instance: i18n;
  localeState: ReturnType<typeof toState<TLocale>>;
  initialized: boolean;
  // Fingerprint of the createI18n() options that created this store
  // (namespace + sorted locale codes + defaultLocale + escapeValue). A second
  // createI18n() with the same globalKey but different options silently
  // reuses this store — the fingerprint lets us warn about that in dev.
  fingerprint: string;
  // Dev warn-once flags (see __DEV__ above).
  mismatchWarned?: boolean;
  tBeforeInitWarned?: boolean;
  // In-flight init() promise — lets concurrent initI18n()/setLocale() calls
  // await the same init instead of racing store.initialized.
  initPromise?: Promise<void>;
}

function getOrCreateStore<TLocale extends string>(
  globalKey: string,
  defaultLocale: TLocale,
  fingerprint: string,
): Store<TLocale> {
  const g = globalThis as unknown as Record<string, Store<TLocale> | undefined>;
  let store = g[globalKey];
  if (!store) {
    store = {
      instance: createInstance(),
      localeState: toState<TLocale>(defaultLocale),
      initialized: false,
      fingerprint,
    };
    g[globalKey] = store;
  } else if (
    __DEV__ &&
    store.fingerprint !== fingerprint &&
    !store.mismatchWarned
  ) {
    store.mismatchWarned = true;
    console.warn(
      `[@domphy/i18n] createI18n() reused globalKey "${globalKey}" with different locales/namespace/defaultLocale. ` +
        `The FIRST createI18n() call's options win and the new ones are silently ignored. ` +
        `Use a distinct globalKey per app, or align the options across call sites.`,
    );
  }
  return store;
}

export function createI18n<
  TLocale extends string,
  TMessages extends Record<string, unknown> = Record<string, unknown>,
>(
  options: CreateI18nOptions<TLocale>,
): I18nInstance<Extract<FlattenKeys<TMessages>, string>, TLocale> {
  const { globalKey, namespace, locales, defaultLocale, interpolation } =
    options;
  const localeKeys = new Set(Object.keys(locales));

  const resources = Object.fromEntries(
    Object.entries(locales).map(([locale, messages]) => [
      locale,
      { [namespace]: messages },
    ]),
  ) as Record<TLocale, Record<string, Record<string, unknown>>>;

  // Stable fingerprint of the options that own the store — compared when a
  // second createI18n() reuses the same globalKey (see getOrCreateStore).
  // escapeValue is included: a reuse with the opposite XSS-escaping posture
  // must not pass silently. (Message CONTENT is not fingerprinted — too
  // expensive; the mismatch warning covers the structural options only.)
  const fingerprint = JSON.stringify([
    namespace,
    [...localeKeys].sort(),
    defaultLocale,
    interpolation?.escapeValue ?? true,
  ]);

  function getStore() {
    return getOrCreateStore<TLocale>(globalKey, defaultLocale, fingerprint);
  }

  // Resolve the store eagerly so a globalKey/options mismatch warns here — at
  // the createI18n() call that caused it — instead of on first use.
  getStore();

  async function initI18n(locale: TLocale = defaultLocale): Promise<void> {
    const store = getStore();
    if (store.initialized) {
      await setLocale(locale);
      return;
    }
    // Await the in-flight init instead of starting a second one — otherwise a
    // concurrent call could flip store.initialized early and clobber locale.
    if (store.initPromise) {
      await store.initPromise;
      return setLocale(locale);
    }
    store.initPromise = store.instance
      .init({
        lng: locale,
        fallbackLng: defaultLocale,
        defaultNS: namespace,
        ns: [namespace],
        interpolation: { escapeValue: true, ...interpolation },
        resources,
        // initAsync:false keeps init() synchronous with inline resources —
        // renamed from initImmediate in i18next v24, removed in v26.
        initAsync: false,
      })
      .then(() => {
        store.initialized = true;
        // Clear the in-flight handle on success: later calls short-circuit on
        // store.initialized, and a stale resolved promise must not pin the
        // init closure (or be re-awaitable as if init were still pending).
        store.initPromise = undefined;
        store.localeState.set(locale);
      })
      .catch((error) => {
        store.initPromise = undefined;
        throw error;
      });
    await store.initPromise;
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
    return (localeKeys.has(lang) ? lang : defaultLocale) as TLocale;
  }

  function detectLocale(opts: DetectOptions = {}): TLocale {
    const { storageKey, pathSegment = true } = opts;
    if (pathSegment) {
      try {
        const seg = location.pathname.split("/")[1];
        if (seg && localeKeys.has(seg)) return seg as TLocale;
      } catch {
        /* SSR */
      }
    }
    if (storageKey) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored && localeKeys.has(stored)) return stored as TLocale;
      } catch {
        /* SSR / private mode */
      }
    }
    return defaultLocale;
  }

  function t(
    a: Extract<FlattenKeys<TMessages>, string> | Listener,
    b?: Extract<FlattenKeys<TMessages>, string> | Record<string, unknown>,
    c?: Record<string, unknown>,
  ): string {
    const store = getStore();
    if (__DEV__ && !store.initialized && !store.tBeforeInitWarned) {
      store.tBeforeInitWarned = true;
      console.warn(
        `[@domphy/i18n] t() was called before initI18n() resolved — i18next cannot translate yet and returns an untranslated value. ` +
          `Call initI18n() during app startup (globalKey: "${globalKey}").`,
      );
    }
    if (typeof a === "function") {
      store.localeState.get(a as Listener);
      return store.instance.t(b as string, c) as string;
    }
    return store.instance.t(
      a as string,
      b as Record<string, unknown> | undefined,
    ) as string;
  }

  function currentLocale(listener: Listener): TLocale {
    return getStore().localeState.get(listener) as TLocale;
  }

  function exists(key: string): boolean {
    return getStore().instance.exists(key);
  }

  return {
    t,
    get locale() {
      return getStore().localeState;
    },
    currentLocale,
    exists,
    initI18n,
    setLocale,
    getLocale,
    detectLocale,
  } as I18nInstance<Extract<FlattenKeys<TMessages>, string>, TLocale>;
}

// Utility: flatten nested object keys to dot-notation string literals.
// FlattenKeys<{ a: { b: string }, c: string }> = "a.b" | "c"
//
// i18next v4 plural suffixes: t("item", { count: 2 }) resolves against the
// "item_one"/"item_other"/... leaf keys, so the BASE key is a valid call even
// though it never appears as a leaf in the messages object. WithPluralBase
// adds it to the union (additive only — a false positive like "phone_one"
// merely also admits "phone", which fails harmlessly at runtime).
type PluralSuffix = "_zero" | "_one" | "_two" | "_few" | "_many" | "_other";
type WithPluralBase<K extends string> = K extends `${infer Base}${PluralSuffix}`
  ? Base | K
  : K;
type FlattenKeys<T, Prefix extends string = ""> = {
  [K in Extract<keyof T, string>]: T[K] extends Record<string, unknown>
    ? FlattenKeys<T[K], `${Prefix}${K}.`>
    : WithPluralBase<`${Prefix}${K}`>;
}[Extract<keyof T, string>];
