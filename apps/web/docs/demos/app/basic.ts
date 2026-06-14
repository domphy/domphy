import type { DomphyElement } from "@domphy/core";
import {
  createApp,
  createMemoryHistory,
  defineRoutes,
  navLink,
  type RouteContext,
} from "@domphy/app";
import { themeSpacing } from "@domphy/theme";
import { heading, link, paragraph, small, spinner } from "@domphy/ui";

// --- Fake data source ---
type Post = { title: string; body: string };

const posts: Record<string, Post> = {
  "hello-domphy": {
    title: "Hello Domphy",
    body: "Patch-based UI for native elements, now with app routing.",
  },
  "nested-layouts": {
    title: "Nested Layouts",
    body: "Layouts wrap pages exactly like layout.tsx wraps page.tsx.",
  },
};

const fetchPost = (slug: string): Promise<Post> =>
  new Promise((resolve) => setTimeout(() => resolve(posts[slug]), 600));

// --- Routes: the equivalent of an app/ directory ---
const routes = defineRoutes([
  {
    path: "/",
    layout: (children) => ({
      div: [
        {
          nav: [navItem("/", "Home"), navItem("/blog", "Blog")],
          style: { display: "flex", gap: themeSpacing(4) },
        },
        children,
      ],
      style: {
        display: "flex",
        flexDirection: "column",
        gap: themeSpacing(4),
      },
    }),
    page: () => ({
      div: [
        { h4: "Home", $: [heading()] },
        {
          p: "An in-memory Next.js-style app. Click Blog above.",
          $: [paragraph()],
        },
      ],
    }),
    children: [
      {
        path: "blog",
        page: () => ({
          div: [
            { h4: "Blog", $: [heading()] },
            ...Object.keys(posts).map((slug) => ({
              a: posts[slug].title,
              $: [
                link(),
                navLink({ href: `/blog/${slug}`, router: app.router }),
              ],
            })),
          ],
          style: {
            display: "flex",
            flexDirection: "column",
            gap: themeSpacing(2),
            alignItems: "start",
          },
        }),
      },
      {
        path: "blog/[slug]",
        loader: ({ params }) => fetchPost(params.slug as string),
        loading: () => ({
          div: [
            { span: null, $: [spinner()] },
            { small: "Loading post...", $: [small()] },
          ],
          style: {
            display: "flex",
            gap: themeSpacing(2),
            alignItems: "center",
          },
        }),
        page: (context: RouteContext<Post>) => ({
          article: [
            { h4: context.data.title, $: [heading()] },
            { p: context.data.body, $: [paragraph()] },
            { small: `slug: ${String(context.params.slug)}`, $: [small()] },
          ],
        }),
      },
    ],
  },
]);

function navItem(href: string, label: string): DomphyElement<"a"> {
  return {
    a: label,
    $: [link(), navLink({ href, router: app.router })],
  };
}

// Memory history keeps the demo from touching the page URL; use the default
// browser history in a real app: createApp(routes)
const app = createApp(routes, { history: createMemoryHistory("/") });
void app.router.start();

const App: DomphyElement<"div"> = {
  div: [app.element()],
};

export default App;
