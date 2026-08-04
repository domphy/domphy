import { type DomphyElement, toState } from "@domphy/core";
import { createI18n } from "@domphy/i18n";
import { themeColor, themeSpacing } from "@domphy/theme";
import { buttonGhost, heading, paragraph, row, small, stack } from "@domphy/ui";

const en = {
  title: "Reactive translations",
  greeting: "Hello, {{name}}!",
  items: "{{count}} item",
  items_other: "{{count}} items",
  hint: "t(listener, key) re-renders on setLocale() — no manual subscription.",
} as const;
const vi = {
  title: "Bản dịch phản ứng",
  greeting: "Xin chào, {{name}}!",
  items: "{{count}} món",
  items_other: "{{count}} món",
  hint: "t(listener, key) tự render lại khi setLocale() — không cần subscribe tay.",
};

const i18n = createI18n<"en" | "vi", typeof en>({
  globalKey: "__domphy_playground_i18n_demo__",
  namespace: "demo",
  defaultLocale: "en",
  locales: { en, vi },
});
void i18n.initI18n();

const count = toState(1);

const App: DomphyElement<"div"> = {
  div: [
    { h2: (l) => i18n.t(l, "title"), $: [heading()] },
    {
      div: (["en", "vi"] as const).map(
        (locale): DomphyElement<"button"> => ({
          button: locale,
          $: [buttonGhost()],
          onClick: () => void i18n.setLocale(locale),
          ariaPressed: (l) => i18n.locale.get(l) === locale,
          style: {
            color: (l) => themeColor(l, "shift-9"),
            outline: (l) =>
              i18n.locale.get(l) === locale
                ? `2px solid ${themeColor(l, "shift-9", "primary")}`
                : "none",
          },
        }),
      ),
      $: [row()],
    },
    { p: (l) => i18n.t(l, "greeting", { name: "Domphy" }), $: [paragraph()] },
    {
      div: [
        {
          button: "−",
          $: [buttonGhost()],
          onClick: () => count.set(Math.max(0, count.get() - 1)),
          ariaLabel: "Decrement",
        },
        {
          p: (l) => i18n.t(l, "items", { count: count.get(l) }),
          $: [paragraph()],
        },
        {
          button: "+",
          $: [buttonGhost()],
          onClick: () => count.set(count.get() + 1),
          ariaLabel: "Increment",
        },
      ],
      $: [row()],
    },
    { small: (l) => i18n.t(l, "hint"), $: [small()] },
  ],
  $: [stack()],
  style: { padding: themeSpacing(2) },
};

export default App;
