import {
  type DomphyElement,
  type Listener,
  RecordState,
  toState,
} from "@domphy/core";
import {
  COLOR_ROLES,
  type ColorRole,
  contrastRatio,
  type GenerateThemeOptions,
  generateTheme,
  getTheme,
  isValidHex,
  normalizeHex,
  type PartialThemeInput,
  Ramp,
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
  panelSection,
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
  toolbar,
  toolbarSpacer,
} from "@domphy/ui";

// Theme Builder — full app shell (control pane + live preview). Every control
// drives setTheme()+themeApply() through generateTheme()/generateRamp()
// (DESIGN.md), scoped under isolated theme names so the site chrome is never
// touched. Preview can flip the *generated* light and dark siblings.

const THEME_LIGHT = "theme-builder-preview";
const THEME_DARK = "theme-builder-preview-dark";

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

// Site chrome above the app: press header (14 units) + page-layout top padding
// (8 units). The app fills the remaining viewport so panes scroll independently.
const CHROME_UNITS = 22;
const STACK_BREAKPOINT = "@media (max-width: 960px)";
const WCAG_AA = 4.5;

export type PreviewMode = "generated-light" | "generated-dark";

export type ContrastCheck = {
  id: string;
  label: string;
  ratio: number;
  pass: boolean;
  foreground: string;
  background: string;
};

export type QualityReport = {
  contrasts: ContrastCheck[];
  rampScores: { role: Role; score: number }[];
  overallScore: number;
};

// --- Pure helpers (exported for unit tests) ---------------------------------

/** Default role base colors from the built-in light theme. */
export function defaultColors(): Record<Role, string> {
  const light = getTheme("light");
  const result = {} as Record<Role, string>;
  for (const role of ROLES)
    result[role] = light.colors[role][light.baseTones[role]];
  return result;
}

/**
 * Derive a dark sibling of a generated theme by reversing each ramp and
 * remapping baseTones (same logic as the private createDark in @domphy/theme).
 */
export function deriveDarkTheme(source: PartialThemeInput): PartialThemeInput {
  const colors = source.colors ?? {};
  const baseTones = source.baseTones ?? {};
  const darkColors: Record<string, string[]> = {};
  const darkBaseTones: Record<string, number> = {};
  for (const name of Object.keys(colors)) {
    const ramp = [...colors[name]].reverse();
    darkColors[name] = ramp;
    const base = baseTones[name] ?? 0;
    darkBaseTones[name] = ramp.length - 1 - base;
  }
  return {
    ...source,
    direction: "lighten",
    colors: darkColors,
    baseTones: darkBaseTones,
  };
}

/** Build the paste-ready setTheme() snippet for the export panel. */
export function buildExportSnippet(name: string, themeJson: string): string {
  return `setTheme("${name}", ${themeJson})`;
}

/**
 * WCAG contrast + per-role Ramp quality for a generated theme.
 * Body text = neutral[9] on neutral[0] (K=9 design contract).
 * Primary CTA = primary solid-ish pair: primary[9] on primary[0] and
 * primary base swatch on neutral surface.
 */
export function buildQualityReport(theme: PartialThemeInput): QualityReport {
  const colors = theme.colors ?? {};
  const baseTones = theme.baseTones ?? {};
  const contrasts: ContrastCheck[] = [];

  const neutral = colors.neutral;
  if (neutral && neutral.length > 9) {
    const bg = neutral[0];
    const fg = neutral[9];
    const ratio = contrastRatio(fg, bg);
    contrasts.push({
      id: "neutral-body",
      label: "Neutral body text (shift-9 on surface)",
      ratio,
      pass: ratio >= WCAG_AA,
      foreground: fg,
      background: bg,
    });
  }

  const primary = colors.primary;
  if (primary && primary.length > 9) {
    const bg = primary[0];
    const fg = primary[9];
    const ratio = contrastRatio(fg, bg);
    contrasts.push({
      id: "primary-ramp",
      label: "Primary ramp (shift-9 on surface)",
      ratio,
      pass: ratio >= WCAG_AA,
      foreground: fg,
      background: bg,
    });

    if (neutral && neutral.length > 0) {
      const baseIndex = baseTones.primary ?? Math.floor(primary.length / 2);
      const cta = primary[baseIndex] ?? primary[9];
      const surface = neutral[0];
      const ctaRatio = contrastRatio(cta, surface);
      contrasts.push({
        id: "primary-cta",
        label: "Primary base on neutral surface",
        ratio: ctaRatio,
        // Decorative brand accent — flag AA for awareness; solid buttons
        // typically use light text on a dark primary step, not this pair.
        pass: ctaRatio >= WCAG_AA,
        foreground: cta,
        background: surface,
      });
    }
  }

  const rampScores: { role: Role; score: number }[] = [];
  for (const role of ROLES) {
    const ramp = colors[role];
    if (!ramp || ramp.length === 0) continue;
    const score = new Ramp(ramp, role).score;
    rampScores.push({ role, score });
  }
  const overallScore =
    rampScores.length === 0
      ? 0
      : rampScores.reduce((sum, entry) => sum + entry.score, 0) /
        rampScores.length;

  return {
    contrasts,
    rampScores,
    overallScore: Math.round(overallScore * 100) / 100,
  };
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(1, s));
  const light = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return `#${clampByte((r + m) * 255)
    .toString(16)
    .padStart(2, "0")}${clampByte((g + m) * 255)
    .toString(16)
    .padStart(2, "0")}${clampByte((b + m) * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

function hexToHsl(hex: string): [number, number, number] {
  const normalized = normalizeHex(hex).slice(0, 7);
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const light = (max + min) / 2;
  if (max === min) return [0, 0, light];
  const d = max - min;
  const sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue = 0;
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) hue = ((b - r) / d + 2) * 60;
  else hue = ((r - g) / d + 4) * 60;
  return [hue, sat, light];
}

function randomHex(rng: () => number = Math.random): string {
  const n = Math.floor(rng() * 0xffffff);
  return `#${n.toString(16).padStart(6, "0")}`;
}

/** Random base color per role. Optional rng for deterministic tests. */
export function randomizeColors(
  rng: () => number = Math.random,
): Record<Role, string> {
  const result = {} as Record<Role, string>;
  for (const role of ROLES) result[role] = randomHex(rng);
  return result;
}

/**
 * Fill all roles from a seed primary via simple hue-wheel harmony
 * (analogous secondary, fixed semantic hues for status roles, desaturated
 * neutral sharing the primary hue).
 */
export function harmonyFromPrimary(primaryHex: string): Record<Role, string> {
  const primary = normalizeHex(primaryHex).slice(0, 7);
  const [h, s, l] = hexToHsl(primary);
  const midL = Math.max(0.35, Math.min(0.55, l));
  const midS = Math.max(0.35, Math.min(0.75, s || 0.55));
  return {
    primary,
    secondary: hslToHex((h + 32) % 360, midS, midL),
    info: hslToHex((h + 200) % 360, midS * 0.85, midL),
    success: hslToHex(145, midS * 0.75, midL),
    warning: hslToHex(42, Math.min(0.9, midS * 1.1), midL),
    attention: hslToHex(28, midS, midL),
    error: hslToHex(8, Math.min(0.9, midS * 1.05), midL * 0.95),
    danger: hslToHex(350, midS, midL * 0.92),
    highlight: hslToHex(
      (h + 180) % 360,
      midS * 0.55,
      Math.min(0.72, midL + 0.12),
    ),
    neutral: hslToHex(h, Math.min(0.08, midS * 0.12), 0.5),
  };
}

// --- State ------------------------------------------------------------------

const baseColors = new RecordState<Record<Role, string>>(defaultColors());
const fontSizes = toState<string[]>([...DEFAULT_FONT_SIZES]);
const densities = toState<number[]>([...DEFAULT_DENSITIES]);
const themeName = toState("brand");
const previewMode = toState<PreviewMode>("generated-light");
const exportJSON = toState("");
const copied = toState(false);
const dialogOpen = toState(false);
const generatedTheme = toState<PartialThemeInput | null>(null);
const quality = toState<QualityReport | null>(null);

function applyBaseColors(next: Record<Role, string>): void {
  for (const role of ROLES) baseColors.set(role, next[role]);
  regenerate();
}

function resetToDefaults(): void {
  applyBaseColors(defaultColors());
  fontSizes.set([...DEFAULT_FONT_SIZES]);
  densities.set([...DEFAULT_DENSITIES]);
  regenerate();
}

function randomizeBaseColors(): void {
  applyBaseColors(randomizeColors());
}

function applyHarmonyFromPrimary(): void {
  applyBaseColors(harmonyFromPrimary(baseColors.get("primary")));
}

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
  const dark = deriveDarkTheme(theme);
  setTheme(THEME_LIGHT, theme);
  setTheme(THEME_DARK, dark);
  themeApply();
  generatedTheme.set(theme);
  exportJSON.set(JSON.stringify(theme, null, 2));
  quality.set(buildQualityReport(theme));
}

regenerate();

function exportSnippet(listener: Listener): string {
  return buildExportSnippet(themeName.get(listener), exportJSON.get(listener));
}

async function copyExport(): Promise<void> {
  try {
    await navigator.clipboard.writeText(
      buildExportSnippet(themeName.get(), exportJSON.get()),
    );
    copied.set(true);
    setTimeout(() => copied.set(false), 1600);
  } catch {
    // Clipboard unavailable — JSON stays selectable in View JSON.
  }
}

function previewThemeAttr(listener: Listener): string {
  return previewMode.get(listener) === "generated-dark"
    ? THEME_DARK
    : THEME_LIGHT;
}

// --- Sidebar: colors --------------------------------------------------------

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

// --- Sidebar: size & density ------------------------------------------------

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

// --- Sidebar: quality -------------------------------------------------------

function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

function qualityPanel(): DomphyElement<"div"> {
  return {
    div: [
      {
        div: [
          { strong: "Accessibility", $: [strong()] } as DomphyElement<"strong">,
          {
            small: (l: Listener) => {
              const report = quality.get(l);
              if (!report) return "—";
              return `Ramp score ${report.overallScore.toFixed(0)}`;
            },
            $: [small()],
          } as DomphyElement<"small">,
        ],
        $: [row({ justify: "space-between", gap: 2 })],
      } as DomphyElement<"div">,
      {
        div: (l: Listener) => {
          const report = quality.get(l);
          if (!report) return [];
          return report.contrasts.map(
            (check) =>
              ({
                div: [
                  {
                    div: [
                      {
                        small: check.label,
                        $: [small()],
                        style: { flex: "1", minWidth: "0" },
                      } as DomphyElement<"small">,
                      {
                        span: check.pass ? "Pass" : "Fail",
                        $: [
                          tag({
                            color: check.pass ? "success" : "error",
                          }),
                        ],
                      } as DomphyElement<"span">,
                    ],
                    $: [row({ gap: 2, justify: "space-between" })],
                  } as DomphyElement<"div">,
                  {
                    div: [
                      {
                        div: "",
                        // Decorative pair chips show the *resolved* hex from
                        // contrastRatio — not theme tokens by design.
                        _doctorDisable: ["missing-color", "raw-theme-value"],
                        style: {
                          width: themeSpacing(5),
                          height: themeSpacing(5),
                          borderRadius: themeSpacing(1),
                          backgroundColor: check.background,
                          flexShrink: "0",
                          outline: (listener: Listener) =>
                            `1px solid ${themeColor(listener, "border")}`,
                        },
                        title: check.background,
                      } as DomphyElement<"div">,
                      {
                        div: "",
                        _doctorDisable: ["missing-color", "raw-theme-value"],
                        style: {
                          width: themeSpacing(5),
                          height: themeSpacing(5),
                          borderRadius: themeSpacing(1),
                          backgroundColor: check.foreground,
                          flexShrink: "0",
                          outline: (listener: Listener) =>
                            `1px solid ${themeColor(listener, "border")}`,
                        },
                        title: check.foreground,
                      } as DomphyElement<"div">,
                      {
                        small: formatRatio(check.ratio),
                        $: [
                          small({
                            color: check.pass ? "success" : "error",
                          }),
                        ],
                      } as DomphyElement<"small">,
                      {
                        small: "AA 4.5:1",
                        $: [small()],
                      } as DomphyElement<"small">,
                    ],
                    $: [row({ gap: 2 })],
                  } as DomphyElement<"div">,
                ],
                $: [stack({ gap: 1 })],
                _key: check.id,
              }) as DomphyElement<"div">,
          );
        },
        $: [stack({ gap: 3 })],
        ariaLabel: "Contrast checks",
      } as DomphyElement<"div">,
    ],
    $: [stack({ gap: 3 }), panelSection({ divider: true, padding: 4 })],
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
            ariaLabel: "Theme name",
            onInput: (e) => themeName.set((e.target as HTMLInputElement).value),
            $: [inputText()],
          } as DomphyElement<"input">,
        ],
        $: [stack({ gap: 1 })],
      } as DomphyElement<"label">,
      {
        button: (l: Listener) =>
          copied.get(l) ? "Copied" : "Copy setTheme() snippet",
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
    $: [stack({ gap: 2 }), panelSection({ padding: 4 })],
    style: {
      flexShrink: "0",
      color: (l: Listener) => themeColor(l, "text"),
      borderTop: (l: Listener) => `1px solid ${themeColor(l, "border")}`,
    },
  };
}

// --- Sidebar shell ----------------------------------------------------------

function actionBar(): DomphyElement<"div"> {
  return {
    div: [
      {
        button: "Reset",
        ariaLabel: "Reset to default colors",
        onClick: () => resetToDefaults(),
        $: [buttonGhost({ color: "neutral" })],
      } as DomphyElement<"button">,
      {
        button: "Randomize",
        ariaLabel: "Randomize base colors",
        onClick: () => randomizeBaseColors(),
        $: [buttonGhost({ color: "neutral" })],
      } as DomphyElement<"button">,
      {
        button: "Harmony",
        ariaLabel: "Fill roles from primary harmony",
        onClick: () => applyHarmonyFromPrimary(),
        $: [button({ color: "secondary" })],
      } as DomphyElement<"button">,
    ],
    $: [row({ gap: 2, wrap: true })],
  };
}

function sidebar(): DomphyElement<"aside"> {
  return {
    aside: [
      {
        div: [
          {
            div: [
              { h2: "Theme Builder", $: [heading()] } as DomphyElement<"h2">,
              {
                p: "Pick a base color per role. Ramps, contrast, and the gallery update live via generateTheme().",
                $: [paragraph()],
              } as DomphyElement<"p">,
              actionBar(),
            ],
            $: [stack({ gap: 3 }), panelSection({ divider: true, padding: 4 })],
          } as DomphyElement<"div">,
          {
            div: [
              {
                small: "Base colors",
                $: [small()],
              } as DomphyElement<"small">,
              {
                div: ROLES.map(colorField),
                $: [stack({ gap: 3 })],
              } as DomphyElement<"div">,
            ],
            $: [stack({ gap: 3 }), panelSection({ divider: true, padding: 4 })],
          } as DomphyElement<"div">,
          {
            div: [sizeDisclosure()],
            $: [panelSection({ divider: true, padding: 4 })],
          } as DomphyElement<"div">,
          qualityPanel(),
        ],
        style: {
          flex: "1",
          minHeight: "0",
          overflowY: "auto",
        },
      } as DomphyElement<"div">,
      exportPanel(),
    ],
    style: {
      width: themeSpacing(92),
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
        maxHeight: themeSpacing(140),
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

function swatchCell(role: Role, index: number): DomphyElement<"div"> {
  return {
    div: "",
    _doctorDisable: "missing-color",
    style: {
      backgroundColor: `var(--${role}-${index})`,
      width: themeSpacing(7),
      height: themeSpacing(8),
      flexShrink: "0",
      // Base-tone marker: thicker bottom border via outline on the base index.
      boxShadow: (l: Listener) => {
        const theme = generatedTheme.get(l);
        const base = theme?.baseTones?.[role];
        if (base !== index) return "none";
        return `inset 0 -3px 0 0 ${themeColor(l, "text")}`;
      },
      outline: (l: Listener) => {
        const theme = generatedTheme.get(l);
        const base = theme?.baseTones?.[role];
        if (base !== index) return "none";
        return `1px solid ${themeColor(l, "border-strong")}`;
      },
      outlineOffset: "-1px",
    },
    title: (l: Listener) => {
      const theme = generatedTheme.get(l);
      const base = theme?.baseTones?.[role];
      const label = `--${role}-${index}`;
      return base === index ? `${label} (base)` : label;
    },
  };
}

function swatchRow(role: Role): DomphyElement<"div"> {
  return {
    div: [
      {
        small: role,
        $: [small()],
        style: { minWidth: themeSpacing(20) },
      } as DomphyElement<"small">,
      {
        div: Array.from({ length: 18 }, (_, index) => swatchCell(role, index)),
        // Decorative ramp host — outline only, no text content.
        _doctorDisable: "missing-color",
        style: {
          display: "flex",
          borderRadius: themeSpacing(1.5),
          overflow: "hidden",
          outline: (l: Listener) => `1px solid ${themeColor(l, "border")}`,
        },
      } as DomphyElement<"div">,
    ],
    $: [row({ gap: 2 })],
  };
}

function ramps(): DomphyElement<"section"> {
  return {
    section: [
      {
        div: [
          { h3: "Generated ramps", $: [heading()] } as DomphyElement<"h3">,
          {
            small: "Underline marks each role’s base tone",
            $: [small()],
          } as DomphyElement<"small">,
        ],
        $: [row({ justify: "space-between", gap: 3, wrap: true })],
      } as DomphyElement<"div">,
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

function previewToolbar(): DomphyElement<"div"> {
  return {
    div: [
      { strong: "Live preview", $: [strong()] } as DomphyElement<"strong">,
      toolbarSpacer(),
      {
        select: [
          { option: "Generated light", value: "generated-light" },
          { option: "Generated dark", value: "generated-dark" },
        ],
        value: (l: Listener) => previewMode.get(l),
        ariaLabel: "Preview theme",
        onInput: (e) => {
          const value = (e.target as HTMLSelectElement).value as PreviewMode;
          if (value === "generated-light" || value === "generated-dark") {
            previewMode.set(value);
          }
        },
        $: [select()],
      } as DomphyElement<"select">,
    ],
    $: [toolbar({ gap: 3 })],
    style: {
      flexShrink: "0",
      paddingBlock: themeSpacing(3),
      paddingInline: themeSpacing(5),
      color: (l: Listener) => themeColor(l, "text"),
      borderBottom: (l: Listener) => `1px solid ${themeColor(l, "border")}`,
      backgroundColor: (l: Listener) => themeColor(l, "inherit"),
    },
  };
}

function preview(): DomphyElement<"div"> {
  return {
    div: [
      previewToolbar(),
      {
        div: [
          ramps(),
          { div: null, $: [divider()] } as DomphyElement<"div">,
          buttonsGallery(),
          typographyGallery(),
          formsGallery(),
          feedbackGallery(),
          componentsGallery(),
        ],
        $: [stack({ gap: 6 })],
        style: {
          flex: "1",
          minHeight: "0",
          overflowY: "auto",
          padding: themeSpacing(5),
        },
      } as DomphyElement<"div">,
      previewDialog(),
    ],
    dataTheme: (l: Listener) => previewThemeAttr(l),
    dataTone: "shift-0",
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
    // Reclaim typography margins from press scope rules on this island.
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
