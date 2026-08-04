// Exported default-props/config objects contain arrays of plain data records.
// They are not element trees: the CLI must descend into them (finding any
// nested element) without flagging each record's keys as unknown tags.
export const DEFAULT_HEADER = {
  workspaceName: "Acme Inc",
  teams: [
    { name: "Acme Inc", plan: "Enterprise" },
    { name: "Acme Corp", plan: "Startup" },
  ],
  versions: [
    { label: "v1.0.0", value: "1" },
    { label: "v2.0.0", value: "2" },
  ],
};

// A clean element nested inside a data record is still discovered.
export const PAGE = {
  title: "Home",
  layout: { div: [{ p: "hello" }] },
};
