// Type-surface spot-check: route generics must not collapse to any.
// Not a vitest test — the checks are the `@ts-expect-error` assertions below,
// verified by the TypeScript compiler (an unused directive is error TS2578).
// Run: `npx tsc --noEmit -p tsconfig.json` from packages/router (tests/ is in
// the tsconfig `include`).
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from "../src/index";

interface AppContext {
  auth: { userId: string };
}

const rootRoute = createRootRouteWithContext<AppContext>()();

const postRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts/$postId",
  loader: ({ params }) => {
    const id: string = params.postId;
    // @ts-expect-error unknown param must be rejected
    const missing = params.other;
    return { id, missing };
  },
});

const routeTree = rootRoute.addChildren([postRoute]);

const router = createRouter({
  routeTree,
  history: createMemoryHistory({ initialEntries: ["/"] }),
  context: { auth: { userId: "u1" } },
});

// Path literal must be constrained to known route paths.
type Paths = import("../src/index").RoutePaths<typeof routeTree>;
const knownPath: Paths = "/posts/$postId";
// @ts-expect-error "/nope" is not a known route path
const badPath: Paths = "/nope";

// Navigate: known path OK.
router.navigate({ to: "/posts/$postId", params: { postId: "1" } });

// Note: `RouterCore.navigate` does not reject a missing required param at the
// type level — verified identical in upstream @tanstack/router-core@1.171.13
// (strict param checking lives in the framework Link layer). Parity, not a
// port regression.

export { router, postRoute, knownPath, badPath };
