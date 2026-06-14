import { type DomphyElement, toState } from "@domphy/core";
import { MutationObserver, QueryClient } from "@domphy/query";
import { themeSpacing } from "@domphy/theme";
import { alert, button, inputText } from "@domphy/ui";

const queryClient = new QueryClient();
queryClient.mount();

// --- Bridge: mutation result -> Domphy states ---
const title = toState("");
const saving = toState(false);
const saved = toState<string | null>(null);
const error = toState<string | null>(null);

const mutation = new MutationObserver(queryClient, {
  mutationFn: async (input: { title: string }) => {
    const res = await fetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error("Failed to save.");
    return res.json() as Promise<{ id: number; title: string }>;
  },
  onSuccess: (data) => {
    saved.set(`Saved post #${data.id}: "${data.title}"`);
    queryClient.invalidateQueries({ queryKey: ["posts"] });
  },
});

mutation.subscribe((result) => {
  saving.set(result.isPending);
  error.set(result.error ? result.error.message : null);
});

// --- UI ---
const App: DomphyElement<"div"> = {
  div: [
    {
      input: null,
      $: [inputText()],
      placeholder: "Post title",
      value: "",
      onInput: (e) => title.set((e.target as HTMLInputElement).value),
    },
    {
      button: (l) => (saving.get(l) ? "Saving..." : "Save"),
      $: [button({ color: "primary" })],
      ariaDisabled: (l) => saving.get(l),
      onClick: () => {
        if (saving.get()) return;
        saved.set(null);
        mutation
          .mutate({ title: title.get() || "Untitled" })
          .catch(() => undefined);
      },
    },
    {
      div: (l) => saved.get(l) ?? "",
      $: [alert({ color: "success" })],
      hidden: (l) => !saved.get(l),
    },
    {
      div: (l) => error.get(l) ?? "",
      $: [alert({ color: "error" })],
      hidden: (l) => !error.get(l),
    },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(2),
  },
};

export default App;
