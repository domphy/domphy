import type { DomphyElement } from "@domphy/core";
import { QueryClient } from "@domphy/query";
import { createQuery } from "@domphy/query/domphy";
import { themeSpacing } from "@domphy/theme";
import { alert, button, spinner } from "@domphy/ui";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5000 } },
});
queryClient.mount();

// createQuery bridges the observer to Domphy reactivity — read result fields
// directly with a listener, no manual subscribe -> toState wiring.
const users = createQuery<{ id: number; name: string }[]>(queryClient, {
  queryKey: ["users"],
  queryFn: async () => {
    const res = await fetch("https://jsonplaceholder.typicode.com/users");
    if (!res.ok) throw new Error("Failed to fetch users.");
    const json = await res.json();
    return json.slice(0, 5);
  },
});

const App: DomphyElement<"div"> = {
  div: [
    {
      span: null,
      $: [spinner()],
      hidden: (l) => !users.isPending(l),
    },
    {
      div: (l) => users.error(l)?.message ?? "",
      $: [alert({ color: "error" })],
      hidden: (l) => !users.error(l),
    },
    {
      ul: (l) =>
        (users.data(l) ?? []).map((user) => ({
          li: user.name,
          _key: user.id,
        })),
      hidden: (l) => users.isPending(l),
    },
    {
      button: (l) =>
        users.isFetching(l) ? "Refetching..." : "Invalidate & Refetch",
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
