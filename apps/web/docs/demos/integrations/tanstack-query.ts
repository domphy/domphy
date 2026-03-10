import { toState, type DomphyElement } from "@domphy/core";
import { spinner, alert, button } from "@domphy/ui";
import { themeSpacing } from "@domphy/theme";

// --- Bridge pattern: toState mirrors external async state ---
const data = toState<{ id: number; name: string }[]>([]);
const loading = toState(true);
const error = toState<string | null>(null);

async function fetchUsers() {
  loading.set(true);
  error.set(null);
  try {
    const res = await fetch("https://jsonplaceholder.typicode.com/users");
    const json = await res.json();
    data.set(json.slice(0, 5));
  } catch (e) {
    error.set("Failed to fetch users.");
  } finally {
    loading.set(false);
  }
}

fetchUsers();

// --- UI ---
const App: DomphyElement<"div"> = {
  div: [
    {
      span: null,
      $: [spinner()],
      hidden: (l) => !loading.get(l),
    },
    {
      div: (l) => error.get(l) ?? "",
      $: [alert({ color: "error" })],
      hidden: (l) => !error.get(l),
    },
    {
      ul: (l) =>
        data.get(l).map((user) => ({
          li: user.name,
          _key: user.id,
        })),
      hidden: (l) => loading.get(l),
    },
    {
      button: "Refetch",
      $: [button()],
      onClick: () => fetchUsers(),
      style: { marginTop: themeSpacing(3) },
    },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(2),
  },
};

export default App;
