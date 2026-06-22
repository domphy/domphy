import { type DomphyElement, toState } from "@domphy/core";
import {
  type AnyRouteMatch,
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@domphy/router";
import { themeSpacing } from "@domphy/theme";
import {
  alert,
  button,
  formGroup,
  heading,
  inputText,
  label,
  paragraph,
  small,
} from "@domphy/ui";

// --- Auth context type ---
type RouterContext = { user: string | null };

// --- Auth state (lives outside the router so UI can bind to it) ---
const authUser = toState<string | null>(null);

// --- Routes ---
const rootRoute = createRootRouteWithContext<RouterContext>()();

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  beforeLoad: ({ context }) => {
    if (!context.user) throw redirect({ to: "/login" });
  },
});

const routeTree = rootRoute.addChildren([loginRoute, dashboardRoute]);

const router = createRouter({
  routeTree,
  history: createMemoryHistory({ initialEntries: ["/login"] }),
  context: { user: null },
});

// --- Bridge: router state -> Domphy states ---
const matches = toState<Array<AnyRouteMatch>>([]);
const pathname = toState("/login");

function syncRouterState() {
  matches.set([...router.state.matches]);
  pathname.set(router.state.location.pathname);
}
router.subscribe("onResolved", syncRouterState);
router.load().then(syncRouterState);

// Update router context and re-navigate to apply beforeLoad guards.
function applyAuth(user: string | null, destination: string) {
  authUser.set(user);
  router.update({ context: { user } });
  router
    .navigate({ to: destination as "/login" | "/dashboard" })
    .then(syncRouterState);
}

// --- Pages ---
const usernameInput = toState("");

function LoginPage(): DomphyElement<"div"> {
  return {
    div: [
      { h4: "Sign in", $: [heading()] },
      {
        p: "Enter any name to log in. The dashboard route uses beforeLoad to redirect unauthenticated visitors back here.",
        $: [paragraph()],
      },
      {
        div: [
          {
            label: "Username",
            $: [label()],
            htmlFor: "username-input",
          },
          {
            input: null,
            id: "username-input",
            type: "text",
            placeholder: "e.g. khanh",
            $: [inputText()],
            value: (l) => usernameInput.get(l),
            onInput: (e) =>
              usernameInput.set((e.target as HTMLInputElement).value),
          },
        ],
        $: [formGroup()],
      },
      {
        button: "Log in",
        $: [button({ color: "accent" })],
        onClick: () => {
          const name = usernameInput.get().trim();
          if (name) applyAuth(name, "/dashboard");
        },
      },
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(4),
      maxWidth: "320px",
    },
  };
}

function DashboardPage(): DomphyElement<"div"> {
  return {
    div: [
      {
        h4: (l) => `Welcome, ${authUser.get(l)}`,
        $: [heading()],
      },
      {
        p: "You reached the dashboard because beforeLoad saw a non-null context.user. Log out to confirm the guard redirects back to /login.",
        $: [paragraph()],
      },
      {
        button: "Log out",
        $: [button()],
        onClick: () => {
          usernameInput.set("");
          applyAuth(null, "/login");
        },
      },
    ],
    style: {
      display: "flex",
      flexDirection: "column",
      gap: themeSpacing(4),
    },
  };
}

function UnexpectedPage(): DomphyElement<"div"> {
  return {
    div: "Unexpected route.",
    $: [alert({ color: "error" })],
  };
}

// --- UI ---
const App: DomphyElement<"div"> = {
  div: [
    {
      small: (l) => `location: ${pathname.get(l)}`,
      $: [small()],
    },
    {
      div: (l) => {
        const matchList = matches.get(l);
        if (matchList.find((m) => m.routeId === dashboardRoute.id))
          return [DashboardPage()];
        if (matchList.find((m) => m.routeId === loginRoute.id))
          return [LoginPage()];
        return [UnexpectedPage()];
      },
    },
  ],
  style: {
    display: "flex",
    flexDirection: "column",
    gap: themeSpacing(3),
  },
};

export default App;
