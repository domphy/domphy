---
title: "Interpolation & Formatting"
description: "Variable substitution, date/number/currency formatting, and rich text interpolation."
---

# Interpolation & Formatting

## Basic interpolation

Pass values as the second argument to `t()`:

```ts
// translations/en.json
{
  "greeting": "Hello, {{name}}!",
  "itemsLeft": "{{count}} items left",
  "welcomeBack": "Welcome back, {{firstName}} {{lastName}}"
}
```

```ts
t("greeting", { name: "Alice" })            // "Hello, Alice!"
t("itemsLeft", { count: 3 })                // "3 items left"
t("welcomeBack", { firstName: "John", lastName: "Doe" })
```

## Nested key access

Use dot notation for nested translation keys:

```json
{
  "profile": {
    "title": "Your Profile",
    "bio": "Tell us about {{name}}"
  }
}
```

```ts
t("profile.title")               // "Your Profile"
t("profile.bio", { name: "you" })  // "Tell us about you"
```

## Number formatting

Use `Intl.NumberFormat` for locale-aware numbers — pass the formatted string as an interpolation value:

```ts
function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value)
}

// In component
{ span: (l) => t("price", { amount: formatNumber(1234567.89, locale.get(l)) }) }
// en-US: "Price: 1,234,567.89"
// de-DE: "Price: 1.234.567,89"
```

Or format before passing to `t()`:

```ts
// In translations: { "price": "Price: {{amount}}" }
const { t, getLocale } = i18n

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(getLocale(), { style: "currency", currency: "USD" }).format(value)
}

{ span: (l) => t(l, "price", { amount: formatCurrency(42.5) }) }
// "Price: $42.50"
```

## Date formatting

Format dates before passing as interpolation values:

```ts
const { t, getLocale } = i18n

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium" }).format(value)
}

// { "lastSeen": "Last seen {{date}}" }
{ span: (l) => t(l, "lastSeen", { date: formatDate(new Date("2025-06-26")) }) }
// "Last seen Jun 26, 2025"
```

// { "lastSeen": "Last seen {{date, date}}" }
t("lastSeen", { date: "2025-06-26" })   // "Last seen Jun 26, 2025"
```

## Relative time

Use `Intl.RelativeTimeFormat` for "2 hours ago", "in 3 days":

```ts
function relativeTime(date: Date, locale: string): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })

  if (Math.abs(seconds) < 60)   return rtf.format(-Math.round(seconds), "second")
  if (Math.abs(seconds) < 3600) return rtf.format(-Math.round(seconds / 60), "minute")
  if (Math.abs(seconds) < 86400) return rtf.format(-Math.round(seconds / 3600), "hour")
  return rtf.format(-Math.round(seconds / 86400), "day")
}

const Timestamp = (date: Date) => ({
  time: (l) => relativeTime(date, locale.get(l)),
  dateTime: date.toISOString(),
})
```

## Escaping

Use `{{- variable}}` (with dash) to disable HTML escaping for safe HTML in translations:

```json
{
  "linkText": "Read the <a href='{{url}}'>docs</a>",
  "escaped": "Use &lt;div&gt; tags"
}
```

```ts
t("linkText", { url: "https://domphy.com", interpolation: { escapeValue: false } })
```

> Only disable escaping for translations you control — never for user-supplied content.

## Context (gender / form variants)

Use `context` to select a translation variant based on gender or other categorical data:

```json
{
  "greeting_male":   "He joined",
  "greeting_female": "She joined",
  "greeting":        "They joined"
}
```

```ts
t("greeting", { context: "male" })    // "He joined"
t("greeting", { context: "female" })  // "She joined"
t("greeting")                          // "They joined" (default)
```

## Combining context and count

```json
{
  "items_male_one":     "{{name}} has {{count}} item",
  "items_male_other":   "{{name}} has {{count}} items",
  "items_female_one":   "{{name}} has {{count}} item",
  "items_female_other": "{{name}} has {{count}} items"
}
```

```ts
t("items", { count: 2, context: "female", name: "Alice" })
// "Alice has 2 items"
```

## Default values

Provide a fallback if a key is missing (useful during development):

```ts
t("missing.key", { defaultValue: "Fallback text" })
```

## Typed interpolation

Use the `t` function returned from `createI18n` — its key type is inferred from the messages generic:

```ts
const { t } = createI18n<"en", typeof en>({ ... })

// t("greeting", { name: "Alice" }) — key and interpolation vars are type-checked
const greeting = t("greeting", { name: "Alice" })
```
