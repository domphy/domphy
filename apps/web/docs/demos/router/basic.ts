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
  heading,
  link,
  type MenuItem,
  menu,
  paragraph,
  small,
} from "@domphy/ui";

// --- Routes ---
const rootRoute = createRootRoute();
const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: "/" });
const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/about",
});
const postRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts/$postId",
});
const routeTree = rootRoute.addChildren([indexRoute, aboutRoute, postRoute]);

// Memory history keeps navigation inside the demo, away from the page URL.
const router = createRouter({
  routeTree,
  history: createMemoryHistory({ initialEntries: ["/"] }),
});

// --- Bridge: router state -> Domphy states ---
const matches = toState<Array<AnyRouteMatch>>([]);
const pathname = toState<string | number>("/");

function syncRouterState() {
  matches.set([...router.state.matches]);
  pathname.set(router.state.location.pathname);
}
router.subscribe("onResolved", syncRouterState);
router.load().then(syncRouterState);

// --- Pages ---
const posts: Record<string, string> = {
  "1": "Domphy and TanStack Router share the same route tree grammar.",
  "2": "Params like $postId arrive on the match, ready to render.",
};

function postLink(postId: string): DomphyElement<"a"> {
  return {
    a: `Post ${postId}`,
    href: `/posts/${postId}`,
    $: [link()],
    onClick: (e) => {
      e.preventDefault();
      router
        .navigate({ to: "/posts/$postId", params: { postId } })
        .then(syncRouterState);
    },
  };
}

function HomePage(): DomphyElement<"div"> {
  return {
    div: [
      { h4: "Home", $: [heading()] },
      {
        p: "Three routes share one router on a memory history. Open a post to match /posts/$postId:",
        $: [paragraph()],
      },
      {
        div: [postLink("1"), postLink("2")],
        style: {
          display: "flex",
          gap: themeSpacing(4),
        },
      },
    ],
  };
}

function AboutPage(): DomphyElement<"div"> {
  return {
    div: [
      { h4: "About", $: [heading()] },
      {
        p: "Navigation never reloads the page: the router swaps matches and Domphy re-renders the matched content.",
        $: [paragraph()],
      },
    ],
  };
}

function PostPage(match: AnyRouteMatch): DomphyElement<"div"> {
  const { postId } = match.params as { postId: string };
  return {
    div: [
      { h4: `Post ${postId}`, $: [heading()] },
      {
        p: posts[postId] ?? "This post does not exist.",
        $: [paragraph()],
      },
      {
        a: "Back to home",
        href: "/",
        $: [link()],
        onClick: (e) => {
          e.preventDefault();
          router.navigate({ to: "/" }).then(syncRouterState);
        },
      },
    ],
  };
}

// --- Navigation ---
// Item keys mirror route pathnames, so passing the pathname state as
// `activeKey` keeps the highlighted item in sync with the router.
function navigationItem(label: string, to: "/" | "/about"): MenuItem {
  return {
    label,
    key: to,
    onClick: () => {
      router.navigate({ to }).then(syncRouterState);
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
            navigationItem("Home", "/"),
            navigationItem("About", "/about"),
          ],
          activeKey: pathname,
        }),
      ],
      // menu() stacks items in a column by default; a row reads as a nav bar.
      style: { flexDirection: "row" },
    },
    {
      div: (l) => {
        const matchList = matches.get(l);
        const postMatch = matchList.find(
          (match) => match.routeId === postRoute.id,
        );
        if (postMatch) return [PostPage(postMatch)];
        const aboutMatch = matchList.find(
          (match) => match.routeId === aboutRoute.id,
        );
        return aboutMatch ? [AboutPage()] : [HomePage()];
      },
    },
    {
      small: (l) => `memory location: ${pathname.get(l)}`,
      $: [small()],
    },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(4),
  },
};

export default App;
