# @domphy/doctor

## 0.18.1

- Add built-in rule `tone-background-inherit`: warns when `style.backgroundColor` resolves to a fixed shifted tone (var(--X-N) with N > 0) at base context instead of `themeColor(l, "inherit")`. Detected by running the reactive function with a no-op listener. Use `dataTone` on the container to shift the surface tone instead of hardcoding a tone in `backgroundColor`.

## 0.9.0

- Initial release: `diagnose(element)` static analyzer for Domphy element trees — flags inline typography, void-tag content, missing `_key` on dynamic lists, and unknown tags. `format()` for readable reports.
