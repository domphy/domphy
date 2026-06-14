import { type DomphyElement, toState } from "@domphy/core";
import { QueryClient, QueryObserver } from "@domphy/query";
import { themeSpacing } from "@domphy/theme";
import { alert, button, spinner } from "@domphy/ui";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5000 } },
});
queryClient.mount();

// --- Bridge: observer result -> Domphy states ---
const users = toState<{ id: number; name: string }[]>([]);
const loading = toState(true);
const fetching = toState(false);
const error = toState<string | null>(null);

const observer = new QueryObserver<{ id: number; name: string }[]>(
  queryClient,
  {
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("https://jsonplaceholder.typicode.com/users");
      if (!res.ok) throw new Error("Failed to fetch users.");
      const json = await res.json();
      return json.slice(0, 5);
    },
  },
);

observer.subscribe((result) => {
  users.set(result.data ?? []);
  loading.set(result.isPending);
  fetching.set(result.isFetching);
  error.set(result.error ? result.error.message : null);
});

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
        users.get(l).map((user) => ({
          li: user.name,
          _key: user.id,
        })),
      hidden: (l) => loading.get(l),
    },
    {
      button: (l) =>
        fetching.get(l) ? "Refetching..." : "Invalidate & Refetch",
      $: [button()],
      onClick: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
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
