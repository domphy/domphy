/**
 * Runtime doctor probe: every UI default patch tree + every blocks factory().
 * Writes report to SCRATCH path if DOCTOR_PROBE_OUT is set, else stdout only.
 * Exit 1 on any error-severity diagnostic.
 */
import { writeFileSync } from "node:fs";
import type { Diagnostic } from "../../doctor/src/index.ts";
import { diagnose, format } from "../../doctor/src/index.ts";
import * as ui from "@domphy/ui";
import * as blocks from "../src/index.ts";

const HOST: Record<string, string> = {
  abbreviation: "abbr",
  accordion: "div",
  alert: "div",
  avatar: "div",
  badge: "span",
  blockquote: "blockquote",
  breadcrumb: "nav",
  breadcrumbEllipsis: "button",
  button: "button",
  buttonGhost: "button",
  buttonSwitch: "button",
  card: "div",
  code: "code",
  combobox: "div",
  command: "input",
  datePicker: "input",
  descriptionList: "dl",
  details: "details",
  dialog: "dialog",
  divider: "div",
  drawer: "dialog",
  emphasis: "em",
  empty: "div",
  errorBoundary: "div",
  fab: "button",
  figure: "figure",
  formGroup: "fieldset",
  heading: "h2",
  horizontalRule: "hr",
  icon: "span",
  image: "img",
  inputCheckbox: "input",
  inputColor: "input",
  inputDateTime: "input",
  inputFile: "input",
  inputNumber: "input",
  inputOTP: "div",
  inputPassword: "div",
  inputRadio: "input",
  inputRange: "input",
  inputSearch: "input",
  inputSwitch: "input",
  inputText: "input",
  keyboard: "kbd",
  label: "label",
  link: "a",
  linkButton: "a",
  list: "ul",
  mark: "mark",
  menu: "div",
  motion: "div",
  orderedList: "ol",
  pagination: "div",
  panelSection: "div",
  paragraph: "p",
  popover: "button",
  popoverArrow: "div",
  preformated: "pre",
  progress: "progress",
  rating: "div",
  ringProgress: "div",
  row: "div",
  scrollArea: "div",
  segmented: "div",
  select: "select",
  selectBox: "div",
  selectItem: "div",
  selectList: "div",
  skeleton: "div",
  small: "small",
  spinner: "span",
  splitter: "div",
  stack: "div",
  steps: "div",
  strong: "strong",
  subscript: "sub",
  superscript: "sup",
  table: "table",
  tabs: "div",
  tag: "span",
  textarea: "textarea",
  timeline: "div",
  toast: "div",
  toggleGroup: "div",
  toolbar: "div",
  tooltip: "button",
  transitionGroup: "div",
  unorderedList: "ul",
};

const PATCH_ARGS: Record<string, unknown> = {
  command: { items: [{ value: "a", label: "A" }] },
  combobox: { options: [{ value: "a", label: "A" }] },
  selectBox: { options: [{ value: "a", label: "A" }] },
  datePicker: {},
  menu: { items: [{ label: "Item" }] },
  selectList: { options: [{ value: "a", label: "A" }] },
  segmented: { options: [{ value: "a", label: "A" }] },
  tabs: { items: [{ value: "a", label: "A", content: { div: "A" } }] },
  toggleGroup: { options: [{ value: "a", label: "A" }] },
  steps: { steps: [{ label: "One" }, { label: "Two" }] },
  timeline: { items: [{ title: "A", content: "B" }] },
  accordion: { items: [{ title: "A", content: { p: "body" } }] },
  pagination: { page: 1, total: 10 },
  rating: { value: 3 },
  ringProgress: { value: 50 },
  progress: { value: 40 },
  list: { items: ["a", "b"] },
  orderedList: { items: ["a", "b"] },
  unorderedList: { items: ["a", "b"] },
  breadcrumb: {
    items: [{ label: "Home", href: "/" }, { label: "Page" }],
  },
  toast: { message: "Hi" },
  popover: { content: { div: "panel" } },
  tooltip: { content: "tip" },
  motion: { animate: { opacity: 1 } },
  empty: { title: "Empty" },
  alert: { title: "Note" },
  image: { src: "x.png", alt: "" },
  inputOTP: { length: 4 },
  descriptionList: { items: [{ term: "A", description: "B" }] },
};

const VOID = new Set(["hr", "img", "input", "progress"]);

function defaultContent(tag: string): unknown {
  if (VOID.has(tag)) return null;
  if (tag === "select") return [{ option: "A", value: "a" }];
  if (tag === "ul" || tag === "ol") return [{ li: "item" }];
  if (tag === "table")
    return [{ tbody: [{ tr: [{ td: "cell" }] }] }];
  if (tag === "dialog") return [{ p: "body" }];
  if (tag === "details") return [{ summary: "sum" }, { p: "body" }];
  if (tag === "dl") return [{ dt: "t" }, { dd: "d" }];
  if (tag === "figure")
    return [{ img: null, src: "x.png", alt: "" }, { figcaption: "c" }];
  if (tag === "fieldset") return [{ legend: "L" }, { p: "body" }];
  if (tag === "a") return "link";
  if (tag === "label") return "Label";
  if (tag === "textarea") return "text";
  return "content";
}

const lines: string[] = [];
const errors: Array<{ label: string; rule: string; message: string }> = [];
let warnCount = 0;
let infoCount = 0;
let uiProbed = 0;
let blocksProbed = 0;

function record(label: string, diags: Diagnostic[]) {
  const errs = diags.filter((d) => d.severity === "error");
  const warns = diags.filter((d) => d.severity === "warning");
  const infos = diags.filter((d) => d.severity === "info");
  warnCount += warns.length;
  infoCount += infos.length;
  if (diags.length === 0) return;
  lines.push(`\n## ${label}`);
  lines.push(format(diags));
  for (const d of errs) {
    errors.push({ label, rule: d.rule, message: d.message });
  }
}

for (const [name, fn] of Object.entries(ui)) {
  if (typeof fn !== "function") continue;
  if (!HOST[name]) continue;

  const tag = HOST[name];
  let patch: unknown;
  try {
    patch =
      name in PATCH_ARGS
        ? (fn as (a: unknown) => unknown)(PATCH_ARGS[name])
        : (fn as () => unknown)();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    lines.push(`\n## ui.${name}`);
    lines.push(`CONSTRUCT_ERROR: ${message}`);
    errors.push({ label: `ui.${name}`, rule: "construct", message });
    continue;
  }

  const el: Record<string, unknown> = {
    [tag]: defaultContent(tag),
    $: [patch],
  };
  if (name === "link" || name === "linkButton") el.href = "#";
  if (tag === "input") {
    el.type = name.includes("Checkbox")
      ? "checkbox"
      : name.includes("Radio")
        ? "radio"
        : name.includes("Range")
          ? "range"
          : name.includes("Color")
            ? "color"
            : name.includes("File")
              ? "file"
              : "text";
  }

  try {
    const diags = diagnose(el as any);
    uiProbed++;
    record(`ui.${name}`, diags);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    lines.push(`\n## ui.${name}`);
    lines.push(`DIAGNOSE_ERROR: ${message}`);
    errors.push({ label: `ui.${name}`, rule: "diagnose", message });
  }
}

for (const [name, fn] of Object.entries(blocks)) {
  if (typeof fn !== "function") continue;
  let tree: unknown;
  try {
    tree = (fn as () => unknown)();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    lines.push(`\n## blocks.${name}`);
    lines.push(`CONSTRUCT_ERROR: ${message}`);
    errors.push({ label: `blocks.${name}`, rule: "construct", message });
    continue;
  }
  try {
    const diags = diagnose(tree as any);
    blocksProbed++;
    record(`blocks.${name}`, diags);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    lines.push(`\n## blocks.${name}`);
    lines.push(`DIAGNOSE_ERROR: ${message}`);
    errors.push({ label: `blocks.${name}`, rule: "diagnose", message });
  }
}

const header = [
  `# Doctor probe — UI patches + blocks factories`,
  `date: ${new Date().toISOString()}`,
  `uiProbed: ${uiProbed}`,
  `blocksProbed: ${blocksProbed}`,
  `errors: ${errors.length}`,
  `warnings: ${warnCount}`,
  `infos: ${infoCount}`,
  ``,
  `## Error summary`,
  ...(errors.length
    ? errors.map((e) => `- [${e.rule}] ${e.label}: ${e.message}`)
    : ["(none)"]),
  ``,
  `## Full diagnostics (only non-empty)`,
];

const report = header.concat(lines).join("\n");
const out =
  process.env.DOCTOR_PROBE_OUT ??
  "C:/Users/khanh/AppData/Local/Temp/grok-goal-7b03d1aa14aa/implementer/doctor-ui-blocks.txt";
writeFileSync(out, report, "utf8");
console.log(header.join("\n"));
console.log(`\nwrote ${out}`);
process.exit(errors.length > 0 ? 1 : 0);
