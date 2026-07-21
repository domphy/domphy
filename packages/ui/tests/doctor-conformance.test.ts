// Doctor-conformance gate: every exported UI patch applied to its default host
// produces zero error-severity diagnostics AND zero un-justified warnings.
//
// IMPORTANT: diagnose() never expands `$` (RESERVED). We merge patch
// PartialElements onto the host the same way ElementNode/mergePartial does
// before diagnosing — otherwise style/dataTone checks never see patch defaults.

import { merge } from "@domphy/core";
import { describe, expect, it } from "vitest";
import { diagnose } from "../../doctor/src/index.ts";
import * as ui from "../src/index.ts";

/**
 * Expand `$` patches like ElementNode/mergePartial.
 * Preserves `tag: null` void content that merge() would drop (null is skipped).
 */
function expandPatches(element: Record<string, any>): Record<string, any> {
  if (!Array.isArray(element.$)) return element;
  const accumulated: Record<string, any> = {};
  for (const patch of element.$) {
    merge(accumulated, expandPatches(patch as Record<string, any>));
  }
  const native = { ...element };
  delete native.$;
  const nullKeys = Object.entries(native)
    .filter(([, value]) => value === null)
    .map(([key]) => key);
  merge(accumulated, native);
  for (const key of nullKeys) {
    accumulated[key] = null;
  }
  return accumulated;
}

/** Host tags for every patch export (from @hostTag JSDoc / layout defaults). */
const HOST: Record<string, string> = {
  abbreviation: "abbr",
  accordion: "div",
  alert: "div",
  avatar: "span",
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
  commandItem: "div",
  commandSearch: "input",
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
  listItem: "li",
  listItemButton: "button",
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
  splitterHandle: "div",
  splitterPanel: "div",
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
  timelineItem: "div",
  toast: "div",
  toggleGroup: "div",
  toolbar: "div",
  toolbarSpacer: "div",
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
  steps: { items: [{ label: "One" }, { label: "Two" }] },
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
  commandItem: { value: "a", label: "A" },
  commandSearch: {},
  listItem: {},
  listItemButton: {},
  timelineItem: { title: "A" },
};

const VOID = new Set(["hr", "img", "input", "progress"]);

function defaultContent(tag: string): unknown {
  if (VOID.has(tag)) return null;
  if (tag === "select") return [{ option: "A", value: "a" }];
  if (tag === "ul" || tag === "ol") return [{ li: "item" }];
  if (tag === "table") return [{ tbody: [{ tr: [{ td: "cell" }] }] }];
  if (tag === "dialog") return [{ p: "body" }];
  if (tag === "details") return [{ summary: "sum" }, { p: "body" }];
  if (tag === "dl") return [{ dt: "t" }, { dd: "d" }];
  if (tag === "figure")
    return [{ img: null, src: "x.png", alt: "" }, { figcaption: "c" }];
  if (tag === "fieldset") return [{ legend: "L" }, { p: "body" }];
  if (tag === "a") return "link";
  if (tag === "label") return "Label";
  if (tag === "textarea") return "text";
  if (tag === "li") return "item";
  return "content";
}

describe("doctor conformance — all UI patch defaults (merged)", () => {
  const patches = Object.entries(ui).filter(
    ([name, value]) => typeof value === "function" && HOST[name],
  );

  it("covers every function export from @domphy/ui", () => {
    const allFns = Object.entries(ui)
      .filter(([, value]) => typeof value === "function")
      .map(([name]) => name)
      .sort();
    const missing = allFns.filter((name) => !HOST[name]);
    expect(missing, `HOST map missing: ${missing.join(", ")}`).toEqual([]);
    expect(patches.length).toBe(allFns.length);
    expect(patches.length).toBeGreaterThanOrEqual(96);
  });

  it(`probes ${patches.length} merged patch trees with zero error/warning diagnostics`, () => {
    const failures: string[] = [];
    for (const [name, fn] of patches) {
      const tag = HOST[name];
      let patch: unknown;
      try {
        patch =
          name in PATCH_ARGS
            ? (fn as (a: unknown) => unknown)(PATCH_ARGS[name])
            : (fn as () => unknown)();
      } catch (error) {
        failures.push(
          `${name}: construct threw — ${error instanceof Error ? error.message : error}`,
        );
        continue;
      }

      const el: Record<string, unknown> = {
        [tag]: defaultContent(tag),
        $: [patch],
      };
      if (name === "link" || name === "linkButton") el.href = "#";
      // Do NOT set type= on void inputs here — patches that need type set it
      // themselves; a bare type: "text" without a found tag used to trigger
      // unknown-tag when expand failed to preserve input:null.

      const merged = expandPatches(el);
      const diags = diagnose(merged as any).filter(
        (d) => d.severity === "error" || d.severity === "warning",
      );
      if (diags.length > 0) {
        failures.push(
          `${name}: ${diags.map((d) => `${d.severity}/${d.rule}: ${d.message}`).join("; ")}`,
        );
      }
    }

    expect(failures, failures.join("\n")).toEqual([]);
  });
});
