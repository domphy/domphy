import { beforeEach, describe, expect, it } from "vitest"
import {
  createInfiniteQuery,
  createMutation,
  createQuery,
} from "../src/domphy/index"
import { QueryClient } from "../src/index"

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let client: QueryClient

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Number.POSITIVE_INFINITY } },
  })
  client.mount()
})

describe("createQuery", () => {
  it("seeds pending then resolves data reactively", async () => {
    const query = createQuery<number>(client, {
      queryKey: ["users"],
      queryFn: async () => {
        await sleep(5)
        return 42
      },
    })

    expect(query.isPending()).toBe(true)
    expect(query.data()).toBeUndefined()

    const seen: (number | undefined)[] = []
    query.data(() => seen.push(query.data()))

    await sleep(20)

    expect(query.data()).toBe(42)
    expect(query.isSuccess()).toBe(true)
    expect(query.isPending()).toBe(false)
    expect(seen).toContain(42)
    query.destroy()
  })

  it("only notifies fields that actually change (per-key granularity)", async () => {
    let value = 1
    const query = createQuery<number>(client, {
      queryKey: ["granular"],
      queryFn: async () => value,
    })
    await sleep(10)
    expect(query.data()).toBe(1)

    let dataCalls = 0
    let fetchingCalls = 0
    query.data(() => dataCalls++)
    query.isFetching(() => fetchingCalls++)

    // Refetch returns the same value -> isFetching toggles, data does not.
    value = 1
    await query.refetch()
    await sleep(10)

    expect(fetchingCalls).toBeGreaterThan(0)
    expect(dataCalls).toBe(0)
    query.destroy()
  })

  it("destroy unsubscribes from further updates", async () => {
    const query = createQuery<number>(client, {
      queryKey: ["destroy"],
      queryFn: async () => 1,
    })
    await sleep(10)

    let calls = 0
    query.data(() => calls++)
    query.destroy()

    await client.refetchQueries({ queryKey: ["destroy"] })
    await sleep(10)
    expect(calls).toBe(0)
  })
})

describe("createMutation", () => {
  it("runs and reflects result reactively", async () => {
    const mutation = createMutation<number, Error, number>(client, {
      mutationFn: async (input) => input * 2,
    })

    expect(mutation.isIdle()).toBe(true)

    const result = await mutation.mutateAsync(21)
    await sleep(5)

    expect(result).toBe(42)
    expect(mutation.data()).toBe(42)
    expect(mutation.isSuccess()).toBe(true)
    mutation.destroy()
  })

  it("fire-and-forget mutate swallows rejection but exposes error", async () => {
    const mutation = createMutation<number, Error, void>(client, {
      mutationFn: async () => {
        throw new Error("boom")
      },
    })

    mutation.mutate()
    await sleep(10)

    expect(mutation.isError()).toBe(true)
    expect(mutation.error()?.message).toBe("boom")
    mutation.destroy()
  })
})

describe("createInfiniteQuery", () => {
  it("fetches the first page and a next page", async () => {
    const query = createInfiniteQuery<number[], Error, number[], string[], number>(
      client,
      {
        queryKey: ["infinite"],
        queryFn: async ({ pageParam }) => [pageParam],
        initialPageParam: 0,
        getNextPageParam: (_last, allPages) =>
          allPages.length < 3 ? allPages.length : undefined,
      },
    )

    await sleep(10)
    expect(query.data()?.pages).toEqual([[0]])
    expect(query.hasNextPage()).toBe(true)

    await query.fetchNextPage()
    await sleep(10)
    expect(query.data()?.pages).toEqual([[0], [1]])
    query.destroy()
  })
})
