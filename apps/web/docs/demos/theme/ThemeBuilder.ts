import {
  computed,
  type DomphyElement,
  type Listener,
  RecordState,
  toState,
} from "@domphy/core";
import {
  COLOR_ROLES,
  type ColorRole,
  type GenerateThemeOptions,
  generateTheme,
  getTheme,
  type PartialThemeInput,
  setTheme,
  themeApply,
  themeColor,
  themeDensity,
  themeSpacing,
} from "@domphy/theme";
import {
  abbreviation,
  accordion,
  alert,
  avatar,
  badge,
  blockquote,
  button,
  buttonGhost,
  card,
  code,
  descriptionList,
  details,
  divider,
  emphasis,
  fab,
  formGroup,
  heading,
  horizontalRule,
  inputCheckbox,
  inputColor,
  inputFile,
  inputNumber,
  inputPassword,
  inputRadio,
  inputRange,
  inputSearch,
  inputSwitch,
  inputText,
  keyboard,
  label,
  link,
  linkButton,
  list,
  mark,
  pagination,
  paragraph,
  preformated,
  progress,
  ringProgress,
  segmented,
  select,
  skeleton,
  small,
  spinner,
  steps,
  strong,
  table,
  tabs,
  tag,
  toggleGroup,
} from "@domphy/ui";

// Live demo of generateTheme()/generateRamp() (@domphy/palette, @domphy/theme —
// see DESIGN.md at the repo root for the math). Every control in the sidebar
// drives a real setTheme()+themeApply() call, scoped to its own theme name so
// it never touches the page's own light/dark theme. The gallery on the right
// renders real @domphy/ui patches so a color/density change is judged against
// actual components, not just swatches.

const THEME_NAME = "theme-builder-preview";

const ROLES = COLOR_ROLES;
type Role = ColorRole;

const DEFAULT_FONT_SIZES = [
  "0.75rem",
  "0.875rem",
  "1rem",
  "1.25rem",
  "1.5625rem",
  "1.9375rem",
  "2.4375rem",
  "3.0625rem",
];
const DEFAULT_DENSITIES = [0.75, 1, 1.5, 2, 2.5];

function defaultColors(): Record<Role, string> {
  const light = getTheme("light");
  const result = {} as Record<Role, string>;
  for (const role of ROLES)
    result[role] = light.colors[role][light.baseTones[role]];
  return result;
}

// --- State --------------------------------------------------------------

const baseColors = new RecordState<Record<Role, string>>(defaultColors());
const fontSizes = toState<string[]>([...DEFAULT_FONT_SIZES]);
const densities = toState<number[]>([...DEFAULT_DENSITIES]);
const activeTab = toState<"colors" | "size">("colors");
const previewThemeName = toState<"light" | typeof THEME_NAME>(THEME_NAME);
const exportJSON = toState("");
const generatedTheme = toState<PartialThemeInput | null>(null);

function regenerate(): void {
  const colors = ROLES.reduce(
    (acc, role) => {
      acc[role] = baseColors.get(role);
      return acc;
    },
    {} as Record<Role, string>,
  );
  const options: GenerateThemeOptions = {
    fontSizes: fontSizes.get(),
    densities: densities.get(),
  };
  const theme = generateTheme(colors, options);
  setTheme(THEME_NAME, theme);
  themeApply();
  generatedTheme.set(theme);
  exportJSON.set(JSON.stringify(theme, null, 2));
}

regenerate();

// --- Sidebar: color tab --------------------------------------------------

function colorPicker(role: Role): DomphyElement<"label"> {
  return {
    label: [
      {
        small: role,
        $: [small()],
        style: { display: "block", marginBottom: themeSpacing(1) },
      } as DomphyElement<"small">,
      {
        div: [
          {
            input: null,
            type: "color",
            value: (l: Listener) => baseColors.get(role, l),
            onInput: (e) => {
              const value = (e.target as HTMLInputElement).value;
              baseColors.set(role, value);
              regenerate();
            },
            style: {
              width: themeSpacing(9),
              height: themeSpacing(9),
              padding: 0,
              border: "none",
              borderRadius: (l: Listener) => themeSpacing(themeDensity(l)),
              cursor: "pointer",
            },
          } as DomphyElement<"input">,
          {
            code: (l: Listener) => baseColors.get(role, l),
            style: { display: "inline-flex", alignItems: "center" },
          } as DomphyElement<"code">,
        ],
        style: { display: "flex", alignItems: "center", gap: themeSpacing(2) },
      },
    ],
    style: { display: "block", marginBottom: themeSpacing(3) },
  };
}

function colorsTab(): DomphyElement<"div"> {
  return { div: ROLES.map(colorPicker), _key: "colors-tab" };
}

// --- Sidebar: size & density tab -----------------------------------------

function fontSizeField(index: number): DomphyElement<"label"> {
  return {
    label: [
      {
        small: `fontSize ${index}`,
        $: [small()],
        style: { display: "block", marginBottom: themeSpacing(1) },
      } as DomphyElement<"small">,
      {
        input: null,
        type: "text",
        value: (l: Listener) => fontSizes.get(l)[index],
        onInput: (e) => {
          const next = [...fontSizes.get()];
          next[index] = (e.target as HTMLInputElement).value;
          fontSizes.set(next);
          regenerate();
        },
        $: [inputText()],
      } as DomphyElement<"input">,
    ],
    style: { display: "block", marginBottom: themeSpacing(3) },
  };
}

function densityField(index: number): DomphyElement<"label"> {
  return {
    label: [
      {
        small: `density ${index}`,
        $: [small()],
        style: { display: "block", marginBottom: themeSpacing(1) },
      } as DomphyElement<"small">,
      {
        input: null,
        type: "number",
        step: "0.05",
        min: "0.25",
        value: (l: Listener) => String(densities.get(l)[index]),
        onInput: (e) => {
          const parsed = Number((e.target as HTMLInputElement).value);
          if (!Number.isFinite(parsed)) return;
          const next = [...densities.get()];
          next[index] = parsed;
          densities.set(next);
          regenerate();
        },
        $: [inputNumber()],
      } as DomphyElement<"input">,
    ],
    style: { display: "block", marginBottom: themeSpacing(3) },
  };
}

function sizeTab(): DomphyElement<"div"> {
  return {
    div: [
      {
        small: "Font sizes (0 = smallest .. 7 = largest)",
        $: [small()],
        style: { display: "block", marginBottom: themeSpacing(2) },
      } as DomphyElement<"small">,
      { div: DEFAULT_FONT_SIZES.map((_, i) => fontSizeField(i)) },
      {
        small: "Density steps (0 = compact .. 4 = spacious)",
        $: [small()],
        style: {
          display: "block",
          marginTop: themeSpacing(4),
          marginBottom: themeSpacing(2),
        },
      } as DomphyElement<"small">,
      { div: DEFAULT_DENSITIES.map((_, i) => densityField(i)) },
    ],
    _key: "size-tab",
  };
}

// --- Sidebar shell ---------------------------------------------------------

function tabButton(
  key: "colors" | "size",
  label_: string,
): DomphyElement<"button"> {
  const color = computed<Role>(() =>
    activeTab.get() === key ? "primary" : "neutral",
  );
  return {
    button: label_,
    onClick: () => activeTab.set(key),
    $: [buttonGhost({ color })],
    style: {
      flex: "1",
      fontWeight: (l: Listener) => (activeTab.get(l) === key ? "600" : "400"),
    },
  };
}

function themeSwitcher(): DomphyElement<"label"> {
  return {
    label: [
      {
        small: "Preview theme",
        $: [small()],
        style: { display: "block", marginBottom: themeSpacing(1) },
      } as DomphyElement<"small">,
      {
        select: [{ option: "Generated (brand)" }, { option: "Built-in light" }],
        value: (l: Listener) =>
          previewThemeName.get(l) === THEME_NAME
            ? "Generated (brand)"
            : "Built-in light",
        onInput: (e) => {
          const value = (e.target as HTMLSelectElement).value;
          previewThemeName.set(
            value === "Built-in light" ? "light" : THEME_NAME,
          );
        },
        $: [select()],
      } as DomphyElement<"select">,
    ],
    style: { display: "block", marginBottom: themeSpacing(4) },
  };
}

function sidebar(): DomphyElement<"aside"> {
  return {
    aside: [
      { h3: "Theme Builder", $: [heading()] },
      {
        p: "One base color per role, plus size/density. Every ramp is generated live by generateTheme() — see DESIGN.md for the math.",
        $: [paragraph()],
        style: { marginBottom: themeSpacing(4) },
      },
      themeSwitcher(),
      {
        div: [
          tabButton("colors", "Colors"),
          tabButton("size", "Size & Density"),
        ],
        style: {
          display: "flex",
          gap: themeSpacing(1),
          marginBottom: themeSpacing(4),
        },
      },
      {
        div: (l: Listener) =>
          activeTab.get(l) === "colors" ? [colorsTab()] : [sizeTab()],
      } as DomphyElement<"div">,
    ],
    style: {
      width: themeSpacing(72),
      flexShrink: "0",
      position: "sticky",
      top: themeSpacing(4),
      alignSelf: "flex-start",
      maxHeight: "calc(100vh - 2rem)",
      overflowY: "auto",
      paddingRight: themeSpacing(4),
    },
  };
}

// --- Gallery -----------------------------------------------------------

function section(
  title: string,
  items: DomphyElement[],
): DomphyElement<"section"> {
  return {
    section: [
      { h4: title, $: [heading()] },
      {
        div: items,
        style: {
          display: "flex",
          gap: themeSpacing(3),
          alignItems: "center",
          flexWrap: "wrap" as const,
        },
      },
    ],
    style: { marginBottom: themeSpacing(6) },
  };
}

function typographyGallery(): DomphyElement<"section"> {
  return section("Typography", [
    {
      p: "Body paragraph text at shift-9.",
      $: [paragraph()],
    } as DomphyElement<"p">,
    {
      small: "Small / secondary caption text",
      $: [small()],
    } as DomphyElement<"small">,
    { strong: "Bold emphasis", $: [strong()] } as DomphyElement<"strong">,
    { em: "Italic emphasis", $: [emphasis()] } as DomphyElement<"em">,
    { mark: "Highlighted text", $: [mark()] } as DomphyElement<"mark">,
    {
      blockquote: "Design is how it works.",
      $: [blockquote({ color: "primary" })],
      style: { color: (l: Listener) => themeColor(l, "shift-9", "primary") },
    } as DomphyElement<"blockquote">,
    { code: "npm install @domphy/ui", $: [code()] } as DomphyElement<"code">,
    { kbd: "Ctrl", $: [keyboard()] } as DomphyElement<"kbd">,
    {
      a: "domphy.com",
      href: "#",
      onClick: (e: Event) => e.preventDefault(),
      $: [link()],
    } as DomphyElement<"a">,
    {
      abbr: "HTML",
      title: "HyperText Markup Language",
      $: [abbreviation({ accentColor: "primary" })],
    } as DomphyElement<"abbr">,
  ]);
}

function buttonsGallery(): DomphyElement<"section"> {
  const colors: Role[] = [
    "primary",
    "secondary",
    "success",
    "warning",
    "error",
    "danger",
    "info",
    "neutral",
  ];
  return section("Buttons & Actions", [
    ...colors.map(
      (color) =>
        ({
          button: color,
          onClick: () => {},
          $: [button({ color })],
        }) as DomphyElement<"button">,
    ),
    {
      button: "×",
      onClick: () => {},
      $: [buttonGhost()],
    } as DomphyElement<"button">,
    {
      a: "Open app",
      href: "#",
      onClick: (e: Event) => e.preventDefault(),
      $: [linkButton({ color: "primary" })],
    } as DomphyElement<"a">,
    { button: "+", onClick: () => {}, $: [fab()] } as DomphyElement<"button">,
  ]);
}

function formsGallery(): DomphyElement<"section"> {
  return section("Forms & Inputs", [
    {
      input: null,
      type: "text",
      placeholder: "Name",
      $: [inputText()],
    } as DomphyElement<"input">,
    {
      input: null,
      type: "number",
      placeholder: "18",
      $: [inputNumber()],
    } as DomphyElement<"input">,
    { div: null, $: [inputPassword()] } as DomphyElement<"div">,
    {
      input: null,
      type: "search",
      placeholder: "Search…",
      $: [inputSearch()],
    } as DomphyElement<"input">,
    {
      input: null,
      type: "checkbox",
      $: [inputCheckbox()],
      _doctorDisable: "missing-color",
    } as DomphyElement<"input">,
    {
      input: null,
      type: "radio",
      $: [inputRadio()],
      _doctorDisable: "missing-color",
    } as DomphyElement<"input">,
    {
      input: null,
      type: "checkbox",
      $: [inputSwitch()],
      _doctorDisable: "missing-color",
    } as DomphyElement<"input">,
    { input: null, type: "range", $: [inputRange()] } as DomphyElement<"input">,
    {
      input: null,
      type: "color",
      value: "#4a7ff4",
      $: [inputColor()],
      _doctorDisable: "missing-color",
    } as DomphyElement<"input">,
    { input: null, type: "file", $: [inputFile()] } as DomphyElement<"input">,
    {
      select: [{ option: "Option A" }, { option: "Option B" }],
      $: [select()],
    } as DomphyElement<"select">,
    {
      label: "Email",
      htmlFor: "tb-email",
      $: [label()],
    } as DomphyElement<"label">,
  ]);
}

function feedbackGallery(): DomphyElement<"section"> {
  return section("Feedback & Status", [
    {
      div: "Saved successfully",
      $: [alert({ color: "success" })],
    } as DomphyElement<"div">,
    {
      div: "Something needs attention",
      $: [alert({ color: "warning" })],
    } as DomphyElement<"div">,
    {
      span: "🔔",
      $: [badge({ label: 3, color: "danger" })],
    } as DomphyElement<"span">,
    { span: "Label", $: [tag({ removable: true })] } as DomphyElement<"span">,
    {
      progress: null,
      value: 40,
      max: 100,
      $: [progress()],
      _doctorDisable: "missing-color",
    } as DomphyElement<"progress">,
    {
      div: null,
      $: [ringProgress({ value: 65 })],
      _doctorDisable: "missing-color",
    } as DomphyElement<"div">,
    { span: null, $: [spinner()] } as DomphyElement<"span">,
    {
      div: null,
      $: [skeleton()],
      style: { width: themeSpacing(20), height: themeSpacing(5) },
    } as DomphyElement<"div">,
  ]);
}

function dataDisplayGallery(): DomphyElement<"section"> {
  return section("Data Display", [
    {
      div: [
        { h3: "Generated card" },
        {
          p: "Surface at shift-1, body text at shift-9 — the same tone-anchoring rule as every other Domphy surface.",
        },
      ],
      $: [card({ color: "neutral" })],
      style: { width: themeSpacing(70) },
    } as DomphyElement<"div">,
    { span: "JD", $: [avatar({ color: "primary" })] } as DomphyElement<"span">,
    {
      dl: [
        { dt: "Framework" },
        { dd: "Domphy" },
        { dt: "Generated by" },
        { dd: "generateTheme()" },
      ],
      $: [descriptionList()],
    } as DomphyElement<"dl">,
    {
      table: [
        { thead: [{ tr: [{ th: "Role" }, { th: "Base color" }] }] },
        {
          tbody: ROLES.slice(0, 4).map((role) => ({
            tr: [
              { td: role },
              { td: (l: Listener) => baseColors.get(role, l) },
            ],
          })),
        },
      ],
      $: [table()],
    } as DomphyElement<"table">,
    {
      ul: [{ li: "First item" }, { li: "Second item" }, { li: "Third item" }],
      $: [list()],
    } as DomphyElement<"ul">,
    { div: "or", $: [divider()] } as DomphyElement<"div">,
    {
      hr: null,
      $: [horizontalRule()],
      _doctorDisable: "missing-color",
    } as DomphyElement<"hr">,
  ]);
}

function navigationGallery(): DomphyElement<"section"> {
  return section("Navigation & Disclosure", [
    {
      div: null,
      $: [
        tabs({
          items: [
            { label: "Overview", content: { p: "Overview content" } },
            { label: "API", content: { p: "API content" } },
          ],
        }),
      ],
      style: { width: themeSpacing(80) },
    } as DomphyElement<"div">,
    {
      ol: null,
      $: [
        steps({
          current: 1,
          items: [
            { label: "Cart" },
            { label: "Shipping" },
            { label: "Payment" },
          ],
        }),
      ],
    } as DomphyElement<"ol">,
    {
      div: [
        {
          details: [{ summary: "Section A" }, { p: "Content A" }],
          $: [details()],
        },
        {
          details: [{ summary: "Section B" }, { p: "Content B" }],
          $: [details()],
        },
      ],
      $: [accordion()],
      style: { width: themeSpacing(70) },
      // Text color is set by the summary/p children the accordion() patch
      // renders — the outer group container itself carries no text.
      _doctorDisable: "missing-color",
    } as DomphyElement<"div">,
    {
      div: null,
      $: [
        toggleGroup({
          multiple: true,
          items: [
            { label: "Bold", key: "bold" },
            { label: "Italic", key: "italic" },
          ],
        }),
      ],
      _doctorDisable: "missing-color",
    } as DomphyElement<"div">,
    {
      div: null,
      $: [
        segmented({
          items: [
            { label: "Day", key: "day" },
            { label: "Month", key: "month" },
            { label: "Year", key: "year" },
          ],
        }),
      ],
      _doctorDisable: "missing-color",
    } as DomphyElement<"div">,
    {
      div: "",
      $: [pagination({ total: 10, value: 1 })],
    } as DomphyElement<"div">,
  ]);
}

function swatchRow(role: Role): DomphyElement<"div"> {
  return {
    div: [
      {
        small: role,
        $: [small()],
        style: { display: "inline-block", minWidth: themeSpacing(21) },
      } as DomphyElement<"small">,
      {
        div: Array.from({ length: 18 }, (_, i) => ({
          div: "",
          // Decorative color swatch, no text content — "missing-color" would
          // otherwise ask for a color that has nothing to apply to.
          _doctorDisable: "missing-color",
          style: {
            backgroundColor: `var(--${role}-${i})`,
            width: themeSpacing(8),
            height: themeSpacing(8),
            flexShrink: "0",
          },
          title: `--${role}-${i}`,
        })),
        style: { display: "flex" },
      },
    ],
    style: {
      display: "flex",
      alignItems: "center",
      gap: themeSpacing(2),
      marginBottom: themeSpacing(1),
    },
  };
}

function ramps(): DomphyElement<"section"> {
  return {
    section: [
      { h4: "Generated ramps", $: [heading()] },
      { div: ROLES.map(swatchRow) },
    ],
    style: { marginBottom: themeSpacing(6) },
  };
}

function exportPanel(): DomphyElement<"section"> {
  return {
    section: [
      { h4: "Export", $: [heading()] },
      {
        p: "The ThemeInput JSON below is exactly what setTheme(name, json) accepts.",
        $: [paragraph()],
      },
      {
        pre: [{ code: (l: Listener) => exportJSON.get(l) }],
        $: [preformated()],
        style: {
          whiteSpace: "pre-wrap" as const,
          overflowX: "auto" as const,
          maxHeight: themeSpacing(80),
          overflowY: "auto" as const,
        },
      } as DomphyElement<"pre">,
    ],
    style: { marginBottom: themeSpacing(6) },
  };
}

function gallery(): DomphyElement<"div"> {
  return {
    div: [
      ramps(),
      typographyGallery(),
      buttonsGallery(),
      formsGallery(),
      feedbackGallery(),
      dataDisplayGallery(),
      navigationGallery(),
      exportPanel(),
    ],
    dataTheme: (l: Listener) => previewThemeName.get(l),
    style: { flex: "1", minWidth: "0" },
  };
}

const App: DomphyElement<"div"> = {
  div: [sidebar(), gallery()],
  style: {
    display: "flex",
    gap: themeSpacing(6),
    padding: themeSpacing(4),
    alignItems: "flex-start",
  },
};

export default App;
