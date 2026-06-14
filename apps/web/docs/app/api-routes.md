# API Routes

`createApiHandler()` ports `route.ts` handlers: the same path syntax as page routes, one handler per HTTP method, on web-standard `Request`/`Response`. It runs anywhere those classes exist — Node 18+, Bun, Deno, edge runtimes.

## Defining Handlers

```ts
import { createApiHandler, json, notFound } from "@domphy/app"

const handler = createApiHandler([
  {
    path: "/api/users",
    GET: () => json(listUsers()),
    POST: async (request) => {
      const body = await request.json()
      return json(createUser(body), { status: 201 })
    },
  },
  {
    path: "/api/users/[id]",
    GET: (_request, { params }) => {
      const user = findUser(params.id as string)
      if (!user) notFound()
      return json(user)
    },
    DELETE: (_request, { params }) => {
      removeUser(params.id as string)
      return new Response(null, { status: 204 })
    },
  },
])

// handler: (request: Request) => Promise<Response>
```

## Built-In Behavior

- **404** for unmatched paths, **405** with an `Allow` header for unsupported methods
- **HEAD** falls back to `GET` with the body stripped
- **OPTIONS** answers automatically with the allowed methods
- `redirect()` thrown inside a handler becomes a `307`/`308` response, `notFound()` a `404`, other errors a `500`
- `json(data, init?)` is the `NextResponse.json()` equivalent

## Serving from Node

```ts
import http from "node:http"

http.createServer(async (request, response) => {
  const webRequest = new Request(`http://localhost${request.url}`, {
    method: request.method,
    headers: request.headers as HeadersInit,
    body: ["GET", "HEAD"].includes(request.method!) ? undefined : request,
    duplex: "half",
  } as RequestInit)

  const webResponse = await handler(webRequest)
  response.writeHead(webResponse.status, Object.fromEntries(webResponse.headers))
  response.end(Buffer.from(await webResponse.arrayBuffer()))
}).listen(3000)
```

Combine with [`renderToString`](./ssr) in one server: route `/api/*` to the API handler, everything else to page rendering.
