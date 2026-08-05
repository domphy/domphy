import {
  type DomphyElement,
  type Listener,
  RecordState,
  toState,
} from "@domphy/core";
import { isValidHex, normalizeHex } from "@domphy/palette";
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
  themeSpacing,
} from "@domphy/theme";
import {
  accordion,
  alert,
  avatar,
  badge,
  blockquote,
  button,
  buttonGhost,
  card,
  code,
  details,
  dialog,
  divider,
  emphasis,
  fab,
  grid,
  heading,
  inputCheckbox,
  inputNumber,
  inputPassword,
  inputRadio,
  inputRange,
  inputSearch,
  inputSwitch,
  inputText,
  keyboard,
  link,
  linkButton,
  list,
  mark,
  pagination,
  paragraph,
  preformated,
  progress,
  ringProgress,
  row,
  segmented,
  select,
  skeleton,
  small,
  spinner,
  stack,
  steps,
  strong,
  table,
  tabs,
  tag,
  textarea,
  toggleGroup,
} from "@domphy/ui";

// Theme Builder — an app-shell (config sidebar + live preview), not a doc
// demo. Every control in the sidebar drives a real setTheme()+themeApply()
// call through generateTheme()/generateRamp() (@domphy/theme + @domphy/palette
// — see DESIGN.md at the repo root for the math), scoped to its own theme
// name so it never touches the page's own light/dark theme. The preview on
// the right renders real @domphy/ui patches under the generated theme, so a
// color/density change is judged against actual components, not swatches.

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

// Site chrome above the app: press header (14 units) + the page-layout top
// padding (8 units). The app fills exactly the remaining viewport, so the
// sidebar and the preview scroll independently instead of the page scrolling.
const CHROME_UNITS = 22;
const STACK_BREAKPOINT = "@media (max-width: 960px)";

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
const themeName = toState("brand");
const previewThemeName = toState<"light" | typeof THEME_NAME>(THEME_NAME);
const exportJSON = toState("");
const copied = toState(false);
const dialogOpen = toState(false);
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

function exportSnippet(listener: Listener): string {
  return `setTheme("${themeName.get(listener)}", ${exportJSON.get(listener)})`;
}

async function copyExport(): Promise<void> {
  try {
    await navigator.clipboard.writeText(
      `setTheme("${themeName.get()}", ${exportJSON.get()})`,
    );
    copied.set(true);
    setTimeout(() => copied.set(false), 1600);
  } catch {
    // Clipboard unavailable (permissions, non-secure context) — the JSON is
    // still selectable in the "View JSON" panel, so failing silently is fine.
  }
}

// --- Sidebar: colors ------------------------------------------------------

function colorField(role: Role): DomphyElement<"label"> {
  return {
    label: [
      {
        input: null,
        type: "color",
        value: (l: Listener) => baseColors.get(role, l),
        ariaLabel: `${role} base color`,
        onInput: (e) => {
          baseColors.set(role, (e.target as HTMLInputElement).value);
          regenerate();
        },
        style: {
          width: themeSpacing(10),
          height: themeSpacing(10),
          padding: 0,
          border: "none",
          borderRadius: themeSpacing(2),
          cursor: "pointer",
          flexShrink: "0",
        },
      } as DomphyElement<"input">,
      {
        div: [
          { small: role, $: [small()] } as DomphyElement<"small">,
          {
            input: null,
            type: "text",
            value: (l: Listener) => baseColors.get(role, l),
            ariaLabel: `${role} base color (hex)`,
            spellcheck: "false",
            onInput: (e) => {
              const value = (e.target as HTMLInputElement).value.trim();
              // Half-typed hexes are ignored; the controlled value only
              // re-renders when the state actually changes, so the field
              // never snaps back mid-keystroke.
              if (!isValidHex(value)) return;
              baseColors.set(role, normalizeHex(value).slice(0, 7));
              regenerate();
            },
            $: [inputText()],
          } as DomphyElement<"input">,
        ],
        $: [stack({ gap: 1 })],
        style: { flex: "1", minWidth: "0" },
      } as DomphyElement<"div">,
    ],
    $: [row({ gap: 3 })],
  };
}

// --- Sidebar: size & density ----------------------------------------------

function fontSizeField(index: number): DomphyElement<"label"> {
  return {
    label: [
      { small: `size ${index}`, $: [small()] } as DomphyElement<"small">,
      {
        input: null,
        type: "text",
        value: (l: Listener) => fontSizes.get(l)[index],
        ariaLabel: `font size step ${index}`,
        onInput: (e) => {
          const next = [...fontSizes.get()];
          next[index] = (e.target as HTMLInputElement).value;
          fontSizes.set(next);
          regenerate();
        },
        $: [inputText()],
      } as DomphyElement<"input">,
    ],
    $: [stack({ gap: 1 })],
  };
}

function densityField(index: number): DomphyElement<"label"> {
  return {
    label: [
      { small: `density ${index}`, $: [small()] } as DomphyElement<"small">,
      {
        input: null,
        type: "number",
        step: "0.05",
        min: "0.25",
        value: (l: Listener) => String(densities.get(l)[index]),
        ariaLabel: `density step ${index}`,
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
    $: [stack({ gap: 1 })],
  };
}

function sizeDisclosure(): DomphyElement<"details"> {
  return {
    details: [
      { summary: "Size & density" },
      {
        div: [
          {
            small: "Font sizes (0 = smallest .. 7 = largest)",
            $: [small()],
          } as DomphyElement<"small">,
          {
            div: DEFAULT_FONT_SIZES.map((_, index) => fontSizeField(index)),
            $: [grid({ columns: 2, gap: 2 })],
          } as DomphyElement<"div">,
          {
            small: "Density steps (0 = compact .. 4 = spacious)",
            $: [small()],
          } as DomphyElement<"small">,
          {
            div: DEFAULT_DENSITIES.map((_, index) => densityField(index)),
            $: [grid({ columns: 2, gap: 2 })],
          } as DomphyElement<"div">,
        ],
        $: [stack({ gap: 2 })],
        style: { paddingTop: themeSpacing(2) },
      } as DomphyElement<"div">,
    ],
    $: [details()],
  };
}

// --- Sidebar: export --------------------------------------------------------

function exportPanel(): DomphyElement<"div"> {
  return {
    div: [
      {
        label: [
          { small: "Theme name", $: [small()] } as DomphyElement<"small">,
          {
            input: null,
            type: "text",
            value: (l: Listener) => themeName.get(l),
            onInput: (e) => themeName.set((e.target as HTMLInputElement).value),
            $: [inputText()],
          } as DomphyElement<"input">,
        ],
        $: [stack({ gap: 1 })],
      } as DomphyElement<"label">,
      {
        button: (l: Listener) =>
          copied.get(l) ? "Copied to clipboard" : "Copy ThemeInput JSON",
        onClick: () => void copyExport(),
        $: [button({ color: "primary", variant: "solid" })],
      } as DomphyElement<"button">,
      {
        details: [
          { summary: "View JSON" },
          {
            pre: [{ code: (l: Listener) => exportSnippet(l) }],
            $: [preformated()],
            style: {
              whiteSpace: "pre-wrap" as const,
              wordBreak: "break-all" as const,
              maxHeight: themeSpacing(60),
              overflowY: "auto" as const,
            },
          } as DomphyElement<"pre">,
        ],
        $: [details()],
      } as DomphyElement<"details">,
    ],
    $: [stack({ gap: 2 })],
    style: {
      flexShrink: "0",
      padding: themeSpacing(4),
      color: (l: Listener) => themeColor(l, "text"),
      borderTop: (l: Listener) => `1px solid ${themeColor(l, "border")}`,
    },
  };
}

// --- Sidebar shell ----------------------------------------------------------

function sidebar(): DomphyElement<"aside"> {
  return {
    aside: [
      {
        div: [
          {
            div: [
              { h2: "Theme Builder", $: [heading()] } as DomphyElement<"h2">,
              {
                p: "One base color per role — ramps, sizes and densities are generated live by generateTheme().",
                $: [paragraph()],
              } as DomphyElement<"p">,
            ],
            $: [stack({ gap: 1 })],
          } as DomphyElement<"div">,
          {
            div: [
              {
                small: "Colors",
                $: [small()],
              } as DomphyElement<"small">,
              {
                div: ROLES.map(colorField),
                $: [stack({ gap: 3 })],
              } as DomphyElement<"div">,
              { div: null, $: [divider()] } as DomphyElement<"div">,
              sizeDisclosure(),
            ],
            $: [stack({ gap: 3 })],
          } as DomphyElement<"div">,
        ],
        $: [stack({ gap: 5 })],
        style: {
          flex: "1",
          minHeight: "0",
          overflowY: "auto",
          padding: themeSpacing(4),
        },
      } as DomphyElement<"div">,
      exportPanel(),
    ],
    style: {
      width: themeSpacing(84),
      flexShrink: "0",
      display: "flex",
      flexDirection: "column",
      minHeight: "0",
      backgroundColor: (l: Listener) => themeColor(l, "inherit"),
      color: (l: Listener) => themeColor(l, "text"),
      borderRight: (l: Listener) => `1px solid ${themeColor(l, "border")}`,
      [STACK_BREAKPOINT]: {
        width: "auto",
        borderRight: "none",
        borderBottom: (l: Listener) => `1px solid ${themeColor(l, "border")}`,
      },
    },
  };
}

// --- Preview gallery --------------------------------------------------------

function section(
  title: string,
  items: DomphyElement[],
): DomphyElement<"section"> {
  return {
    section: [
      { h3: title, $: [heading()] } as DomphyElement<"h3">,
      {
        div: items,
        $: [row({ gap: 3, wrap: true })],
      } as DomphyElement<"div">,
    ],
    $: [stack({ gap: 3 })],
  };
}

function swatchRow(role: Role): DomphyElement<"div"> {
  return {
    div: [
      {
        small: role,
        $: [small()],
        style: { minWidth: themeSpacing(21) },
      } as DomphyElement<"small">,
      {
        div: Array.from({ length: 18 }, (_, index) => ({
          div: "",
          // Decorative color swatch, no text content — "missing-color" would
          // otherwise ask for a color that has nothing to apply to.
          _doctorDisable: "missing-color",
          style: {
            backgroundColor: `var(--${role}-${index})`,
            width: themeSpacing(8),
            height: themeSpacing(8),
            flexShrink: "0",
          },
          title: `--${role}-${index}`,
        })),
        style: { display: "flex" },
      } as DomphyElement<"div">,
    ],
    $: [row({ gap: 2 })],
  };
}

function ramps(): DomphyElement<"section"> {
  return {
    section: [
      { h3: "Generated ramps", $: [heading()] } as DomphyElement<"h3">,
      {
        div: ROLES.map(swatchRow),
        $: [stack({ gap: 1 })],
      } as DomphyElement<"div">,
    ],
    $: [stack({ gap: 3 })],
  };
}

function buttonsGallery(): DomphyElement<"section"> {
  const colors: Role[] = [
    "primary",
    "secondary",
    "success",
    "warning",
    "error",
    "info",
    "neutral",
  ];
  return {
    section: [
      { h3: "Buttons", $: [heading()] } as DomphyElement<"h3">,
      {
        div: [
          {
            div: colors.map(
              (color) =>
                ({
                  button: color,
                  onClick: () => {},
                  $: [button({ color, variant: "solid" })],
                }) as DomphyElement<"button">,
            ),
            $: [row({ gap: 3, wrap: true })],
          } as DomphyElement<"div">,
          {
            div: colors.map(
              (color) =>
                ({
                  button: color,
                  onClick: () => {},
                  $: [button({ color })],
                }) as DomphyElement<"button">,
            ),
            $: [row({ gap: 3, wrap: true })],
          } as DomphyElement<"div">,
          {
            div: [
              ...colors.map(
                (color) =>
                  ({
                    button: color,
                    onClick: () => {},
                    $: [buttonGhost({ color })],
                  }) as DomphyElement<"button">,
              ),
              {
                a: "Link button",
                href: "#",
                onClick: (e: Event) => e.preventDefault(),
                $: [linkButton({ color: "primary" })],
              } as DomphyElement<"a">,
              {
                button: "+",
                onClick: () => {},
                ariaLabel: "Add",
                $: [fab()],
              } as DomphyElement<"button">,
            ],
            $: [row({ gap: 3, wrap: true })],
          } as DomphyElement<"div">,
        ],
        $: [stack({ gap: 3 })],
      } as DomphyElement<"div">,
    ],
    $: [stack({ gap: 3 })],
  };
}

function typographyGallery(): DomphyElement<"section"> {
  return section("Typography", [
    {
      p: "Body paragraph text sits at shift-9 on the surface.",
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
  ]);
}

function formsGallery(): DomphyElement<"section"> {
  return {
    section: [
      { h3: "Forms & inputs", $: [heading()] } as DomphyElement<"h3">,
      {
        div: [
          {
            input: null,
            type: "text",
            placeholder: "Name",
            ariaLabel: "Name",
            $: [inputText()],
          } as DomphyElement<"input">,
          {
            input: null,
            type: "search",
            placeholder: "Search…",
            ariaLabel: "Search",
            $: [inputSearch()],
          } as DomphyElement<"input">,
          {
            input: null,
            type: "number",
            placeholder: "18",
            ariaLabel: "Age",
            $: [inputNumber()],
          } as DomphyElement<"input">,
          { div: null, $: [inputPassword()] } as DomphyElement<"div">,
          {
            select: [{ option: "Option A" }, { option: "Option B" }],
            ariaLabel: "Example select",
            $: [select()],
          } as DomphyElement<"select">,
          {
            textarea: null,
            placeholder: "Write something…",
            ariaLabel: "Message",
            rows: 2,
            $: [textarea()],
          } as DomphyElement<"textarea">,
        ],
        $: [row({ gap: 3, wrap: true })],
      } as DomphyElement<"div">,
      {
        div: [
          {
            input: null,
            type: "checkbox",
            ariaLabel: "Checkbox",
            $: [inputCheckbox()],
          } as DomphyElement<"input">,
          {
            input: null,
            type: "radio",
            ariaLabel: "Radio",
            $: [inputRadio()],
          } as DomphyElement<"input">,
          {
            input: null,
            type: "checkbox",
            ariaLabel: "Switch",
            $: [inputSwitch()],
          } as DomphyElement<"input">,
          {
            input: null,
            type: "range",
            ariaLabel: "Range",
            $: [inputRange()],
          } as DomphyElement<"input">,
        ],
        $: [row({ gap: 4, wrap: true })],
      } as DomphyElement<"div">,
    ],
    $: [stack({ gap: 3 })],
  };
}

function feedbackGallery(): DomphyElement<"section"> {
  return {
    section: [
      { h3: "Feedback & status", $: [heading()] } as DomphyElement<"h3">,
      {
        div: [
          {
            div: "Saved successfully",
            $: [alert({ color: "success" })],
          } as DomphyElement<"div">,
          {
            div: "Something needs attention",
            $: [alert({ color: "warning" })],
          } as DomphyElement<"div">,
          {
            div: "Action failed — try again",
            $: [alert({ color: "error" })],
          } as DomphyElement<"div">,
        ],
        $: [stack({ gap: 2 })],
      } as DomphyElement<"div">,
      {
        div: [
          {
            span: "🔔",
            $: [badge({ label: 3, color: "danger" })],
          } as DomphyElement<"span">,
          {
            span: "Label",
            $: [tag({ removable: true })],
          } as DomphyElement<"span">,
          {
            progress: null,
            value: 40,
            max: 100,
            $: [progress()],
            style: { width: themeSpacing(40) },
          } as DomphyElement<"progress">,
          {
            div: null,
            $: [ringProgress({ value: 65 })],
          } as DomphyElement<"div">,
          { span: null, $: [spinner()] } as DomphyElement<"span">,
          {
            div: null,
            $: [skeleton()],
            style: { width: themeSpacing(20), height: themeSpacing(5) },
          } as DomphyElement<"div">,
        ],
        $: [row({ gap: 4, wrap: true })],
      } as DomphyElement<"div">,
    ],
    $: [stack({ gap: 3 })],
  };
}

function componentsGallery(): DomphyElement<"section"> {
  return {
    section: [
      { h3: "Components", $: [heading()] } as DomphyElement<"h3">,
      {
        div: [
          {
            div: [
              { h4: "Generated card", $: [heading()] } as DomphyElement<"h4">,
              {
                p: "Surface at shift-1, body text at shift-9 — the same tone-anchoring rule as every other Domphy surface.",
                $: [paragraph()],
              } as DomphyElement<"p">,
              {
                div: [
                  {
                    button: "Open dialog",
                    onClick: () => dialogOpen.set(true),
                    $: [button({ color: "primary" })],
                  } as DomphyElement<"button">,
                  {
                    span: "JD",
                    $: [avatar({ color: "primary" })],
                  } as DomphyElement<"span">,
                ],
                $: [row({ gap: 3 })],
              } as DomphyElement<"div">,
            ],
            $: [card({ color: "neutral" }), stack({ gap: 2 })],
            style: { width: themeSpacing(80), maxWidth: "100%" },
          } as DomphyElement<"div">,
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
            style: { flex: "1", minWidth: themeSpacing(60) },
          } as DomphyElement<"div">,
        ],
        $: [row({ gap: 4, wrap: true, align: "stretch" })],
      } as DomphyElement<"div">,
      {
        div: [
          {
            div: [
              {
                details: [{ summary: "Section A" }, { p: "Content A" }],
                $: [details()],
              } as DomphyElement<"details">,
              {
                details: [{ summary: "Section B" }, { p: "Content B" }],
                $: [details()],
              } as DomphyElement<"details">,
            ],
            $: [accordion()],
            style: { width: themeSpacing(70), maxWidth: "100%" },
          } as DomphyElement<"div">,
          {
            div: [
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
              } as DomphyElement<"div">,
              {
                div: "",
                $: [pagination({ total: 10, value: 1 })],
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
            ],
            $: [stack({ gap: 3 })],
          } as DomphyElement<"div">,
        ],
        $: [row({ gap: 6, wrap: true, align: "flex-start" })],
      } as DomphyElement<"div">,
      {
        div: [
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
            ul: [
              { li: "First item" },
              { li: "Second item" },
              { li: "Third item" },
            ],
            $: [list()],
          } as DomphyElement<"ul">,
        ],
        $: [row({ gap: 6, wrap: true, align: "flex-start" })],
      } as DomphyElement<"div">,
    ],
    $: [stack({ gap: 4 })],
  };
}

function previewDialog(): DomphyElement<"dialog"> {
  return {
    dialog: [
      {
        div: [
          {
            h3: "Dialog under the generated theme",
            id: "tb-dialog-title",
            $: [heading()],
          } as DomphyElement<"h3">,
          {
            p: "Elevation, focus trap and surface tones all come from the theme you are editing.",
            $: [paragraph()],
          } as DomphyElement<"p">,
          {
            div: [
              {
                button: "Close",
                onClick: () => dialogOpen.set(false),
                $: [button({ color: "primary", variant: "solid" })],
              } as DomphyElement<"button">,
            ],
            $: [row({ justify: "flex-end" })],
          } as DomphyElement<"div">,
        ],
        $: [stack({ gap: 2 })],
      } as DomphyElement<"div">,
    ],
    $: [dialog({ open: dialogOpen, labelledBy: "tb-dialog-title" })],
  };
}

function preview(): DomphyElement<"div"> {
  return {
    div: [
      {
        div: [
          { strong: "Live preview", $: [strong()] } as DomphyElement<"strong">,
          {
            select: [
              { option: "Generated theme" },
              { option: "Built-in light" },
            ],
            value: (l: Listener) =>
              previewThemeName.get(l) === THEME_NAME
                ? "Generated theme"
                : "Built-in light",
            ariaLabel: "Preview theme",
            onInput: (e) => {
              const value = (e.target as HTMLSelectElement).value;
              previewThemeName.set(
                value === "Built-in light" ? "light" : THEME_NAME,
              );
            },
            $: [select()],
          } as DomphyElement<"select">,
        ],
        $: [row({ justify: "space-between" })],
        style: {
          flexShrink: "0",
          padding: themeSpacing(4),
          color: (l: Listener) => themeColor(l, "text"),
          borderBottom: (l: Listener) => `1px solid ${themeColor(l, "border")}`,
        },
      } as DomphyElement<"div">,
      {
        div: [
          ramps(),
          buttonsGallery(),
          typographyGallery(),
          formsGallery(),
          feedbackGallery(),
          componentsGallery(),
        ],
        $: [stack({ gap: 8 })],
        style: {
          flex: "1",
          minHeight: "0",
          overflowY: "auto",
          padding: themeSpacing(5),
        },
      } as DomphyElement<"div">,
      previewDialog(),
    ],
    dataTheme: (l: Listener) => previewThemeName.get(l),
    style: {
      flex: "1",
      minWidth: "0",
      minHeight: "0",
      display: "flex",
      flexDirection: "column",
      backgroundColor: (l: Listener) => themeColor(l, "inherit"),
      color: (l: Listener) => themeColor(l, "text"),
    },
  };
}

// --- App shell ---------------------------------------------------------------

const App: DomphyElement<"div"> = {
  div: [sidebar(), preview()],
  style: {
    display: "flex",
    alignItems: "stretch",
    height: `calc(100dvh - ${themeSpacing(CHROME_UNITS)})`,
    minHeight: themeSpacing(120),
    backgroundColor: (l: Listener) => themeColor(l, "inherit"),
    color: (l: Listener) => themeColor(l, "text"),
    [STACK_BREAKPOINT]: {
      flexDirection: "column",
      height: "auto",
    },
    // This island mounts inside press's content scope, whose `.scope hN/p/…`
    // typography rules outrank the per-node patch classes — match their
    // specificity to reclaim margins and the h2 rule's padding/border (later
    // injection wins the tie). The app lays out with stack()/row() gaps
    // instead of prose rhythm.
    "& h2": { margin: "0", paddingTop: "0", borderTop: "none" },
    "& h3": { margin: "0" },
    "& h4": { margin: "0" },
    "& p": { margin: "0" },
    "& pre": { margin: "0" },
    "& blockquote": { margin: "0" },
    "& ul, & ol": { margin: "0" },
    "& table": { margin: "0" },
  },
};

export default App;
