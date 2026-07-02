import { type DomphyElement, toState } from "@domphy/core";
import {
  type AnyRouteMatch,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
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
});

// --- Bridge: router state -> Domphy states ---
const matches = toState<Array<AnyRouteMatch>>([]);
const pathname = toState<string | number>("/");

// While a loader runs, the upcoming matches live in the pending pool with
// status "pending"; prefer them so the spinner state is observable.
function syncRouterState() {
  const pendingMatches = router.stores.pendingMatches.get();
  matches.set(
    pendingMatches.length > 0 ? [...pendingMatches] : [...router.state.matches],
  );
  pathname.set(router.state.location.pathname);
}
router.subscribe("onBeforeLoad", syncRouterState);
router.subscribe("onLoad", syncRouterState);
router.subscribe("onResolved", syncRouterState);
router.load().then(syncRouterState);

// --- Pages ---
function IndexPage(): DomphyElement<"div"> {
  return {
    div: [
      { h4: "Route loaders", $: [heading()] },
      {
        p: "Open a post: its loader fetches from jsonplaceholder while the match reports a pending status. Revisit it within 30 seconds and the cached loader data renders with no spinner.",
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
      const navigation = postId
        ? router.navigate({ to: "/posts/$postId", params: { postId } })
        : router.navigate({ to: "/" });
      navigation.then(syncRouterState);
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
        const postMatch = matches
          .get(l)
          .find((match) => match.routeId === postRoute.id);
        if (!postMatch) return [IndexPage()];
        if (postMatch.status === "pending") return [LoadingPage()];
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
