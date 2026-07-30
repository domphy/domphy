// @vitest-environment jsdom
/**
 * A11y matrix gate: every interactive @domphy/ui patch mounts via the real
 * shipped factory and is audited with axe-core. Critical/serious → fail.
 *
 * color-contrast is disabled under jsdom (incomplete canvas metrics); theme
 * contrast is enforced separately by @domphy/doctor + DESIGN.md ramps.
 */

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as ui from "../src/index.ts";
import {
  accordion,
  alert,
  breadcrumb,
  breadcrumbEllipsis,
  button,
  buttonGhost,
  buttonSwitch,
  combobox,
  command,
  commandItem,
  commandSearch,
  datePicker,
  details,
  dialog,
  drawer,
  fab,
  inputCheckbox,
  inputColor,
  inputDateTime,
  inputFile,
  inputNumber,
  inputOTP,
  inputPassword,
  inputRadio,
  inputRange,
  inputSearch,
  inputSwitch,
  inputText,
  link,
  linkButton,
  listItemButton,
  menu,
  pagination,
  popover,
  rating,
  segmented,
  select,
  selectBox,
  selectItem,
  selectList,
  splitter,
  splitterHandle,
  splitterPanel,
  tabs,
  textarea,
  toast,
  toggleGroup,
  tooltip,
} from "../src/index.ts";
import { _resetScrollLock } from "../src/utils/scrollLock.ts";

if (!("ResizeObserver" in globalThis)) {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/** Patches that take keyboard/pointer focus or expose interactive ARIA roles. */
const INTERACTIVE_NAMES = [
  "accordion",
  "alert",
  "breadcrumb",
  "breadcrumbEllipsis",
  "button",
  "buttonGhost",
  "buttonSwitch",
  "combobox",
  "command",
  "commandItem",
  "commandSearch",
  "datePicker",
  "details",
  "dialog",
  "drawer",
  "fab",
  "inputCheckbox",
  "inputColor",
  "inputDateTime",
  "inputFile",
  "inputNumber",
  "inputOTP",
  "inputPassword",
  "inputRadio",
  "inputRange",
  "inputSearch",
  "inputSwitch",
  "inputText",
  "link",
  "linkButton",
  "listItemButton",
  "menu",
  "pagination",
  "popover",
  "rating",
  "segmented",
  "select",
  "selectBox",
  "selectItem",
  "selectList",
  "splitter",
  "tabs",
  "textarea",
  "toast",
  "toggleGroup",
  "tooltip",
] as const;

type InteractiveName = (typeof INTERACTIVE_NAMES)[number];

const FAIL_IMPACTS = new Set(["critical", "serious"]);

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

// axe-core is a singleton: only one run at a time, and it needs real timers.
let axeQueue: Promise<void> = Promise.resolve();

async function auditCritical(label: string, root: HTMLElement) {
  const run = async () => {
    const results = await axe.run(root, {
      // jsdom cannot compute real contrast; doctor owns theme contrast gates.
      rules: { "color-contrast": { enabled: false } },
    });
    const bad = results.violations.filter(
      (v) => v.impact && FAIL_IMPACTS.has(v.impact),
    );
    if (bad.length > 0) {
      const detail = bad
        .map(
          (v) =>
            `${v.id} [${v.impact}]: ${v.help} — nodes: ${v.nodes
              .slice(0, 3)
              .map((n) => n.html)
              .join(" | ")}`,
        )
        .join("\n");
      expect.fail(`${label}: critical/serious axe violations\n${detail}`);
    }
  };
  const next = axeQueue.then(run, run);
  axeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  await next;
}

/** Real mounted trees for every interactive patch (shipped factories only). */
function fixture(name: InteractiveName): DomphyElement {
  const open = toState(true);
  switch (name) {
    case "button":
      return { button: "Save", $: [button({ color: "primary" })] };
    case "buttonGhost":
      return { button: "Ghost", $: [buttonGhost()] };
    case "buttonSwitch":
      return { button: "On", $: [buttonSwitch()] };
    case "fab":
      return { button: "+", $: [fab()], "aria-label": "Add" };
    case "link":
      return { a: "Docs", href: "#docs", $: [link()] };
    case "linkButton":
      return { a: "Go", href: "#go", $: [linkButton()] };
    case "inputText":
      return {
        label: [
          { span: "Name" },
          { input: null, $: [inputText()], "aria-label": "Name" },
        ],
      };
    case "inputSearch":
      return {
        input: null,
        $: [inputSearch()],
        "aria-label": "Search",
      };
    case "inputPassword":
      return {
        div: null,
        $: [inputPassword()],
      };
    case "inputNumber":
      return {
        input: null,
        $: [inputNumber()],
        "aria-label": "Quantity",
      };
    case "inputRange":
      return {
        input: null,
        $: [inputRange()],
        "aria-label": "Volume",
      };
    case "inputCheckbox":
      return {
        label: [{ input: null, $: [inputCheckbox()] }, { span: "Accept" }],
      };
    case "inputRadio":
      return {
        label: [
          { input: null, name: "choice", $: [inputRadio()] },
          { span: "Option A" },
        ],
      };
    case "inputSwitch":
      return {
        input: null,
        $: [inputSwitch()],
        "aria-label": "Notifications",
      };
    case "inputColor":
      return {
        input: null,
        $: [inputColor()],
        "aria-label": "Color",
      };
    case "inputDateTime":
      return {
        input: null,
        $: [inputDateTime()],
        "aria-label": "Date",
      };
    case "inputFile":
      return {
        input: null,
        $: [inputFile()],
        "aria-label": "Upload",
      };
    case "inputOTP":
      return {
        div: [
          { input: null, "aria-label": "Digit 1", maxlength: 1 },
          { input: null, "aria-label": "Digit 2", maxlength: 1 },
          { input: null, "aria-label": "Digit 3", maxlength: 1 },
          { input: null, "aria-label": "Digit 4", maxlength: 1 },
        ],
        $: [inputOTP()],
      };
    case "textarea":
      return {
        textarea: "Hello",
        $: [textarea()],
        "aria-label": "Notes",
      };
    case "select":
      return {
        select: [
          { option: "A", value: "a" },
          { option: "B", value: "b" },
        ],
        $: [select()],
        "aria-label": "Pick",
      };
    case "dialog":
      return {
        dialog: [
          { h2: "Confirm", id: "dlg-title" },
          { button: "OK" },
          { button: "Cancel" },
        ],
        $: [dialog({ open })],
        "aria-labelledby": "dlg-title",
      };
    case "drawer":
      return {
        dialog: [{ h2: "Panel", id: "drawer-title" }, { button: "Close" }],
        $: [drawer({ open })],
        "aria-labelledby": "drawer-title",
      };
    case "popover":
      return {
        button: "Open",
        $: [popover({ content: { div: "Panel body" } })],
      };
    case "tooltip":
      return {
        button: "Info",
        $: [tooltip({ content: "More detail" })],
      };
    case "toast":
      return { div: "Saved", $: [toast()] };
    case "alert":
      return { div: "Heads up", $: [alert()] };
    case "menu":
      return {
        div: null,
        $: [
          menu({
            items: [
              { label: "Profile", key: "p" },
              { label: "Settings", key: "s" },
            ],
          }),
        ],
        "aria-label": "Account",
      };
    case "tabs":
      return {
        div: null,
        $: [
          tabs({
            items: [
              { label: "One", key: "1", content: { p: "Panel one" } },
              { label: "Two", key: "2", content: { p: "Panel two" } },
            ],
          }),
        ],
      };
    case "segmented":
      return {
        div: null,
        $: [
          segmented({
            items: [
              { key: "a", label: "Day" },
              { key: "b", label: "Week" },
            ],
          }),
        ],
        "aria-label": "Range",
      };
    case "toggleGroup":
      return {
        div: null,
        $: [
          toggleGroup({
            items: [
              { key: "bold", label: "B" },
              { key: "italic", label: "I" },
            ],
          }),
        ],
        "aria-label": "Format",
      };
    case "selectList":
      return {
        div: [
          { div: "Alpha", $: [selectItem({ value: "a" })] },
          { div: "Beta", $: [selectItem({ value: "b" })] },
        ],
        $: [selectList({ value: "a" })],
      };
    case "selectItem":
      return {
        div: [{ div: "Only", $: [selectItem({ value: "x" })] }],
        $: [selectList()],
      };
    case "selectBox":
      return {
        div: null,
        $: [
          selectBox({
            value: "a",
            options: [
              { label: "Alpha", value: "a" },
              { label: "Beta", value: "b" },
            ],
            content: {
              div: [
                { div: "Alpha", $: [selectItem({ value: "a" })] },
                { div: "Beta", $: [selectItem({ value: "b" })] },
              ],
              $: [selectList()],
            },
            open: true,
          }),
        ],
        "aria-label": "Choose",
      };
    case "combobox":
      return {
        div: null,
        $: [
          combobox({
            options: [
              { label: "Alpha", value: "a" },
              { label: "Beta", value: "b" },
            ],
            content: {
              div: [
                { div: "Alpha", $: [selectItem({ value: "a" })] },
                { div: "Beta", $: [selectItem({ value: "b" })] },
              ],
              $: [selectList()],
            },
            open: true,
          }),
        ],
      };
    case "command":
      return {
        div: [
          { input: null, $: [commandSearch()], "aria-label": "Command search" },
          { button: "Open file", $: [commandItem()] },
        ],
        $: [command()],
      };
    case "commandItem":
      return {
        div: [{ button: "Run", $: [commandItem()] }],
        $: [command()],
      };
    case "commandSearch":
      return {
        div: [
          {
            input: null,
            $: [commandSearch()],
            "aria-label": "Search commands",
          },
        ],
        $: [command()],
      };
    case "datePicker":
      return {
        input: null,
        $: [datePicker()],
        "aria-label": "Pick date",
      };
    case "pagination":
      return {
        div: null,
        $: [pagination({ value: 1, total: 5 })],
        "aria-label": "Pagination",
      };
    case "rating":
      return { div: null, $: [rating({ value: 3 })], "aria-label": "Rating" };
    case "accordion":
      return {
        div: [
          {
            details: [{ summary: "Section A" }, { p: "Body A" }],
            $: [details()],
          },
          {
            details: [{ summary: "Section B" }, { p: "Body B" }],
            $: [details()],
          },
        ],
        $: [accordion()],
      };
    case "details":
      return {
        details: [{ summary: "More" }, { p: "Hidden body" }],
        $: [details()],
      };
    case "breadcrumb":
      return {
        nav: [
          { a: "Home", href: "#" },
          { span: "/" },
          { a: "Library", href: "#" },
          { span: "/" },
          { span: "Data" },
        ],
        $: [breadcrumb()],
      };
    case "breadcrumbEllipsis":
      return {
        button: "…",
        $: [breadcrumbEllipsis()],
      };
    case "listItemButton":
      return { button: "Row action", $: [listItemButton()] };
    case "splitter":
      return {
        div: [
          { div: "Left pane", $: [splitterPanel()] },
          { div: null, $: [splitterHandle()] },
          { div: "Right pane", $: [splitterPanel()] },
        ],
        $: [splitter()],
      };
    default: {
      const _exhaustive: never = name;
      throw new Error(`missing fixture for ${_exhaustive}`);
    }
  }
}

// Ensure factories used (tree-shake noise / import side-effects for typecheck).
void [
  accordion,
  alert,
  breadcrumb,
  breadcrumbEllipsis,
  button,
  buttonGhost,
  buttonSwitch,
  combobox,
  command,
  commandItem,
  commandSearch,
  datePicker,
  details,
  dialog,
  drawer,
  fab,
  inputCheckbox,
  inputColor,
  inputDateTime,
  inputFile,
  inputNumber,
  inputOTP,
  inputPassword,
  inputRadio,
  inputRange,
  inputSearch,
  inputSwitch,
  inputText,
  link,
  linkButton,
  listItemButton,
  menu,
  pagination,
  popover,
  rating,
  segmented,
  select,
  selectBox,
  selectItem,
  selectList,
  splitter,
  splitterHandle,
  splitterPanel,
  tabs,
  textarea,
  toast,
  toggleGroup,
  tooltip,
];

describe("a11y matrix — interactive @domphy/ui patches", () => {
  beforeEach(() => {
    (HTMLDialogElement.prototype as any).showModal = function showModal() {
      this.open = true;
    };
    (HTMLDialogElement.prototype as any).close = function close() {
      this.open = false;
    };
    if (!(HTMLElement.prototype as any).close) {
      (HTMLElement.prototype as any).close = () => {};
    }
  });

  afterEach(() => {
    document.body.innerHTML = "";
    document.body.style.overflow = "";
    _resetScrollLock();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("inventory covers every interactive name that is still exported", () => {
    const exported = new Set(
      Object.entries(ui)
        .filter(([, value]) => typeof value === "function")
        .map(([name]) => name),
    );
    const missingExport = INTERACTIVE_NAMES.filter((n) => !exported.has(n));
    expect(
      missingExport,
      `interactive inventory lists removed exports: ${missingExport.join(", ")}`,
    ).toEqual([]);
  });

  it.each(INTERACTIVE_NAMES)("axe critical/serious clean: %s", async (name) => {
    // Real timers required: axe-core async hangs under vi.useFakeTimers().
    const { host } = render({
      div: [fixture(name)],
      dataTheme: "light",
      dataTone: "shift-0",
    } as DomphyElement);
    flushSync();
    // Allow floating/open side effects a macrotick without faking timers.
    await new Promise((r) => setTimeout(r, 0));
    flushSync();
    await auditCritical(name, host);
    // Listed in output for harness grep.
    // eslint-disable-next-line no-console
    console.log(`a11y-matrix ok ${name}`);
  }, 20_000);
});
