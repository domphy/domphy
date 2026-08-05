// Vanilla-DOM control implementation (ported from the krausest
// frameworks/keyed/vanillajs reference) — establishes the browser floor for
// each operation in this exact harness (same DOM structure, same CSS, same
// measurement brackets). Not a Domphy implementation.

function _random(max: number): number {
  return Math.round(Math.random() * 1000) % max;
}

const ADJECTIVES = [
  "pretty",
  "large",
  "big",
  "small",
  "tall",
  "short",
  "long",
  "handsome",
  "plain",
  "quaint",
  "clean",
  "elegant",
  "easy",
  "angry",
  "crazy",
  "helpful",
  "mushy",
  "odd",
  "unsightly",
  "adorable",
  "important",
  "inexpensive",
  "cheap",
  "expensive",
  "fancy",
];
const COLOURS = [
  "red",
  "yellow",
  "blue",
  "green",
  "pink",
  "brown",
  "purple",
  "brown",
  "white",
  "black",
  "orange",
];
const NOUNS = [
  "table",
  "chair",
  "house",
  "bbq",
  "desk",
  "car",
  "pony",
  "cookie",
  "sandwich",
  "burger",
  "pizza",
  "mouse",
  "keyboard",
];

let nextId = 1;
let data: { id: number; label: string }[] = [];
let selected: number | null = null;
let selectedRow: HTMLTableRowElement | undefined;

const tbody = document.getElementById("tbody") as HTMLTableSectionElement;

const rowTemplate = document.createElement("tr");
rowTemplate.innerHTML =
  "<td class='col-md-1'> </td><td class='col-md-4'><a> </a></td>" +
  "<td class='col-md-1'><a><span class='glyphicon glyphicon-remove' aria-hidden='true'></span></a></td>" +
  "<td class='col-md-6'></td>";

function buildData(count: number) {
  const out: { id: number; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: nextId++,
      label:
        ADJECTIVES[_random(ADJECTIVES.length)] +
        " " +
        COLOURS[_random(COLOURS.length)] +
        " " +
        NOUNS[_random(NOUNS.length)],
    });
  }
  return out;
}

function renderRows(rows: { id: number; label: string }[]) {
  for (const row of rows) {
    const tr = rowTemplate.cloneNode(true) as HTMLTableRowElement;
    const td1 = tr.firstChild as HTMLTableCellElement;
    const a2 = td1.nextSibling!.firstChild as HTMLAnchorElement;
    td1.textContent = String(row.id);
    a2.textContent = row.label;
    (tr as any).data_id = row.id;
    tbody.appendChild(tr);
  }
}

function clearRows() {
  tbody.textContent = "";
  selectedRow = undefined;
  selected = null;
}

document.getElementById("run")!.addEventListener("click", () => {
  data = buildData(1000);
  clearRows();
  renderRows(data);
});
document.getElementById("runlots")!.addEventListener("click", () => {
  data = buildData(10000);
  clearRows();
  renderRows(data);
});
document.getElementById("add")!.addEventListener("click", () => {
  const more = buildData(1000);
  data = data.concat(more);
  renderRows(more);
});
document.getElementById("update")!.addEventListener("click", () => {
  const rows = tbody.children;
  for (let i = 0; i < data.length; i += 10) {
    data[i].label += " !!!";
    const a = rows[i].children[1].firstChild as HTMLAnchorElement;
    a.textContent = data[i].label;
  }
});
document.getElementById("clear")!.addEventListener("click", () => {
  data = [];
  clearRows();
});
document.getElementById("swaprows")!.addEventListener("click", () => {
  if (data.length <= 998) return;
  const tmp = data[1];
  data[1] = data[998];
  data[998] = tmp;
  const r1 = tbody.children[1];
  const r998 = tbody.children[998];
  const r999 = tbody.children[999];
  tbody.insertBefore(r998, r1);
  tbody.insertBefore(r1, r999 ?? null);
});

tbody.addEventListener("click", (e) => {
  let p = e.target as HTMLElement | null;
  while (p && p.tagName !== "TD") p = p.parentElement;
  if (!p) return;
  const tr = p.parentElement as HTMLTableRowElement;
  const id = (tr as any).data_id;
  const idx = data.findIndex((row) => row.id === id);
  if (tr.children[1] === p) {
    // select
    if (selectedRow) selectedRow.className = "";
    selected = id;
    selectedRow = tr;
    tr.className = "danger";
  } else if (tr.children[2] === p) {
    // remove
    data.splice(idx, 1);
    if (selected === id) selected = null;
    tr.remove();
  }
});

// Harness hook shim (vanilla has no reactivity queue to drain).
(window as any).__flushSync = () => {};
