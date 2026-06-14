import { type DomphyElement, toState } from "@domphy/core";
import { QueryClient } from "@domphy/query";
import { createMutation } from "@domphy/query/domphy";
import { themeSpacing } from "@domphy/theme";
import { alert, button, inputText } from "@domphy/ui";

const queryClient = new QueryClient();
queryClient.mount();

const title = toState("");

// createMutation exposes the mutation result as reactive accessors.
const save = createMutation<
  { id: number; title: string },
  Error,
  { title: string }
>(queryClient, {
  mutationFn: async (input) => {
    const res = await fetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to save.");
    return res.json() as Promise<{ id: number; title: string }>;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  },
});

const App: DomphyElement<"div"> = {
  div: [
    {
      input: null,
      $: [inputText()],
      placeholder: "Post title",
      onInput: (e) => title.set((e.target as HTMLInputElement).value),
    },
    {
      button: (l) => (save.isPending(l) ? "Saving..." : "Save"),
      $: [button({ color: "primary" })],
      ariaDisabled: (l) => save.isPending(l),
      onClick: () => {
        if (save.isPending()) return;
        save.mutate({ title: title.get() || "Untitled" });
      },
    },
    {
      div: (l) => {
        const data = save.data(l);
        return data ? `Saved post #${data.id}: "${data.title}"` : "";
      },
      $: [alert({ color: "success" })],
      hidden: (l) => !save.isSuccess(l),
    },
    {
      div: (l) => save.error(l)?.message ?? "",
      $: [alert({ color: "error" })],
      hidden: (l) => !save.error(l),
    },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(2),
  },
};

export default App;
