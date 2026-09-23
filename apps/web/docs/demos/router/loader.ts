import { type DomphyElement, toState } from "@domphy/core";
import {
  type AnyRouteMatch,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  subscribeToRouterState,
} from "@domphy/router";
import { themeSpacing } from "@domphy/theme";
import {
  alert,
  heading,
  type MenuItem,
  menu,
  paragraph,
  small,
  spinner,
} from "@domphy/ui";

type Post = { id: number; title: string; body: string };

// --- Routes ---
const rootRoute = createRootRoute();
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/" });

// Loader data stays fresh for 30 seconds: revisiting a post inside that
// window renders the cached data instantly instead of refetching.
const postRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts/$postId",
  staleTime: 30_000,
  loader: async ({ params }): Promise<Post> => {
    const response = await fetch(
      `https://jsonplaceholder.typicode.com/posts/${params.postId}`,
    );
    if (!response.ok) throw new Error("Failed to fetch the post.");
    return response.json();
  },
});
const routeTree = rootRoute.addChildren([indexRoute, postRoute]);

const router = createRouter({
  routeTree,
  history: createMemoryHistory({ initialEntries: ["/"] }),
  // How long a load may run before the spinner appears. Lowered from the
  // router's own 1000ms default so a single jsonplaceholder fetch still shows
  // it; a cache hit settles well under this, so revisits never flash.
  defaultPendingMs: 150,
});

// --- Bridge: router state -> Domphy states ---
// `subscribeToRouterState` publishes every write to the router's state store,
// including the `status: "pending"` flip at the start of a load. Lifecycle
// events cannot see that flip — `onBeforeLoad` fires while the status is still
// "idle" and `onLoad` only after the loaders settle — so this is what the
// spinner reads.
const matches = toState<Array<AnyRouteMatch>>([]);
const pathname = toState<string | number>("/");
const loading = toState(false);

// `isLoading` flips for every load, including one served straight from the
// cache. Waiting out `defaultPendingMs` before showing the spinner is what
// upstream's `pendingMs` does for a `pendingComponent` — without it a cached
// revisit flashes the spinner for a frame.
let pendingTimer: ReturnType<typeof setTimeout> | undefined;

function syncRouterState() {
  matches.set([...router.state.matches]);
  pathname.set(router.state.location.pathname);
  if (router.state.isLoading) {
    pendingTimer ??= setTimeout(
      () => loading.set(true),
      router.options.defaultPendingMs,
    );
  } else {
    clearTimeout(pendingTimer);
    pendingTimer = undefined;
    loading.set(false);
  }
}
subscribeToRouterState(router, syncRouterState);
router.load().then(syncRouterState);

// --- Pages ---
function IndexPage(): DomphyElement<"div"> {
  return {
    div: [
      { h4: "Route loaders", $: [heading()] },
      {
        p: 'Open a post: the spinner runs while its loader fetches from jsonplaceholder, and the post renders once the loader settles. Revisit it within 30 seconds and the cached loader data renders straight away — the "Loader ran at" timestamp does not change.',
        $: [paragraph()],
      },
    ],
  };
}

function LoadingPage(): DomphyElement<"div"> {
  return {
    div: [
      { span: null, $: [spinner()] },
      { small: "Running the route loader...", $: [small()] },
    ],
    style: {
      display: "flex",
      alignItems: "center",
      gap: themeSpacing(2),
    },
  };
}

function ErrorPage(match: AnyRouteMatch): DomphyElement<"div"> {
  return {
    div: String(match.error),
    $: [alert({ color: "error" })],
  };
}

function PostPage(match: AnyRouteMatch): DomphyElement<"div"> {
  const post = match.loaderData as Post;
  const loadedAt = new Date(match.updatedAt).toLocaleTimeString();
  return {
    div: [
      { h4: post.title, $: [heading()] },
      { p: post.body, $: [paragraph()] },
      {
        small: `Loader ran at ${loadedAt} - within 30s this timestamp proves revisits reuse the cache.`,
        $: [small()],
      },
    ],
  };
}

// --- Navigation ---
// Item keys mirror route pathnames, so passing the pathname state as
// `activeKey` keeps the highlighted item in sync with the router.
function navigationItem(label: string, postId?: string): MenuItem {
  return {
    label,
    key: postId ? `/posts/${postId}` : "/",
    onClick: () => {
      if (postId) {
        router.navigate({ to: "/posts/$postId", params: { postId } });
      } else {
        router.navigate({ to: "/" });
      }
    },
  };
}

// --- UI ---
const App: DomphyElement<"div"> = {
  div: [
    {
      nav: null,
      $: [
        menu({
          items: [
            navigationItem("Home"),
            navigationItem("Post 1", "1"),
            navigationItem("Post 2", "2"),
            navigationItem("Post 3", "3"),
          ],
          activeKey: pathname,
        }),
      ],
      // menu() stacks items in a column by default; a row reads as a nav bar.
      style: { flexDirection: "row" },
    },
    {
      div: (l) => {
        if (loading.get(l)) return [LoadingPage()];
        const postMatch = matches
          .get(l)
          .find((match) => match.routeId === postRoute.id);
        if (!postMatch) return [IndexPage()];
        if (postMatch.status === "error") return [ErrorPage(postMatch)];
        return [PostPage(postMatch)];
      },
    },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(4),
  },
};

export default App;
