# @domphy/theme

Context-aware color, size, and spacing for Domphy. WCAG 4.5:1 contrast is guaranteed by palette structure — no runtime contrast checks, no token memorization.

```bash
npm install @domphy/theme
```

## Setup

Call once on mount. Injects CSS variables for all registered themes into `<head>`.

```ts
import { themeApply } from "@domphy/theme"

themeApply()
```

Then set `dataTheme` on any element. Children inherit it automatically — no providers needed.

```ts
{ div: [App], dataTheme: "light" }  // or "dark" — both built in
```

## Color

`themeColor(listener, tone, color?)` resolves a color CSS variable from the element's DOM context. Any two tones 6 steps apart pass WCAG 4.5:1.

```ts
import { themeColor } from "@domphy/theme"

style: {
  backgroundColor: (l) => themeColor(l, "inherit", "primary"),
  color:           (l) => themeColor(l, "shift-6", "primary"),  // guaranteed contrast
  outline:         (l) => `1px solid ${themeColor(l, "shift-3", "primary")}`,
  "&:hover": {
    backgroundColor: (l) => themeColor(l, "increase-1", "primary"),
  },
}
```

## Spacing

`themeSpacing(n)` returns `n × (fontSize / 4)` in em — equivalent to the 4pt grid at standard size, scales automatically with font size.

```ts
import { themeSpacing } from "@domphy/theme"

style: {
  padding:      `${themeSpacing(1)} ${themeSpacing(3)}`,  // 4px 12px at 16px base
  borderRadius: themeSpacing(2),                          // 8px
}
```

## Font Size

`themeSize(listener, key)` resolves a font size from the element's `dataSize` context. Set `dataSize` on a parent; all children scale automatically.

```ts
import { themeSize } from "@domphy/theme"

style: {
  fontSize: (l) => themeSize(l, "inherit"),    // current context size
  fontSize: (l) => themeSize(l, "increase-1"), // one step larger
}
```

## Custom theme

```ts
import { setTheme, createDark, getTheme, themeApply } from "@domphy/theme"

setTheme("brand", {
  colors: {
    primary: ["#fff", "#eef2ff", "#c7d2fe", "#a5b4fc", "#818cf8",
              "#6366f1", "#4f46e5", "#4338ca", "#3730a3", "#312e81", "#1e1b4b", "#000"],
  },
  baseTones: { primary: 5 }
})
setTheme("brand-dark", createDark(getTheme("brand")))
themeApply()
```

---

**[Full documentation →](https://domphy.dev/theme/)**
