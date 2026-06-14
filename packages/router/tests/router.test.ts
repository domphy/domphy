// Integration tests for the Domphy adapter layer (src/domphy/*):
// createRouter wires RouterCore with @tanstack/store stores and the
// headless transitioner, so navigation below exercises the full client
// lifecycle (history subscription, load, resolve).
import { describe, expect, it, vi } from 'vitest'
import {
  createMemoryHistory,
  createRootRoute,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  notFound,
  redirect,
} from '../src/index'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('route matching', () => {
  it('matches nested routes and exposes path params', async () => {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
    })
    const postsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'posts',
    })
    const postDetailRoute = createRoute({
      getParentRoute: () => postsRoute,
      path: '$postId',
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([
        indexRoute,
        postsRoute.addChildren([postDetailRoute]),
      ]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    await router.load()

    await router.navigate({
      to: '/posts/$postId',
      params: { postId: '42' },
    })
    await sleep(20)

    const matchedRouteIds = router.state.matches.map(
      (routeMatch) => routeMatch.routeId,
    )
    expect(matchedRouteIds).toContain(rootRoute.id)
    expect(matchedRouteIds).toContain(postsRoute.id)
    expect(matchedRouteIds).toContain(postDetailRoute.id)

    const detailMatch = router.state.matches.find(
      (routeMatch) => routeMatch.routeId === postDetailRoute.id,
    )
    expect(detailMatch?.params).toEqual({ postId: '42' })
    expect(router.state.location.pathname).toBe('/posts/42')
  })

  it('matches a wildcard (splat) route and exposes _splat', async () => {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
    })
    const filesRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'files/$',
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, filesRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    await router.load()

    await router.navigate({
      to: '/files/$',
      params: { _splat: 'docs/readme.md' },
    })
    await sleep(20)

    const filesMatch = router.state.matches.find(
      (routeMatch) => routeMatch.routeId === filesRoute.id,
    )
    expect(filesMatch).toBeDefined()
    expect(filesMatch?.params._splat).toBe('docs/readme.md')
    expect(router.state.location.pathname).toBe('/files/docs/readme.md')
  })

  it('matches a pathless layout route (id without path)', async () => {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
    })
    const layoutRoute = createRoute({
      getParentRoute: () => rootRoute,
      id: 'layout',
    })
    const dashboardRoute = createRoute({
      getParentRoute: () => layoutRoute,
      path: 'dashboard',
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([
        indexRoute,
        layoutRoute.addChildren([dashboardRoute]),
      ]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    await router.load()

    await router.navigate({ to: '/dashboard' })
    await sleep(20)

    const matchedRouteIds = router.state.matches.map(
      (routeMatch) => routeMatch.routeId,
    )
    // The pathless layout participates in the match chain without
    // contributing a path segment.
    expect(matchedRouteIds).toContain(layoutRoute.id)
    expect(matchedRouteIds).toContain(dashboardRoute.id)
    expect(router.state.location.pathname).toBe('/dashboard')
  })
})

describe('navigation', () => {
  function createNavigationSetup() {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
    })
    const aboutRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'about',
    })
    const userRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'users/$userId',
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, aboutRoute, userRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    return { router, aboutRoute, userRoute }
  }

  it('navigates with params and search', async () => {
    const { router, userRoute } = createNavigationSetup()
    await router.load()

    await router.navigate({
      to: '/users/$userId',
      params: { userId: '7' },
      search: { tab: 'settings' },
    })
    await sleep(20)

    const userMatch = router.state.matches.find(
      (routeMatch) => routeMatch.routeId === userRoute.id,
    )
    expect(userMatch?.params).toEqual({ userId: '7' })
    expect(router.state.location.search).toEqual({ tab: 'settings' })
    expect(router.state.location.href).toBe('/users/7?tab=settings')
  })

  it('history back and forward update the matches', async () => {
    const { router, aboutRoute, userRoute } = createNavigationSetup()
    await router.load()

    await router.navigate({ to: '/about' })
    await sleep(20)
    await router.navigate({ to: '/users/$userId', params: { userId: '1' } })
    await sleep(20)
    expect(router.state.location.pathname).toBe('/users/1')

    router.history.back()
    await sleep(20)
    expect(router.state.location.pathname).toBe('/about')
    expect(
      router.state.matches.some(
        (routeMatch) => routeMatch.routeId === aboutRoute.id,
      ),
    ).toBe(true)

    router.history.forward()
    await sleep(20)
    expect(router.state.location.pathname).toBe('/users/1')
    expect(
      router.state.matches.some(
        (routeMatch) => routeMatch.routeId === userRoute.id,
      ),
    ).toBe(true)
  })

  it('buildLocation produces the interpolated href', async () => {
    const { router } = createNavigationSetup()
    await router.load()

    const location = router.buildLocation({
      to: '/users/$userId',
      params: { userId: '9' },
      search: { tab: 'profile' },
    })
    expect(location.pathname).toBe('/users/9')
    expect(location.href).toBe('/users/9?tab=profile')
  })
})

describe('search params', () => {
  function createSearchSetup() {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
    })
    const itemsRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'items',
      validateSearch: (search: Record<string, unknown>) => ({
        page: Number(search.page ?? 1),
      }),
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, itemsRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    return { router, itemsRoute }
  }

  it('validateSearch applies defaults and validates values', async () => {
    const { router, itemsRoute } = createSearchSetup()
    await router.load()

    await router.navigate({ to: '/items' })
    await sleep(20)
    let itemsMatch = router.state.matches.find(
      (routeMatch) => routeMatch.routeId === itemsRoute.id,
    )
    expect(itemsMatch?.search).toEqual({ page: 1 })

    await router.navigate({ to: '/items', search: { page: 3 } })
    await sleep(20)
    itemsMatch = router.state.matches.find(
      (routeMatch) => routeMatch.routeId === itemsRoute.id,
    )
    expect(itemsMatch?.search).toEqual({ page: 3 })
    expect(router.state.location.search).toEqual({ page: 3 })
  })

  it('navigate with a search updater function receives previous search', async () => {
    const { router } = createSearchSetup()
    await router.load()

    await router.navigate({ to: '/items', search: { page: 3 } })
    await sleep(20)

    await router.navigate({
      to: '/items',
      search: (previousSearch: { page: number }) => ({
        page: previousSearch.page + 1,
      }),
    })
    await sleep(20)

    expect(router.state.location.search).toEqual({ page: 4 })
  })
})

describe('loaders', () => {
  it('exposes loader data on the match', async () => {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
    })
    const postRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'posts/$postId',
      loader: ({ params }) => ({ title: `Post ${params.postId}` }),
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, postRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    await router.load()

    await router.navigate({ to: '/posts/$postId', params: { postId: '5' } })
    await sleep(20)

    const postMatch = router.state.matches.find(
      (routeMatch) => routeMatch.routeId === postRoute.id,
    )
    expect(postMatch?.status).toBe('success')
    expect(postMatch?.loaderData).toEqual({ title: 'Post 5' })
  })

  it('loaderDeps feed the loader and retrigger it when they change', async () => {
    const loaderSpy = vi.fn(({ deps }: { deps: { page: number } }) => {
      return `page-${deps.page}`
    })
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
    })
    const listRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'list',
      validateSearch: (search: Record<string, unknown>) => ({
        page: Number(search.page ?? 1),
      }),
      loaderDeps: ({ search }) => ({ page: search.page }),
      loader: loaderSpy,
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, listRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    await router.load()

    await router.navigate({ to: '/list', search: { page: 1 } })
    await sleep(20)
    let listMatch = router.state.matches.find(
      (routeMatch) => routeMatch.routeId === listRoute.id,
    )
    expect(listMatch?.loaderData).toBe('page-1')
    expect(loaderSpy).toHaveBeenCalledTimes(1)

    await router.navigate({ to: '/list', search: { page: 2 } })
    await sleep(20)
    listMatch = router.state.matches.find(
      (routeMatch) => routeMatch.routeId === listRoute.id,
    )
    expect(listMatch?.loaderData).toBe('page-2')
    expect(loaderSpy).toHaveBeenCalledTimes(2)
  })

  it('staleTime keeps loader data fresh across quick re-navigation', async () => {
    const loaderSpy = vi.fn(() => ({ value: 'cached' }))
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
    })
    const cachedRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'cached',
      staleTime: 10_000,
      loader: loaderSpy,
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, cachedRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    await router.load()

    await router.navigate({ to: '/cached' })
    await sleep(20)
    expect(loaderSpy).toHaveBeenCalledTimes(1)

    // Navigate away and back within staleTime: the cached match is fresh,
    // so the loader must not run again.
    await router.navigate({ to: '/' })
    await sleep(20)
    await router.navigate({ to: '/cached' })
    await sleep(20)
    expect(loaderSpy).toHaveBeenCalledTimes(1)

    const cachedMatch = router.state.matches.find(
      (routeMatch) => routeMatch.routeId === cachedRoute.id,
    )
    expect(cachedMatch?.loaderData).toEqual({ value: 'cached' })
  })

  it('router.invalidate() refetches loaders of current matches', async () => {
    let serverValue = 'first'
    const loaderSpy = vi.fn(() => serverValue)
    const rootRoute = createRootRoute()
    const dataRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      staleTime: 10_000,
      loader: loaderSpy,
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([dataRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    await router.load()
    await sleep(20)
    expect(loaderSpy).toHaveBeenCalledTimes(1)

    serverValue = 'second'
    await router.invalidate()
    await sleep(20)

    expect(loaderSpy).toHaveBeenCalledTimes(2)
    const dataMatch = router.state.matches.find(
      (routeMatch) => routeMatch.routeId === dataRoute.id,
    )
    expect(dataMatch?.loaderData).toBe('second')
  })
})

describe('redirect', () => {
  it('a beforeLoad redirect lands on the target route', async () => {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
    })
    const loginRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'login',
    })
    const protectedRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'protected',
      beforeLoad: () => {
        throw redirect({ to: '/login' })
      },
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([
        indexRoute,
        loginRoute,
        protectedRoute,
      ]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    await router.load()

    await router.navigate({ to: '/protected' })
    await sleep(20)

    expect(router.state.location.pathname).toBe('/login')
    expect(
      router.state.matches.some(
        (routeMatch) => routeMatch.routeId === loginRoute.id,
      ),
    ).toBe(true)
  })

  it('a loader redirect lands on the target route', async () => {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
    })
    const targetRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'target',
    })
    const sourceRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'source',
      loader: () => {
        throw redirect({ to: '/target' })
      },
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, targetRoute, sourceRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    await router.load()

    await router.navigate({ to: '/source' })
    await sleep(20)

    expect(router.state.location.pathname).toBe('/target')
    expect(
      router.state.matches.some(
        (routeMatch) => routeMatch.routeId === targetRoute.id,
      ),
    ).toBe(true)
  })
})

describe('notFound', () => {
  it('a loader that throws notFound() marks the not-found state', async () => {
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
    })
    const missingRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'missing',
      loader: () => {
        throw notFound()
      },
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, missingRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    await router.load()

    await router.navigate({ to: '/missing' })
    await sleep(20)

    expect(router.hasNotFoundMatch()).toBe(true)
    // The match of the throwing route reflects the not-found status.
    const missingMatch = router.state.matches.find(
      (routeMatch) => routeMatch.routeId === missingRoute.id,
    )
    expect(missingMatch?.status).toBe('notFound')
  })
})

describe('router context', () => {
  it('passes context through beforeLoad and into loaders', async () => {
    const rootRoute = createRootRouteWithContext<{ user: string }>()()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
    })
    const profileRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'profile',
      beforeLoad: ({ context }) => ({
        greeting: `hello ${context.user}`,
      }),
      loader: ({ context }) => context.greeting,
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, profileRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
      context: { user: 'anna' },
    })
    await router.load()

    await router.navigate({ to: '/profile' })
    await sleep(20)

    const profileMatch = router.state.matches.find(
      (routeMatch) => routeMatch.routeId === profileRoute.id,
    )
    expect(profileMatch?.context.user).toBe('anna')
    expect(profileMatch?.context.greeting).toBe('hello anna')
    expect(profileMatch?.loaderData).toBe('hello anna')
  })
})

describe('preloadRoute', () => {
  it('warms the loader so navigation reuses the preloaded match', async () => {
    const loaderSpy = vi.fn(({ params }: { params: { postId: string } }) => ({
      title: `Post ${params.postId}`,
    }))
    const rootRoute = createRootRoute()
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
    })
    const postRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: 'posts/$postId',
      loader: loaderSpy,
    })
    const router = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, postRoute]),
      history: createMemoryHistory({ initialEntries: ['/'] }),
      // Keep the preloaded match fresh for the subsequent navigation;
      // without a staleTime the navigation would kick off a background
      // reload (default staleTime is 0).
      defaultStaleTime: 10_000,
    })
    await router.load()

    await router.preloadRoute({
      to: '/posts/$postId',
      params: { postId: '1' },
    })
    expect(loaderSpy).toHaveBeenCalledTimes(1)

    await router.navigate({ to: '/posts/$postId', params: { postId: '1' } })
    await sleep(20)

    expect(loaderSpy).toHaveBeenCalledTimes(1)
    const postMatch = router.state.matches.find(
      (routeMatch) => routeMatch.routeId === postRoute.id,
    )
    expect(postMatch?.status).toBe('success')
    expect(postMatch?.loaderData).toEqual({ title: 'Post 1' })
  })
})
