<script setup lang="ts">

import DatePicker from "../../demos/patches/DatePicker.ts?raw"
</script>

# Date Picker

The `datePicker` patch turns a native `<input>` into a calendar date picker — single date, date range, or date + time. The calendar is rendered entirely with Domphy elements (no third-party calendar library), positioned with `@domphy/floating`, themed via the theme tokens, and keyboard accessible. Compose it with `inputText()` for the input's look.

The calendar popup carries a `"border-strong"` border, density-scaled radius, and a medium `elevation()` box-shadow.

<CodeEditor :code="DatePicker" />

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `ValueOrState<DatePickerValue>` | `null` / `[null, null]` | Controlled selection. A `Date` in single mode, a `[start, end]` tuple in range mode. `DatePickerValue = Date \| null \| [Date \| null, Date \| null]` |
| `mode` | `"single" \| "range"` | `"single"` | Selection mode. |
| `time` | `boolean` | `false` | Also pick hour + minute (applied to the selected date(s)). |
| `min` / `max` | `Date` | — | Clamp the selectable range. |
| `disabledDate` | `(date: Date) => boolean` | — | Disable arbitrary days. |
| `locale` | `string` | runtime locale | Drives month/weekday names, first-day-of-week, and formatting (`Intl`). |
| `weekStartsOn` | `0..6` | from locale | Override the first day of the week (0 = Sunday). |
| `format` | `(value) => string` | `Intl` medium | Override the input display string. |
| `onChange` | `(value) => void` | — | Called whenever the selection changes. |
| `accentColor` | `ValueOrState<ThemeColor>` | `"primary"` | Accent for selected/active days. |
| `placement` | `ValueOrState<Placement>` | `"bottom-start"` | Popover placement relative to the input. |

## Notes

- The input is **read-only** and shows the formatted selection; the calendar opens on click / focus / `ArrowDown` / `Enter`.
- **Keyboard:** arrow keys move day-by-day, `Home`/`End` jump to week edges, `PageUp`/`PageDown` change month (`Shift` = year), `Enter`/`Space` select, `Esc` closes.
- In range mode the in-between days are highlighted, with a live preview while choosing the second endpoint.
- In time mode the chosen hour/minute apply to both endpoints of a range (shared time).
- Zero third-party runtime dependency — date math is native `Date` + `Intl`.

::: code-group
<<< ../../../../../packages/ui/src/patches/datePicker.ts [datePicker]
:::
