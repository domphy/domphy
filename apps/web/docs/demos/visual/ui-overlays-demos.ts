/**
 * Interactive @domphy/ui overlay/form-patch demos for the ui-overlays
 * Playwright suite (visual/ui-overlays.spec.ts). Each entry is a factory
 * mounting ONE patch demo; solo-mounted via
 * `?catalog=uioverlays&only=<name>` (see visual/standalone-entry.ts).
 */
import type { DomphyElement } from "@domphy/core";
import { toState } from "@domphy/core";
import {
  accordion,
  button,
  combobox,
  datePicker,
  details,
  dialog,
  drawer,
  inputText,
  menu,
  popover,
  select,
  selectBox,
  tabs,
  toast,
  tooltip,
} from "@domphy/ui";

function dialogDemo(): DomphyElement {
  const open = toState(false);
  return {
    div: [
      {
        button: "Open dialog",
        $: [button({ color: "primary" })],
        onClick: () => open.set(true),
      },
      {
        dialog: [
          { h2: "Dialog title" },
          { p: "Dialog body text." },
          {
            button: "Close",
            $: [button()],
            onClick: () => open.set(false),
          },
        ],
        $: [dialog({ open })],
      },
    ],
  };
}

function drawerDemo(): DomphyElement {
  const open = toState(false);
  return {
    div: [
      {
        button: "Open drawer",
        $: [button({ color: "primary" })],
        onClick: () => open.set(true),
      },
      {
        dialog: [
          { h2: "Drawer title" },
          { p: "Drawer body text." },
          {
            button: "Close",
            $: [button()],
            onClick: () => open.set(false),
          },
        ],
        $: [drawer({ open, placement: "end" })],
      },
    ],
  };
}

function tooltipDemo(): DomphyElement {
  return {
    button: "Hover me",
    $: [button(), tooltip({ content: "Helpful tip" })],
  };
}

function popoverDemo(): DomphyElement {
  return {
    button: "Open popover",
    $: [
      button(),
      popover({
        content: {
          div: [
            { button: "First action", type: "button" },
            { button: "Second action", type: "button" },
          ],
        },
      }),
    ],
  };
}

const OPTIONS = [
  { label: "Alpha", value: "alpha" },
  { label: "Beta", value: "beta" },
  { label: "Gamma", value: "gamma" },
];

function optionButtons(value: ReturnType<typeof toState<any>>): DomphyElement {
  return {
    div: OPTIONS.map((opt) => ({
      button: opt.label,
      type: "button",
      _key: opt.value,
      onClick: () => value.set(opt.value),
    })),
  };
}

function selectBoxDemo(): DomphyElement {
  const value = toState<any>("alpha");
  return {
    div: null,
    $: [
      selectBox({
        value,
        options: OPTIONS,
        content: optionButtons(value),
      }),
    ],
  };
}

function comboboxDemo(): DomphyElement {
  const value = toState<any>(null);
  return {
    div: null,
    $: [
      combobox({
        value,
        options: OPTIONS,
        content: optionButtons(value),
      }),
    ],
  };
}

function datePickerDemo(): DomphyElement {
  const value = toState<any>(null);
  return {
    input: null,
    $: [inputText(), datePicker({ value, locale: "en-US" })],
  };
}

function menuDemo(): DomphyElement {
  return {
    div: null,
    $: [
      menu({
        items: [
          { label: "Profile", key: "profile" },
          { label: "Settings", key: "settings" },
          { label: "Sign out", key: "signout" },
        ],
      }),
    ],
  };
}

function tabsDemo(): DomphyElement {
  return {
    div: null,
    $: [
      tabs({
        items: [
          {
            label: "Overview",
            key: "overview",
            content: { p: "Overview panel" },
          },
          { label: "API", key: "api", content: { p: "API panel" } },
          {
            label: "Examples",
            key: "examples",
            content: { p: "Examples panel" },
          },
        ],
      }),
    ],
  };
}

function accordionDemo(): DomphyElement {
  return {
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
  };
}

function toastDemo(): DomphyElement {
  const items = toState<number[]>([]);
  return {
    div: [
      {
        button: "Show toast",
        $: [button({ color: "primary" })],
        onClick: () =>
          items.set([...items.get(), (items.get().at(-1) ?? 0) + 1]),
      },
      {
        div: (l) =>
          items.get(l).map((id) => ({
            div: `Saved (#${id})`,
            _key: id,
            $: [toast({ position: "top-right" })],
          })),
      },
    ],
  };
}

function selectDemo(): DomphyElement {
  return {
    select: OPTIONS.map((opt) => ({
      option: opt.label,
      value: opt.value,
      _key: opt.value,
    })),
    $: [select()],
    ariaLabel: "Choose option",
  };
}

export const uiOverlayDemos: Record<string, () => DomphyElement> = {
  dialog: dialogDemo,
  drawer: drawerDemo,
  tooltip: tooltipDemo,
  popover: popoverDemo,
  selectBox: selectBoxDemo,
  combobox: comboboxDemo,
  datePicker: datePickerDemo,
  menu: menuDemo,
  tabs: tabsDemo,
  accordion: accordionDemo,
  toast: toastDemo,
  select: selectDemo,
};
