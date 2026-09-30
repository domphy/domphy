/**
 * Browser side of the @domphy/ui GEOMETRY audit (ui-geometry.spec.ts).
 *
 * Mounts every patch from packages/ui/tests/patch-catalog.ts (HOST +
 * PATCH_ARGS) with a text label — plus icon+label / checkbox+label / value /
 * placeholder variants — in five density sections, then measures real layout
 * (getBoundingClientRect, Range rects, scrollHeight, computed style) for the
 * invariants R1..R5 documented in ui-geometry.spec.ts. Bundled by esbuild with
 * @domphy/* aliased to SOURCE, so a stale dist can never hide a regression.
 */

import type { DomphyElement, State } from "@domphy/core";
import { ElementNode, rawHtml, toState } from "@domphy/core";
import { themeApply, themeColor, themeSpacing } from "@domphy/theme";
import * as ui from "@domphy/ui";
import {
  defaultContent,
  HOST,
  PATCH_ARGS,
} from "../../../packages/ui/tests/patch-catalog.ts";

// ── fixtures ────────────────────────────────────────────────────────────────

const ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M12 2a7 7 0 0 1 5.292 11.584A5.002 5.002 0 0 1 14 17.9V19a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1.1a5.002 5.002 0 0 1-3.292-4.316A7 7 0 0 1 12 2z"/></svg>';

/** Density sections: the attribute value themeDensity() reads (none = default). */
const DENSITIES = [
  { id: "default", attr: undefined },
  { id: "decrease-2", attr: "decrease-2" },
  { id: "decrease-1", attr: "decrease-1" },
  { id: "increase-1", attr: "increase-1" },
  { id: "increase-2", attr: "increase-2" },
] as const;

/** Modal patches are opened only while their own cell is measured. */
const MODAL = new Set(["dialog", "drawer"]);
/**
 * Patches whose real surface only exists while open — a floating panel portaled
 * out of the cell. Same treatment as MODAL: opened for its own measurement,
 * closed again. Every one of these takes an `open` prop; datePicker and menu do
 * not, so their panels are still unmeasured.
 */
const FLOATING = new Set(["popover", "tooltip", "selectBox", "combobox"]);
const OPENS = new Set([...MODAL, ...FLOATING]);

type Cell = {
  patch: string;
  variant: string;
  tree: DomphyElement;
  wide?: boolean;
};
const openStates = new Map<string, State<boolean>>();

function patchOf(name: string, extra?: unknown): unknown {
  const factory = (ui as unknown as Record<string, (a?: unknown) => unknown>)[
    name
  ];
  const arg = extra ?? PATCH_ARGS[name];
  return arg !== undefined ? factory(arg) : factory();
}

function iconNode(): DomphyElement {
  return {
    span: rawHtml(ICON_SVG),
    $: [ui.icon()],
    dataGeoIcon: "1",
  } as DomphyElement;
}

function baseTree(name: string, densityId: string): DomphyElement {
  const tag = HOST[name] as string;
  let content = defaultContent(tag);
  if (content === "content") content = "Label";
  let patchArg: unknown;
  if (OPENS.has(name)) {
    const state = toState(false);
    openStates.set(`${name}|${densityId}|default`, state);
    // Merged, not replaced: `content` / `options` are required props on the
    // floating patches, and dropping them makes the patch throw at mount.
    patchArg = {
      ...(PATCH_ARGS[name] as Record<string, unknown>),
      open: state,
    };
  }
  const el: Record<string, unknown> = {
    [tag]: content,
    $: [patchOf(name, patchArg)],
    dataGeoHost: "1",
  };
  if (name === "link" || name === "linkButton") el.href = "#";
  if (name === "image") {
    el.src =
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 18"><rect width="32" height="18" fill="#4f7cff"/></svg>',
      );
    el.alt = "";
  }
  if (name === "dialog" || name === "drawer") {
    el[tag] = [
      { h2: "Title" },
      { p: "Body" },
      { button: "OK", $: [ui.button()], dataGeoHost: "1" },
    ];
  }
  if (name === "inputOTP") {
    el.div = [
      { input: null, "aria-label": "1", maxlength: 1, value: "1" },
      { input: null, "aria-label": "2", maxlength: 1, value: "2" },
      { input: null, "aria-label": "3", maxlength: 1 },
      { input: null, "aria-label": "4", maxlength: 1 },
    ];
  }
  if (name === "inputPassword") el.div = null;
  if (name === "fab") {
    el.button = iconNode();
    el["aria-label"] = "Add";
  }
  if (name === "avatar") el.span = "AB";
  if (name === "splitter") {
    el.div = [
      { div: "A", $: [ui.splitterPanel()] },
      { div: null, $: [ui.splitterHandle()] },
      { div: "B", $: [ui.splitterPanel()] },
    ];
  }
  if (name === "tooltip" || name === "popover") el[tag] = "Label";
  return el as DomphyElement;
}

/**
 * Patches whose documented usage is a CONTAINER with typed children (their
 * @example in packages/ui/src/patches/*.ts). Child patches carry
 * data-geo-patch so a finding is attributed to the child's own name.
 */
function composite(name: string, densityId: string): Cell[] | undefined {
  /** An open state for one cell, registered so measureAll can open that cell's floating panel. */
  const opened = (variant: string): State<boolean> => {
    const state = toState(false);
    openStates.set(`${name}|${densityId}|${variant}`, state);
    return state;
  };
  const tagged = (
    patch: string,
    tree: Record<string, unknown>,
  ): DomphyElement =>
    ({ ...tree, dataGeoPatch: patch, dataGeoHost: "1" }) as DomphyElement;
  const cell = (variant: string, tree: DomphyElement): Cell => ({
    patch: name,
    variant,
    tree,
  });
  const host = (tree: Record<string, unknown>): DomphyElement =>
    ({ ...tree, dataGeoHost: "1" }) as DomphyElement;
  /** What a selectBox/combobox dropdown really holds: option rows, not a bare div. */
  const optionPanel = (): DomphyElement =>
    ({
      div: [
        tagged("selectItem", {
          div: "Alpha",
          $: [ui.selectItem({ value: "a" })],
        }),
        tagged("selectItem", {
          div: "Beta",
          $: [ui.selectItem({ value: "b" })],
        }),
      ],
      $: [ui.selectList({ name: "panel", value: toState<string | null>("a") })],
    }) as DomphyElement;
  switch (name) {
    case "accordion":
      return [
        cell(
          "default",
          host({
            div: [
              tagged("details", {
                details: [{ summary: "Label" }, { p: "Body" }],
                $: [ui.details()],
              }),
              tagged("details", {
                details: [{ summary: "Other" }, { p: "Body" }],
                $: [ui.details()],
              }),
            ],
            $: [ui.accordion()],
          }),
        ),
      ];
    case "card":
      return [
        cell("text", host({ div: "Label", $: [ui.card()] })),
        cell(
          "heading+paragraph",
          host({
            div: [
              tagged("heading", { h3: "Title", $: [ui.heading()] }),
              tagged("paragraph", { p: "Body", $: [ui.paragraph()] }),
            ],
            $: [ui.card()],
          }),
        ),
      ];
    case "command":
      return [
        cell(
          "default",
          host({
            div: [
              tagged("commandSearch", {
                input: null,
                placeholder: "Search",
                "aria-label": "Search",
                $: [ui.commandSearch()],
              }),
              tagged("commandItem", { button: "Label", $: [ui.commandItem()] }),
              tagged("commandItem", { button: "Other", $: [ui.commandItem()] }),
            ],
            $: [ui.command()],
          }),
        ),
      ];
    case "commandItem":
    case "commandSearch":
    case "selectItem":
    case "timelineItem":
    case "splitterPanel":
    case "splitterHandle":
    case "listItem":
    case "listItemButton":
      return []; // exercised inside their container's cell
    case "timeline":
      return [
        // The patch's own @example: two children directly under the <li>.
        cell(
          "doc-example",
          host({
            ol: [
              tagged("timelineItem", {
                li: [{ b: "2024" }, { p: "Event" }],
                $: [ui.timelineItem({ active: true })],
              }),
              tagged("timelineItem", {
                li: [{ b: "2025" }, { p: "Event" }],
                $: [ui.timelineItem({ last: true })],
              }),
            ],
            $: [ui.timeline()],
          }),
        ),
        // Content wrapped in one child (the grid's single right-hand item).
        cell(
          "wrapped",
          host({
            ol: [
              tagged("timelineItem", {
                li: [{ div: [{ b: "2024" }, { p: "Event" }] }],
                $: [ui.timelineItem({ active: true })],
              }),
              tagged("timelineItem", {
                li: [{ div: [{ b: "2025" }, { p: "Event" }] }],
                $: [ui.timelineItem({ last: true })],
              }),
            ],
            $: [ui.timeline()],
          }),
        ),
      ];
    case "list":
      return [
        cell(
          "default",
          host({
            ul: [
              tagged("listItem", { li: "Label", $: [ui.listItem()] }),
              tagged("listItem", {
                li: [iconNode(), "Label"],
                $: [ui.listItem()],
              }),
              {
                li: [
                  tagged("listItemButton", {
                    button: "Label",
                    $: [ui.listItemButton()],
                  }),
                ],
              },
              {
                li: [
                  tagged("listItemButton", {
                    button: [iconNode(), "Label"],
                    $: [ui.listItemButton()],
                  }),
                ],
              },
            ],
            $: [ui.list()],
          }),
        ),
      ];
    case "selectList":
      return [
        cell(
          "default",
          host({
            div: [
              tagged("selectItem", {
                div: "Alpha",
                $: [ui.selectItem({ value: "a" })],
              }),
              tagged("selectItem", {
                div: "Beta",
                $: [ui.selectItem({ value: "b" })],
              }),
            ],
            $: [
              ui.selectList({
                name: "pick",
                value: toState<string | null>("a"),
              }),
            ],
          }),
        ),
      ];
    case "selectBox":
      return [
        cell(
          "value",
          host({
            div: null,
            $: [
              ui.selectBox({
                options: [{ label: "Label", value: "a" }],
                value: toState<string | null>("a"),
                content: optionPanel(),
                open: opened("value"),
              }),
            ],
          }),
        ),
        cell(
          "empty",
          host({
            div: null,
            $: [
              ui.selectBox({
                options: [{ label: "Label", value: "a" }],
                content: optionPanel(),
                open: opened("empty"),
              }),
            ],
          }),
        ),
      ];
    case "combobox":
      return [
        cell(
          "value",
          host({
            div: null,
            $: [
              ui.combobox({
                options: [{ label: "Label", value: "a" }],
                value: toState<string | null>("a"),
                content: optionPanel(),
                open: opened("value"),
              }),
            ],
          }),
        ),
        cell(
          "multiple",
          host({
            div: null,
            $: [
              ui.combobox({
                multiple: true,
                options: [
                  { label: "Label", value: "a" },
                  { label: "Other", value: "b" },
                ],
                value: toState<string[]>(["a", "b"]),
                content: optionPanel(),
                open: opened("multiple"),
              }),
            ],
          }),
        ),
      ];
    case "datePicker":
      return [
        cell(
          "value",
          host({
            input: null,
            "aria-label": "Date",
            $: [
              ui.inputText(),
              ui.datePicker({
                value: toState<Date | null>(new Date(2026, 8, 30)),
              }),
            ],
          }),
        ),
        cell(
          "placeholder",
          host({
            input: null,
            "aria-label": "Date",
            placeholder: "Pick a date",
            $: [ui.inputText(), ui.datePicker()],
          }),
        ),
      ];
    case "splitter":
      return [
        cell(
          "default",
          host({
            div: [
              tagged("splitterPanel", { div: "A", $: [ui.splitterPanel()] }),
              tagged("splitterHandle", { div: null, $: [ui.splitterHandle()] }),
              tagged("splitterPanel", { div: "B", $: [ui.splitterPanel()] }),
            ],
            $: [ui.splitter()],
            style: { height: "80px" },
          }),
        ),
      ];
    case "formGroup":
      return [
        cell(
          "default",
          host({
            fieldset: [
              { legend: "Legend" },
              { label: "Name", $: [ui.label()] },
              tagged("inputText", {
                input: null,
                value: "Value",
                "aria-label": "Name",
                $: [ui.inputText()],
              }),
            ],
            $: [ui.formGroup()],
          }),
        ),
      ];
    case "empty":
      return [
        cell(
          "default",
          host({
            div: [
              { span: "!" },
              { p: "Label", $: [ui.paragraph()] },
              { span: "Detail", $: [ui.small()] },
            ],
            $: [ui.empty({})],
          }),
        ),
      ];
    case "table":
      return [
        cell(
          "default",
          host({
            table: [
              { thead: [{ tr: [{ th: "Head" }] }] },
              { tbody: [{ tr: [{ td: "Label" }] }] },
            ],
            $: [ui.table()],
          }),
        ),
      ];
    case "icon":
      return [
        cell(
          "default",
          host({ span: rawHtml(ICON_SVG), $: [ui.icon()], dataGeoIcon: "1" }),
        ),
      ];
    case "spinner":
      return [cell("default", host({ span: null, $: [ui.spinner()] }))];
    case "skeleton":
      return [cell("default", host({ div: null, $: [ui.skeleton()] }))];
    case "popover":
      return [
        cell(
          "default",
          host({
            button: "Label",
            $: [
              ui.button(),
              ui.popover({
                content: { div: "panel" },
                open: opened("default"),
              }),
            ],
          }),
        ),
      ];
    case "tooltip":
      return [
        cell(
          "default",
          host({
            button: "Label",
            $: [
              ui.button(),
              ui.tooltip({ content: "tip", open: opened("default") }),
            ],
          }),
        ),
      ];
    default:
      return undefined;
  }
}

function variantsOf(name: string, densityId: string): Cell[] {
  const built = composite(name, densityId);
  if (built) return built;
  const tag = HOST[name] as string;
  const cell = (variant: string, tree: DomphyElement): Cell => ({
    patch: name,
    variant,
    tree,
  });
  const cells: Cell[] = [];

  if (
    tag === "input" &&
    ![
      "inputCheckbox",
      "inputRadio",
      "inputSwitch",
      "inputRange",
      "inputColor",
      "inputFile",
    ].includes(name)
  ) {
    const value: Record<string, unknown> = {
      input: null,
      $: [patchOf(name)],
      dataGeoHost: "1",
      "aria-label": "field",
    };
    const numeric = name === "inputNumber";
    cells.push(
      cell("value", {
        ...value,
        value: numeric ? "42" : "Value",
      } as DomphyElement),
    );
    cells.push(
      cell("placeholder", {
        ...value,
        placeholder: "Placeholder",
      } as DomphyElement),
    );
    return cells;
  }
  if (["inputColor", "inputFile", "inputRange"].includes(name)) {
    cells.push(
      cell("default", {
        input: null,
        $: [patchOf(name)],
        dataGeoHost: "1",
        "aria-label": "field",
      } as DomphyElement),
    );
    return cells;
  }
  if (["inputCheckbox", "inputRadio", "inputSwitch"].includes(name)) {
    // A radio only stays checked while it is alone in its group, so each cell
    // gets its own name — with one shared name only the last radio in the
    // document is checked and the `checked` cell measures an unchecked control.
    const bare = (variant: string): DomphyElement =>
      ({
        input: null,
        $: [patchOf(name)],
        ...(name === "inputRadio"
          ? { name: `geo-${densityId}-${variant}` }
          : {}),
        dataGeoHost: "1",
        dataGeoIndicator: "1",
      }) as DomphyElement;
    // Every variant applies ui.label(): R4's truth (children share one vertical
    // centre) is a FLEX statement, and the documented way to put a control
    // beside text is the label patch. A bare <label> puts the control in an
    // inline formatting context, where its offset from the text is a font
    // metric (baseline vs em-box centre) that no CSS can zero out — measured:
    // vertical-align baseline leaves -1.5px at 16px, `middle` +2.5px.
    cells.push(
      cell("label-span", {
        label: [bare("span"), { span: "Label" }],
        $: [ui.label()],
      } as DomphyElement),
    );
    cells.push(
      cell("label-text", {
        label: [bare("text"), "Label"],
        $: [ui.label()],
      } as DomphyElement),
    );
    cells.push(
      cell("checked", {
        label: [{ ...bare("checked"), checked: true }, { span: "Label" }],
        $: [ui.label()],
      } as DomphyElement),
    );
    return cells;
  }
  if (name === "textarea") {
    cells.push(
      cell("value", {
        textarea: "Value",
        $: [ui.textarea()],
        dataGeoHost: "1",
        "aria-label": "t",
      } as DomphyElement),
    );
    cells.push(
      cell("placeholder", {
        textarea: "",
        placeholder: "Placeholder",
        $: [ui.textarea()],
        dataGeoHost: "1",
        "aria-label": "t",
      } as DomphyElement),
    );
    return cells;
  }
  if (name === "select") {
    cells.push(
      cell("default", {
        select: [
          { option: "Label", value: "a" },
          { option: "Other", value: "b" },
        ],
        $: [ui.select()],
        dataGeoHost: "1",
        "aria-label": "s",
      } as DomphyElement),
    );
    return cells;
  }
  if (name === "menu") {
    cells.push(
      cell("default", {
        div: null,
        $: [
          ui.menu({
            items: [
              { label: "Profile", key: "p" },
              { label: "Settings", key: "s" },
              { label: "Sign out", key: "o" },
            ],
          }),
        ],
        dataGeoHost: "1",
      } as DomphyElement),
    );
    return cells;
  }
  if (name === "tabs") {
    cells.push(
      cell("default", {
        div: null,
        $: [
          ui.tabs({
            items: [
              { key: "a", label: "One", content: { div: "A" } },
              { key: "b", label: "Two", content: { div: "B" } },
              { key: "c", label: "Three", content: { div: "C" } },
            ],
          }),
        ],
        dataGeoHost: "1",
      } as DomphyElement),
    );
    return cells;
  }
  if (name === "toggleGroup" || name === "segmented") {
    const factory = name === "toggleGroup" ? ui.toggleGroup : ui.segmented;
    cells.push(
      cell("default", {
        div: null,
        $: [
          factory({
            items: [
              { label: "One", key: "a" },
              { label: "Two", key: "b" },
              { label: "Three", key: "c" },
            ],
          }),
        ],
        dataGeoHost: "1",
      } as DomphyElement),
    );
    return cells;
  }
  if (name === "pagination") {
    cells.push(
      cell("default", {
        div: null,
        $: [ui.pagination({ page: 2, total: 8 })],
        dataGeoHost: "1",
      } as DomphyElement),
    );
    return cells;
  }
  cells.push(
    cell(
      name === "dialog" || name === "drawer" ? "open" : "default",
      baseTree(name, densityId),
    ),
  );

  // icon + label variants for the button family and other icon-bearing hosts
  const withIcon = (
    host: string,
    extra: Record<string, unknown> = {},
    factory: () => unknown = () => patchOf(name),
  ): DomphyElement =>
    ({
      [host]: [iconNode(), "Label"],
      $: [factory()],
      dataGeoHost: "1",
      ...extra,
    }) as DomphyElement;
  if (
    [
      "button",
      "buttonGhost",
      "buttonSwitch",
      "tag",
      "badge",
      "listItemButton",
    ].includes(name)
  ) {
    cells.push(cell("icon+label", withIcon(tag)));
    cells.push(
      cell("label+icon", {
        [tag]: ["Label", iconNode()],
        $: [patchOf(name)],
        dataGeoHost: "1",
      } as DomphyElement),
    );
  }
  if (name === "button") {
    for (const variant of ["solid", "ghost"] as const) {
      cells.push(
        cell(variant, {
          button: "Label",
          $: [ui.button({ variant })],
          dataGeoHost: "1",
        } as DomphyElement),
      );
      cells.push(
        cell(`${variant}+icon`, {
          button: [iconNode(), "Label"],
          $: [ui.button({ variant })],
          dataGeoHost: "1",
        } as DomphyElement),
      );
    }
    for (const size of ["small", "large"] as const) {
      cells.push(
        cell(size, {
          button: "Label",
          $: [ui.button({ size })],
          dataGeoHost: "1",
        } as DomphyElement),
      );
    }
  }
  if (name === "buttonGhost") {
    for (const size of ["small", "large"] as const) {
      cells.push(
        cell(size, {
          button: "Label",
          $: [ui.buttonGhost({ size })],
          dataGeoHost: "1",
        } as DomphyElement),
      );
    }
  }
  if (name === "linkButton") {
    cells.push(
      cell("icon+label", {
        a: [iconNode(), "Label"],
        href: "#",
        $: [ui.linkButton()],
        dataGeoHost: "1",
      } as DomphyElement),
    );
  }
  if (name === "link") {
    cells.push(
      cell("icon+label", {
        a: [iconNode(), "Label"],
        href: "#",
        $: [ui.link()],
        dataGeoHost: "1",
      } as DomphyElement),
    );
  }
  return cells;
}

/** One row mixing every same-height-by-intent control (R5 sibling row). */
function mixedRow(): Cell {
  const host = (tree: Record<string, unknown>, patch: string) =>
    ({ ...tree, dataGeoHost: "1", dataGeoPatch: patch }) as DomphyElement;
  return {
    patch: "row(mixed)",
    variant: "toolbar",
    wide: true,
    tree: {
      div: [
        host({ button: "Label", $: [ui.button()] }, "button"),
        host(
          { button: "Label", $: [ui.button({ variant: "solid" })] },
          "button(solid)",
        ),
        host({ button: "Label", $: [ui.buttonGhost()] }, "buttonGhost"),
        host({ a: "Label", href: "#", $: [ui.linkButton()] }, "linkButton"),
        host(
          {
            input: null,
            value: "Value",
            $: [ui.inputText()],
            "aria-label": "a",
          },
          "inputText",
        ),
        host(
          {
            input: null,
            value: "42",
            $: [ui.inputNumber()],
            "aria-label": "b",
          },
          "inputNumber",
        ),
        host(
          {
            input: null,
            value: "Query",
            $: [ui.inputSearch()],
            "aria-label": "c",
          },
          "inputSearch",
        ),
        host(
          {
            select: [{ option: "Label", value: "a" }],
            $: [ui.select()],
            "aria-label": "d",
          },
          "select",
        ),
        // The fake fields belong in the row too: a selectBox or a combobox is
        // used exactly where an inputText is, and their height only ever agreed
        // with it by coincidence until they were measured against it.
        host(
          { ...(baseTree("selectBox", "row") as Record<string, unknown>) },
          "selectBox",
        ),
        host(
          { ...(baseTree("combobox", "row") as Record<string, unknown>) },
          "combobox",
        ),
        host(
          { ...(baseTree("inputDateTime", "row") as Record<string, unknown>) },
          "inputDateTime",
        ),
        host({ span: "Label", $: [ui.tag()] }, "tag"),
        host({ span: "Label", $: [ui.badge()] }, "badge"),
      ],
      $: [ui.toolbar()],
      dataGeoRow: "1",
    } as DomphyElement,
  };
}

// ── mount ───────────────────────────────────────────────────────────────────

/**
 * Subset to mount, set by the spec before the bundle runs (GEOMETRY_PATCHES).
 * Empty = every patch. Filtering here — not at assertion time — is what makes a
 * narrowed run fast enough for several agents to work in parallel.
 */
const ONLY = new Set(
  (globalThis as { __geoPatches?: string[] }).__geoPatches ?? [],
);

function buildCells(densityId: string): Cell[] {
  const names = Object.keys(HOST).filter(
    (n) =>
      typeof (ui as Record<string, unknown>)[n] === "function" &&
      (ONLY.size === 0 || ONLY.has(n)),
  );
  const cells: Cell[] = [];
  for (const name of names) {
    if (densityId !== "default" && MODAL.has(name)) continue;
    cells.push(...variantsOf(name, densityId));
  }
  // The mixed toolbar row compares patches against each other, so it is only
  // meaningful when every patch is mounted.
  if (ONLY.size === 0) cells.push(mixedRow());
  return cells;
}

function cellNode(cell: Cell, densityId: string): DomphyElement {
  return {
    div: [
      {
        small: `${cell.patch} / ${cell.variant}`,
        style: {
          display: "block",
          marginBottom: "4px",
          fontFamily: "monospace",
          fontSize: "11px",
          lineHeight: "1.2",
          color: (l) => themeColor(l, "text"),
        },
      },
      {
        div: [cell.tree],
        dataGeoCell: cell.patch,
        dataGeoVariant: cell.variant,
        dataGeoDensity: densityId,
        style: {
          display: "block",
          // The mixed row holds every same-intent control at increase-2
          // density and a 24px font: narrower and the toolbar squeezes its own
          // fields, which reads as a fields bug rather than a stage one.
          width: cell.wide ? "2900px" : "480px",
          padding: themeSpacing(2),
          border: (l) => `1px dashed ${themeColor(l, "border")}`,
          color: (l) => themeColor(l, "text"),
        },
      },
    ],
    style: { minWidth: "0", ...(cell.wide ? { gridColumn: "1 / -1" } : {}) },
  } as DomphyElement;
}

function stageTree(): DomphyElement {
  const sections: DomphyElement[] = DENSITIES.map((density) => {
    const cells = buildCells(density.id);
    // One group per PATCH: that group is the patch's contact sheet, so a
    // screenshot of it shows every variant of exactly one patch.
    const byPatch = new Map<string, Cell[]>();
    for (const c of cells)
      byPatch.set(c.patch, [...(byPatch.get(c.patch) ?? []), c]);
    const groups: DomphyElement[] = [];
    for (const [patch, list] of byPatch) {
      groups.push({
        div: list.map((c) => cellNode(c, density.id)),
        dataGeoGroup: `${density.id}-${patch}`,
        dataGeoSheet: patch,
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, 500px)",
          gap: "12px",
          alignItems: "start",
          padding: "8px",
        },
      } as DomphyElement);
    }
    return {
      section: groups,
      dataGeoSection: density.id,
      ...(density.attr ? { dataDensity: density.attr } : {}),
      style: { display: "block" },
    } as DomphyElement;
  });
  return {
    div: sections,
    dataGeoStage: "1",
    style: {
      width: "3000px",
      backgroundColor: (l) => themeColor(l, "inherit"),
      color: (l) => themeColor(l, "text"),
    },
  } as DomphyElement;
}

// ── measurement ─────────────────────────────────────────────────────────────

export type Finding = {
  rule: "R0" | "R1" | "R2" | "R3" | "R4" | "R5";
  patch: string;
  variant: string;
  density: string;
  el: string;
  /** px offset / overflow */
  measured: number;
  detail: string;
};

const cs = (e: Element) => getComputedStyle(e);
const isBox = (e: Element) => {
  const d = cs(e).display;
  return d !== "inline" && d !== "contents" && d !== "none";
};

function describe(e: Element): string {
  const own = Array.from(e.childNodes)
    .filter((n) => n.nodeType === 3)
    .map((n) => (n.textContent ?? "").trim())
    .join("")
    .slice(0, 14);
  const type = e.getAttribute("type");
  const role = e.getAttribute("role");
  return `${e.tagName.toLowerCase()}${type ? `[${type}]` : ""}${role ? `[role=${role}]` : ""}${own ? ` "${own}"` : ""}`;
}

const probeCache = new Map<string, number>();
function lineHeightPx(e: Element): number {
  const s = cs(e);
  if (s.lineHeight !== "normal") return Number.parseFloat(s.lineHeight);
  const key = `${s.fontFamily}|${s.fontSize}|${s.fontWeight}`;
  const hit = probeCache.get(key);
  if (hit !== undefined) return hit;
  const probe = document.createElement("span");
  probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;line-height:normal;font-family:${s.fontFamily};font-size:${s.fontSize};font-weight:${s.fontWeight}`;
  probe.textContent = "Hg";
  document.body.appendChild(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  probeCache.set(key, h);
  return h;
}

type Box = { top: number; bottom: number; left: number; right: number };
const centreY = (b: Box) => (b.top + b.bottom) / 2;
const centreX = (b: Box) => (b.left + b.right) / 2;

function paddingBox(e: Element): Box {
  const r = e.getBoundingClientRect();
  const s = cs(e);
  return {
    top: r.top + Number.parseFloat(s.borderTopWidth),
    bottom: r.bottom - Number.parseFloat(s.borderBottomWidth),
    left: r.left + Number.parseFloat(s.borderLeftWidth),
    right: r.right - Number.parseFloat(s.borderRightWidth),
  };
}

/** Content of a closed <details> is not rendered (only its <summary> is). */
function isInClosedDetails(e: Element): boolean {
  const details = e.parentElement?.closest("details:not([open])");
  return !!details && !e.closest("summary");
}

function textNodesUnder(root: Element): Text[] {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n as Text;
    if (!(text.textContent ?? "").trim()) continue;
    const parent = text.parentElement;
    if (!parent) continue;
    if (parent.closest("option, script, style, svg, textarea, select"))
      continue;
    if (isInClosedDetails(parent)) continue;
    out.push(text);
  }
  return out;
}

function textRects(nodes: Text[]): Box[] {
  const out: Box[] = [];
  for (const node of nodes) {
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const r of Array.from(range.getClientRects())) {
      if (r.width <= 1 && r.height <= 1) continue; // visually hidden
      out.push({ top: r.top, bottom: r.bottom, left: r.left, right: r.right });
    }
  }
  return out;
}

function union(boxes: Box[]): Box {
  return {
    top: Math.min(...boxes.map((b) => b.top)),
    bottom: Math.max(...boxes.map((b) => b.bottom)),
    left: Math.min(...boxes.map((b) => b.left)),
    right: Math.max(...boxes.map((b) => b.right)),
  };
}

const CONTROL_TAGS = new Set([
  "button",
  "a",
  "summary",
  "label",
  "li",
  "option",
  "select",
  "input",
  "textarea",
  "th",
  "td",
]);
const CONTROL_ROLES = new Set([
  "button",
  "tab",
  "menuitem",
  "option",
  "checkbox",
  "radio",
  "switch",
  "link",
  "menuitemcheckbox",
  "menuitemradio",
  "treeitem",
  "listitem",
]);

function paintsBox(s: CSSStyleDeclaration): boolean {
  const alpha = (c: string) => {
    if (c === "transparent") return 0;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return 1;
    const parts = m[1]!.split(/[ ,/]+/).filter(Boolean);
    return parts.length > 3 ? Number.parseFloat(parts[3]!) : 1;
  };
  if (alpha(s.backgroundColor) > 0.02) return true;
  if (
    ["Top", "Bottom", "Left", "Right"].some(
      (side) =>
        (s as unknown as Record<string, string>)[`border${side}Style`] !==
          "none" &&
        Number.parseFloat(
          (s as unknown as Record<string, string>)[`border${side}Width`],
        ) > 0,
    )
  )
    return true;
  if (s.outlineStyle !== "none" && Number.parseFloat(s.outlineWidth) > 0)
    return true;
  return false;
}

/** A ::before/::after box (in flow or positioned) about as tall as the text line makes the element a composite (steps li, timeline li), not a single-line control. */
function hasBlockPseudo(a: Element, lh: number): boolean {
  return ["::before", "::after"].some((pseudo) => {
    const p = getComputedStyle(a, pseudo);
    if (p.content === "none" || p.content === "normal") return false;
    return Number.parseFloat(p.height) > 0.8 * lh;
  });
}

function isControlLike(a: Element): boolean {
  const role = a.getAttribute("role");
  if (CONTROL_TAGS.has(a.tagName.toLowerCase())) return true;
  if (role && CONTROL_ROLES.has(role)) return true;
  return paintsBox(cs(a));
}

const FORM_FIELD = (e: Element) => {
  const tag = e.tagName.toLowerCase();
  if (tag === "textarea" || tag === "select") return true;
  if (tag !== "input") return false;
  const type = (e as HTMLInputElement).type;
  return [
    "text",
    "search",
    "email",
    "url",
    "tel",
    "password",
    "number",
    "date",
    "datetime-local",
    "time",
    "month",
    "week",
  ].includes(type);
};

/**
 * How far IN-FLOW content reaches past an element's padding box (px, 0 when it
 * stays inside). scrollHeight/scrollWidth also count out-of-flow descendants —
 * an absolutely positioned connector, notch or arrow is at an AUTHORED offset,
 * not content that failed to fit — so a box that clips nothing (overflow
 * visible) is only measured on what is still in flow. `position: fixed` is
 * skipped for the same reason a few lines below.
 */
function inFlowOverflow(e: Element, axis: "y" | "x"): number {
  const box = paddingBox(e);
  const outOfFlow = (d: Element): boolean => {
    for (let p: Element | null = d; p && p !== e; p = p.parentElement) {
      const pos = cs(p).position;
      if (pos === "absolute" || pos === "fixed") return true;
    }
    return false;
  };
  let over = 0;
  for (const d of Array.from(e.querySelectorAll("*"))) {
    const s = cs(d);
    if (s.display === "none" || outOfFlow(d)) continue;
    const r = d.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    over = Math.max(
      over,
      axis === "y" ? r.bottom - box.bottom : r.right - box.right,
    );
  }
  // A long word or a tall line box overflows with no element of its own.
  for (const t of textNodesUnder(e)) {
    if (t.parentElement && outOfFlow(t.parentElement)) continue;
    for (const r of textRects([t]))
      over = Math.max(
        over,
        axis === "y" ? r.bottom - box.bottom : r.right - box.right,
      );
  }
  return over;
}

/** Everything measurable inside one cell container. */
function measureCell(container: HTMLElement, out: Finding[]): void {
  const patchName = container.getAttribute("data-geo-cell") ?? "?";
  const variant = container.getAttribute("data-geo-variant") ?? "?";
  const density = container.getAttribute("data-geo-density") ?? "?";
  const push = (
    rule: Finding["rule"],
    el: Element,
    measured: number,
    detail: string,
    patch = patchName,
  ) => {
    const named = el
      .closest("[data-geo-patch]")
      ?.getAttribute("data-geo-patch");
    out.push({
      rule,
      patch: named ?? patch,
      variant,
      density,
      el: describe(el),
      measured: Math.round(measured * 100) / 100,
      detail,
    });
  };

  const all = [
    container,
    ...Array.from(container.querySelectorAll("*")),
  ].filter((e) => !(e instanceof SVGElement));
  const hostRect = container.getBoundingClientRect();
  // childNodes, not children: a floating panel measured as a cell can be one
  // text node ("tip"), which is still content that laid out.
  if (hostRect.height === 0 || container.childNodes.length === 0) {
    push("R0", container, 0, "cell has no layout box");
    return;
  }

  // A visually-hidden node is clipped to 1px by definition; nothing to measure.
  if (patchName === "visuallyHidden") return;

  // R2 — no unintended overflow.
  for (const e of all) {
    if (e === container) continue;
    const s = cs(e);
    if (
      s.display === "inline" ||
      s.display === "contents" ||
      s.display === "none"
    )
      continue;
    if (e.clientHeight === 0 && e.clientWidth === 0) continue;
    if (s.position === "fixed") continue;
    if (isInClosedDetails(e)) continue;
    const oy = s.overflowY;
    const ox = s.overflowX;
    if (
      (oy === "visible" || oy === "hidden" || oy === "clip") &&
      e.scrollHeight > e.clientHeight + 1 &&
      (oy !== "visible" || inFlowOverflow(e, "y") > 1)
    ) {
      push(
        "R2",
        e,
        e.scrollHeight - e.clientHeight,
        `scrollHeight ${e.scrollHeight} > clientHeight ${e.clientHeight} (overflow-y ${oy})`,
      );
    }
    if (
      (ox === "visible" || ox === "hidden" || ox === "clip") &&
      e.scrollWidth > e.clientWidth + 1 &&
      (ox !== "visible" || inFlowOverflow(e, "x") > 1)
    ) {
      push(
        "R2",
        e,
        e.scrollWidth - e.clientWidth,
        `scrollWidth ${e.scrollWidth} > clientWidth ${e.clientWidth} (overflow-x ${ox})`,
      );
    }
  }

  // Text holders → candidate single-line controls.
  const textNodes = textNodesUnder(container);
  const candidates = new Set<Element>();
  for (const node of textNodes) {
    let boxEl: Element | null = node.parentElement;
    while (boxEl && boxEl !== container && !isBox(boxEl))
      boxEl = boxEl.parentElement;
    for (
      let a: Element | null = boxEl;
      a && a !== container;
      a = a.parentElement
    ) {
      if (isBox(a)) candidates.add(a);
    }
    // R2b — text clipped by an ancestor with overflow hidden/clip.
    const range = document.createRange();
    range.selectNodeContents(node);
    const rects = textRects([node]);
    if (rects.length === 0) continue;
    const t = union(rects);
    for (
      let p: Element | null = node.parentElement;
      p && p !== container.parentElement;
      p = p.parentElement
    ) {
      const s = cs(p);
      const cy = s.overflowY === "hidden" || s.overflowY === "clip";
      const cx = s.overflowX === "hidden" || s.overflowX === "clip";
      if (!cy && !cx) continue;
      const box = paddingBox(p);
      if (cy && (t.top < box.top - 1 || t.bottom > box.bottom + 1)) {
        push(
          "R2",
          p,
          Math.max(box.top - t.top, t.bottom - box.bottom),
          `text "${(node.textContent ?? "").trim().slice(0, 10)}" clipped vertically by ${describe(p)} (text ${t.top.toFixed(1)}..${t.bottom.toFixed(1)} vs box ${box.top.toFixed(1)}..${box.bottom.toFixed(1)})`,
        );
      }
      if (cx && (t.left < box.left - 1 || t.right > box.right + 1)) {
        push(
          "R2",
          p,
          Math.max(box.left - t.left, t.right - box.right),
          `text clipped horizontally by ${describe(p)}`,
        );
      }
    }
  }

  for (const a of candidates) {
    if (!isControlLike(a)) continue;
    if (FORM_FIELD(a)) continue;
    const nodes = textNodesUnder(a);
    const rects = textRects(nodes);
    if (rects.length === 0) continue;
    const t = union(rects);
    const holders = new Set(nodes.map((n) => n.parentElement as Element));
    const lh = Math.max(...Array.from(holders).map(lineHeightPx));
    const fs = Math.max(
      ...Array.from(holders).map((h) => Number.parseFloat(cs(h).fontSize)),
    );
    const centres = rects.map(centreY);
    const singleBand = Math.max(...centres) - Math.min(...centres) <= 0.5 * fs;
    const ar = a.getBoundingClientRect();
    if (!singleBand || ar.height > 4 * lh + 2) continue;
    if (hasBlockPseudo(a, lh)) continue;
    const s = cs(a);
    const pb = paddingBox(a);

    // R1 — label vertically centred in the control's padding box.
    const dy = centreY(t) - centreY(pb);
    if (Math.abs(dy) > 1) {
      push(
        "R1",
        a,
        dy,
        `text centre ${centreY(t).toFixed(2)} vs padding-box centre ${centreY(pb).toFixed(2)} (height ${ar.height.toFixed(1)}, line-height ${lh.toFixed(1)}, display ${s.display})`,
      );
    }
    // R3 — line box fits the content box.
    const content =
      ar.height -
      Number.parseFloat(s.borderTopWidth) -
      Number.parseFloat(s.borderBottomWidth) -
      Number.parseFloat(s.paddingTop) -
      Number.parseFloat(s.paddingBottom);
    if (content < lh - 0.5) {
      push(
        "R3",
        a,
        lh - content,
        `content box ${content.toFixed(1)}px < line-height ${lh.toFixed(1)}px (height ${ar.height.toFixed(1)}, paddingBlock ${s.paddingTop}/${s.paddingBottom}, display ${s.display})`,
      );
    }
    // R4 — direct children (text runs, icons, indicators) share one vertical centre.
    const items: { c: number; what: string }[] = [];
    for (const child of Array.from(a.childNodes)) {
      if (child.nodeType === 3) {
        if (!(child.textContent ?? "").trim()) continue;
        const r = textRects([child as Text]);
        if (r.length) items.push({ c: centreY(union(r)), what: "text" });
      } else if (child.nodeType === 1) {
        const ce = child as Element;
        const cst = cs(ce);
        if (
          cst.display === "none" ||
          cst.position === "absolute" ||
          cst.position === "fixed"
        )
          continue;
        const r = ce.getBoundingClientRect();
        if (r.width <= 1 || r.height <= 1) continue;
        const ownText = textNodesUnder(ce);
        const rs = textRects(ownText);
        const c =
          ce.hasAttribute("data-geo-icon") ||
          ownText.length === 0 ||
          ce.tagName.toLowerCase() === "input"
            ? centreY(r)
            : centreY(union(rs));
        items.push({ c, what: describe(ce) });
      }
    }
    if (items.length >= 2) {
      const spread =
        Math.max(...items.map((i) => i.c)) - Math.min(...items.map((i) => i.c));
      if (spread > 1) {
        push(
          "R4",
          a,
          spread,
          `child centres differ: ${items.map((i) => `${i.what}@${i.c.toFixed(1)}`).join(" | ")}`,
        );
      }
    }
  }

  // Form fields have no text node: the inner editor is centred in the content
  // box, so the value's offset from the padding-box centre is half the
  // difference between the top and bottom (padding + border) — plus R3.
  for (const f of all.filter(FORM_FIELD)) {
    const s = cs(f);
    if (f.getBoundingClientRect().height === 0) continue;
    const top =
      Number.parseFloat(s.paddingTop) + Number.parseFloat(s.borderTopWidth);
    const bottom =
      Number.parseFloat(s.paddingBottom) +
      Number.parseFloat(s.borderBottomWidth);
    const dy = (top - bottom) / 2;
    if (Math.abs(dy) > 1) {
      push(
        "R1",
        f,
        dy,
        `asymmetric block padding+border top ${top.toFixed(1)} / bottom ${bottom.toFixed(1)} shifts the value ${dy.toFixed(1)}px`,
      );
    }
    const lh = lineHeightPx(f);
    const r = f.getBoundingClientRect();
    const content = r.height - top - bottom;
    if (f.tagName.toLowerCase() !== "textarea" && content < lh - 0.5) {
      push(
        "R3",
        f,
        lh - content,
        `content box ${content.toFixed(1)}px < line-height ${lh.toFixed(1)}px (height ${r.height.toFixed(1)})`,
      );
    }
  }

  // R4 — indicator (checkbox / radio / switch) vs label text.
  for (const indicator of Array.from(
    container.querySelectorAll("[data-geo-indicator]"),
  )) {
    const label = indicator.closest("label");
    if (!label) continue;
    const nodes = textNodesUnder(label);
    const rects = textRects(nodes);
    if (rects.length === 0) continue;
    const dy =
      centreY(indicator.getBoundingClientRect()) - centreY(union(rects));
    if (Math.abs(dy) > 1) {
      push(
        "R4",
        indicator,
        dy,
        `indicator centre ${centreY(indicator.getBoundingClientRect()).toFixed(2)} vs label text centre ${centreY(union(rects)).toFixed(2)}`,
      );
    }
  }

  // R4 — icon-only control: icon centred in the control.
  for (const icon of Array.from(
    container.querySelectorAll("[data-geo-icon]"),
  )) {
    const host = icon.parentElement;
    if (!host || host === container) continue;
    if (textNodesUnder(host).length > 0) continue;
    const pb = paddingBox(host);
    const ir = icon.getBoundingClientRect();
    const dy = centreY(ir) - centreY(pb);
    const dx = centreX(ir) - centreX(pb);
    if (Math.abs(dy) > 1 || Math.abs(dx) > 1) {
      push(
        "R4",
        icon,
        Math.max(Math.abs(dy), Math.abs(dx)),
        `icon-only: centre offset dx ${dx.toFixed(2)}, dy ${dy.toFixed(2)} in ${describe(host)}`,
      );
    }
  }

  // R5 — sibling items of one kind share a height (pagination items, tabs, ...).
  const seen = new Set<Element>();
  for (const e of all) {
    const parent = e.parentElement;
    if (!parent || seen.has(parent) || parent === container) continue;
    seen.add(parent);
    const kids = Array.from(parent.children).filter((c) => {
      const s = cs(c);
      return (
        s.display !== "none" &&
        s.position !== "absolute" &&
        s.position !== "fixed" &&
        c.getBoundingClientRect().height > 0
      );
    });
    const groups = new Map<string, Element[]>();
    for (const k of kids) {
      const key = `${k.tagName}|${k.className}`;
      groups.set(key, [...(groups.get(key) ?? []), k]);
    }
    for (const list of groups.values()) {
      if (list.length < 2 || !list.every((k) => isControlLike(k))) continue;
      const tops = list.map((k) => k.getBoundingClientRect().top);
      if (Math.max(...tops) - Math.min(...tops) > 24) continue; // wrapped / stacked
      const heights = list.map((k) => k.getBoundingClientRect().height);
      const spread = Math.max(...heights) - Math.min(...heights);
      if (spread > 1)
        push(
          "R5",
          parent,
          spread,
          `sibling ${describe(list[0]!)} items differ in height: ${heights.map((h) => h.toFixed(1)).join(", ")}`,
        );
    }
  }

  // R5 — mixed toolbar row: form controls share a height and a centre line.
  if (container.querySelector("[data-geo-row]")) {
    const row = container.querySelector("[data-geo-row]") as HTMLElement;
    const kids = Array.from(row.children).filter((k) =>
      [
        "button(",
        "button",
        "buttonGhost",
        "linkButton",
        "inputText",
        "inputNumber",
        "inputSearch",
        "select",
        "selectBox",
        "combobox",
        "inputDateTime",
      ].some(
        (n) =>
          k.getAttribute("data-geo-patch") === n ||
          (n === "button(" &&
            (k.getAttribute("data-geo-patch") ?? "").startsWith("button(")),
      ),
    );
    const boxes = kids.map((k) => k.getBoundingClientRect());
    const h = boxes.map((b) => b.height);
    const spreadH = Math.max(...h) - Math.min(...h);
    if (spreadH > 2) {
      push(
        "R5",
        row,
        spreadH,
        `same-intent controls differ in height: ${kids.map((k, i) => `${k.getAttribute("data-geo-patch")}=${h[i]!.toFixed(1)}`).join(", ")}`,
        "row(mixed)",
      );
    }
    const cy = boxes.map((b) => (b.top + b.bottom) / 2);
    const spreadC = Math.max(...cy) - Math.min(...cy);
    if (spreadC > 1) {
      push(
        "R5",
        row,
        spreadC,
        `centre lines differ: ${kids.map((k, i) => `${k.getAttribute("data-geo-patch")}@${cy[i]!.toFixed(1)}`).join(", ")}`,
        "row(mixed)",
      );
    }
  }
}

async function frames(count = 2): Promise<void> {
  for (let i = 0; i < count; i++)
    await new Promise((r) => requestAnimationFrame(() => r(null)));
}

async function measureAll(): Promise<Finding[]> {
  const out: Finding[] = [];
  const cells = Array.from(
    document.querySelectorAll<HTMLElement>("[data-geo-cell]"),
  );
  for (const container of cells) {
    const patch = container.getAttribute("data-geo-cell") as string;
    const density = container.getAttribute("data-geo-density");
    const cellVariant = container.getAttribute("data-geo-variant") ?? "default";
    // A floating trigger is measured at every density; its PANEL is opened
    // only in the default section — one open per config is enough to measure a
    // panel, and opening four more per patch tripled the sweep.
    const state =
      MODAL.has(patch) || (FLOATING.has(patch) && density === "default")
        ? openStates.get(`${patch}|${density}|${cellVariant}`)
        : undefined;
    if (state) {
      state.set(true);
      await frames(3);
    }
    if (patch === "toast") continue; // portaled to a fixed stack: measured below
    measureCell(container, out);
    // A floating surface portals OUT of its cell, so the cell above measured
    // only the trigger: the panel itself (tooltip bubble, popover surface,
    // selectBox/combobox dropdown) is measured here, while it is open.
    if (state) {
      const panels = Array.from(
        document.querySelectorAll<HTMLElement>("[data-domphy-floating-kind]"),
      );
      // R0 for a floating patch is "the surface exists when open" — it is also
      // what proves this branch still measures anything if a patch ever stops
      // honouring its `open` prop.
      if (FLOATING.has(patch) && panels.length === 0) {
        out.push({
          rule: "R0",
          patch,
          variant: cellVariant,
          density: density ?? "default",
          el: "panel",
          measured: 0,
          detail: "open=true mounted no floating panel",
        });
      }
      for (const panel of panels) {
        panel.setAttribute("data-geo-cell", patch);
        panel.setAttribute("data-geo-variant", "panel");
        panel.setAttribute("data-geo-density", density ?? "default");
        measureCell(panel, out);
      }
      state.set(false);
      // dialog/drawer close with a fade; wait until no modal is left open so the document is not inert.
      for (let i = 0; i < 60 && document.querySelector("dialog[open]"); i++)
        await frames(1);
      await frames(2);
    }
  }
  for (const stack of Array.from(
    document.querySelectorAll<HTMLElement>("[id^='domphy-toast-']"),
  )) {
    stack.setAttribute("data-geo-cell", "toast");
    stack.setAttribute("data-geo-variant", "portal");
    stack.setAttribute("data-geo-density", "portal");
    measureCell(stack, out);
  }
  return out;
}

/** Ring extent (px) a focused control paints beyond its border box vs. any clipping ancestor. */
function focusRingFindings(): Finding[] {
  const out: Finding[] = [];
  const containers = Array.from(
    document.querySelectorAll<HTMLElement>("[data-geo-cell]"),
  ).filter((c) => c.getAttribute("data-geo-density") === "default");
  for (const container of containers) {
    const patch = container.getAttribute("data-geo-cell") as string;
    const variant = container.getAttribute("data-geo-variant") as string;
    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(
        "button, a[href], input, select, textarea, summary, [tabindex]:not([tabindex='-1'])",
      ),
    );
    for (const el of focusables) {
      if (
        el.getBoundingClientRect().height === 0 ||
        el.matches(":disabled, [aria-disabled='true'], [tabindex='-1']")
      )
        continue;
      el.focus({ preventScroll: true });
      if (document.activeElement !== el)
        throw new Error(
          `focus() did not land on ${describe(el)} in ${patch}/${variant} (document inert or element unfocusable)`,
        );
      if (!el.matches(":focus-visible"))
        throw new Error(
          `focus() did not match :focus-visible on ${describe(el)} — keyboard modality lost`,
        );
      const s = cs(el);
      let reach = 0;
      for (const layer of s.boxShadow.split(/,(?![^(]*\))/)) {
        if (!layer.trim() || layer.trim() === "none" || layer.includes("inset"))
          continue;
        const nums =
          layer
            .replace(/rgba?\([^)]*\)/g, "")
            .match(/-?[\d.]+px/g)
            ?.map(Number.parseFloat) ?? [];
        const [ox = 0, oy = 0, blur = 0, spread = 0] = nums;
        reach = Math.max(
          reach,
          spread + blur + Math.max(Math.abs(ox), Math.abs(oy)),
        );
      }
      if (s.outlineStyle !== "none" && Number.parseFloat(s.outlineWidth) > 0) {
        reach = Math.max(
          reach,
          Number.parseFloat(s.outlineWidth) +
            Number.parseFloat(s.outlineOffset),
        );
      }
      if (reach > 0) {
        const r = el.getBoundingClientRect();
        for (
          let p = el.parentElement;
          p && p !== container.parentElement;
          p = p.parentElement
        ) {
          const ps = cs(p);
          if (ps.overflowX === "visible" && ps.overflowY === "visible")
            continue;
          const box = paddingBox(p);
          const clip = Math.max(
            box.top - (r.top - reach),
            r.bottom + reach - box.bottom,
            box.left - (r.left - reach),
            r.right + reach - box.right,
          );
          if (clip > 1) {
            out.push({
              rule: "R5",
              patch,
              variant,
              density: "default",
              el: describe(el),
              measured: Math.round(clip * 100) / 100,
              detail: `focus ring (${reach}px) clipped by ${describe(p)} (overflow ${ps.overflowX}/${ps.overflowY})`,
            });
          }
          break;
        }
      }
      el.blur();
    }
  }
  return out;
}

type Config = {
  root: number;
  host: number;
  lineHeight: string;
  theme: "light" | "dark";
};

declare global {
  interface Window {
    __geo: {
      ready: boolean;
      names: string[];
      apply(config: Config): Promise<void>;
      measure(): Promise<Finding[]>;
      focusRings(): Finding[];
      errors: string[];
    };
  }
}

async function main(): Promise<void> {
  const errors: string[] = [];
  window.addEventListener("error", (e) => errors.push(String(e.message)));
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(" ").slice(0, 300));
    originalError(...args);
  };
  themeApply();
  document.body.style.margin = "0";
  const root = document.getElementById("root") as HTMLElement;
  new ElementNode(stageTree()).render(root);
  const stage = root.querySelector("[data-geo-stage]") as HTMLElement;
  window.__geo = {
    ready: true,
    names: Object.keys(HOST),
    errors,
    async apply(config) {
      document.documentElement.style.fontSize = `${config.root}px`;
      stage.style.fontSize = `${config.host}px`;
      stage.style.lineHeight = config.lineHeight;
      document.documentElement.setAttribute("data-theme", config.theme);
      probeCache.clear();
      await frames(2);
    },
    measure: measureAll,
    focusRings: focusRingFindings,
  };
}

main().catch((error) => {
  document.body.textContent = String(error);
  console.error(error);
});
