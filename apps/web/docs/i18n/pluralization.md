---
title: "Pluralization"
description: "Plural forms, ordinals, and locale-aware count formatting."
---

# Pluralization

## Basic plural forms

Pass the `count` interpolation variable — `@domphy/i18n` maps it to the correct plural form for the active locale:

```ts
// translations/en.json
{
  "items": "{{count}} item",
  "items_other": "{{count}} items",
  "notifications": "{{count}} notification",
  "notifications_other": "{{count}} notifications"
}
```

```ts
import { createI18n } from "@domphy/i18n"
import en from "./translations/en.json"

const { t } = createI18n<"en", typeof en>({
  globalKey: "__myapp__",
  namespace: "app",
  locales: { en },
  defaultLocale: "en",
})

// Usage
t("items", { count: 1 })    // "1 item"
t("items", { count: 5 })    // "5 items"
t("items", { count: 0 })    // "0 items"
```

## Plural key suffixes

Different locales use different numbers of plural forms. The `count` variable selects the right key:

| Suffix | Used when |
|--------|-----------|
| `_zero` | count = 0 (Arabic, Czech, etc.) |
| `_one` | count = 1 (English, German, etc.) |
| `_two` | count = 2 (Arabic, Hebrew) |
| `_few` | count = 3–4 (Slavic languages) |
| `_many` | large numbers (Russian, Polish) |
| `_other` | default / fallback |

English only needs `_one` and `_other`:

```json
{
  "apples_one":   "{{count}} apple",
  "apples_other": "{{count}} apples"
}
```

Russian needs four forms:

```json
{
  "apples_one":   "{{count}} яблоко",
  "apples_few":   "{{count}} яблока",
  "apples_many":  "{{count}} яблок",
  "apples_other": "{{count}} яблока"
}
```

`@domphy/i18n` uses the CLDR plural rules for each locale — you do not need to implement the rules yourself.

## Zero state

Show a special message when count is zero:

```json
{
  "files_zero":  "No files",
  "files_one":   "{{count}} file",
  "files_other": "{{count}} files"
}
```

```ts
t("files", { count: 0 })   // "No files"
t("files", { count: 1 })   // "1 file"
t("files", { count: 99 })  // "99 files"
```

## Ordinals

For ordinal numbers ("1st", "2nd", "3rd"), use the `ordinal: true` option:

```json
{
  "rank_one":   "{{count}}st",
  "rank_two":   "{{count}}nd",
  "rank_few":   "{{count}}rd",
  "rank_other": "{{count}}th"
}
```

```ts
t("rank", { count: 1, ordinal: true })   // "1st"
t("rank", { count: 2, ordinal: true })   // "2nd"
t("rank", { count: 3, ordinal: true })   // "3rd"
t("rank", { count: 11, ordinal: true })  // "11th"
```

## Combining plural with other interpolation

```json
{
  "userFiles_one":   "{{user}} has {{count}} file",
  "userFiles_other": "{{user}} has {{count}} files"
}
```

```ts
t("userFiles", { count: 3, user: "Alice" })   // "Alice has 3 files"
```

## Reactive pluralization

Plurals update reactively when `count` state changes:

```ts
import { toState } from "@domphy/core"

const itemCount = toState(0)

const Counter = {
  div: [
    { button: "−", onClick: () => itemCount.set((n) => Math.max(0, n - 1)) },
    { span: (l) => t("items", { count: itemCount.get(l) }) },
    { button: "+", onClick: () => itemCount.set((n) => n + 1) },
  ],
}
```

## `Intl.PluralRules` directly

For edge cases, use the browser's built-in `Intl.PluralRules`:

```ts
const pr = new Intl.PluralRules("en")
pr.select(0)   // "other"
pr.select(1)   // "one"
pr.select(2)   // "other"

const prRu = new Intl.PluralRules("ru")
prRu.select(1)    // "one"   → яблоко
prRu.select(3)    // "few"   → яблока
prRu.select(11)   // "many"  → яблок
```
