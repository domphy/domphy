import { createServerHistory } from '@tanstack/history'
import { isServer } from '@domphy/router/isServer'
import { _getRenderedMatches } from '../load-client'
import { waitForReason as waitForRequest } from '../await-signal'
import { mergeHeaders } from './headers'
import {
  attachRouterServerSsrUtils,
  getNormalizedURL,
  getOrigin,
} from './ssr-server'
import {
  bindSsrResponseToRequest,
  disposeSsrResponse,
  isSsrResponse,
} from './handlerCallback'
import type { HandlerCallback } from './handlerCallback'
import type { AnyHeaders } from './headers'
import type { AnyRouter } from '../router'
import type { ServerManifest } from '../manifest'

export type RequestHandler<TRouter extends AnyRouter> = (
  cb: HandlerCallback<TRouter>,
) => Promise<Response>

export { waitForRequest }

function createLateResponseDisposer(signal: AbortSignal) {
  return (result: unknown) => {
    if (result instanceof Response || isSsrResponse(result)) {
      disposeSsrResponse(result, signal.reason)
    }
  }
}

export function createRequestHandler<TRouter extends AnyRouter>({
  createRouter,
  request,
  getRouterManifest,
}: {
  createRouter: () => TRouter
  request: Request
  getRouterManifest?: () => ServerManifest | Promise<ServerManifest>
}): RequestHandler<TRouter> {
  return async (cb) => {
    const signal = request.signal
    signal.throwIfAborted()
    const manifest = getRouterManifest
      ? await waitForRequest(getRouterManifest(), signal)
      : undefined
    signal.throwIfAborted()
    const router = createRouter()
    let responseOwnsCleanup = false

    try {
      attachRouterServerSsrUtils({
        router,
        manifest,
      })

      // normalizing and sanitizing the pathname here for server, so we always deal with the same format during SSR.
      const { url } = getNormalizedURL(request.url, 'http://localhost')
      const origin = getOrigin(request)
      const href = url.href.replace(url.origin, '')

      // Create a history for the router
      const history = createServerHistory(href)

      // Update the router with the history and context.
      //
      // `isServer: true` is forced, not merely expected: this handler owns the
      // server history, whose `push()` is a no-op, and it reads the outcome off
      // `router._serverResult`, which only the server load pipeline writes. A
      // router left in client mode instead runs `followRedirect` ->
      // `commitLocation` -> `load` forever on a redirecting route (the
      // 20-redirect cap is keyed on a pending location the ignored push never
      // produces), so the request never terminates and the process OOMs.
      router.update({
        history,
        isServer: true,
        origin: router.options.origin ?? origin,
      })

      // `load()` dispatches on `isServer ?? router.isServer`, so the per-bundle
      // constant wins over the option just set. It is `false` only when a server
      // build resolved this package's `browser` export condition — unfixable
      // from here, and silently an infinite load, so fail loud instead.
      if (isServer === false) {
        throw new Error(
          '@domphy/router: createRequestHandler is running against the client build of "@domphy/router/isServer" (isServer === false), so server-side loading cannot be enabled. Resolve this package with the "node"/"deno"/"workerd"/"bun" export condition in your server build instead of "browser".',
        )
      }

      await router.load({
        _signal: signal,
      })
      signal.throwIfAborted()

      const result = router._serverResult
      if (result?.type === 'redirect') {
        return result.redirect
      }

      await router.serverSsr?.dehydrate({ signal })
      signal.throwIfAborted()

      const responseHeaders = getRequestHeaders({
        router,
      })

      signal.throwIfAborted()
      const disposeLate = createLateResponseDisposer(signal)
      const response = await waitForRequest(
        cb({
          request,
          router,
          responseHeaders,
        }),
        signal,
        disposeLate,
        disposeLate,
      )
      const ssrResponse = bindSsrResponseToRequest(router, response, signal)
      signal.throwIfAborted()
      responseOwnsCleanup = ssrResponse.serverSsrCleanup === 'stream'
      return ssrResponse.response
    } finally {
      if (!responseOwnsCleanup) {
        // Clean up router SSR state if the callback won't handle it
        // (e.g., if an error occurred before the callback was invoked).
        // Transformed streaming response bodies clean up when consumed/cancelled.
        router.serverSsr?.cleanup()
      }
    }
  }
}

function getRequestHeaders(opts: { router: AnyRouter }): Headers {
  const matchHeaders: Array<AnyHeaders> = []
  for (const match of _getRenderedMatches(opts.router.stores.matches.get())) {
    matchHeaders.push(match.headers)
  }

  return mergeHeaders(
    {
      'Content-Type': 'text/html; charset=UTF-8',
    },
    ...matchHeaders,
  )
}
