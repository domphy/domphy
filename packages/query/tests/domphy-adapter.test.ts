import { beforeEach, describe, expect, it } from "vitest";
import {
  createInfiniteQuery,
  createMutation,
  createQuery,
} from "../src/domphy/index";
import { keepPreviousData, QueryClient } from "../src/index";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let client: QueryClient;

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
    },
  });
  client.mount();
});

describe("createQuery.setOptions", () => {
  it("forwards options to the observer (changing the query key swaps data)", async () => {
    const query = createQuery<string>(client, {
      queryKey: ["first"],
      queryFn: async () => "first-data",
    });
    await sleep(10);
    expect(query.data()).toBe("first-data");

    query.setOptions({
      queryKey: ["second"],
      queryFn: async () => "second-data",
    });
    await sleep(10);

    expect(query.data()).toBe("second-data");
    expect(query.observer.options.queryKey).toEqual(["second"]);
    query.destroy();
  });

  it("notifies a subscribed listener after setOptions swaps the data", async () => {
    const query = createQuery<number>(client, {
      queryKey: ["opts-a"],
      queryFn: async () => 1,
    });
    await sleep(10);

    let dataCalls = 0;
    query.data(() => dataCalls++);

    query.setOptions({ queryKey: ["opts-b"], queryFn: async () => 2 });
    await sleep(10);

    expect(query.data()).toBe(2);
    expect(dataCalls).toBeGreaterThan(0);
    query.destroy();
  });
});

describe("createQuery.refetch", () => {
  it("returns a promise resolving to the observer result with fresh data", async () => {
    let value = 10;
    const query = createQuery<number>(client, {
      queryKey: ["refetch-return"],
      queryFn: async () => value,
    });
    await sleep(10);
    expect(query.data()).toBe(10);

    value = 20;
    const result = await query.refetch();

    expect(result.data).toBe(20);
    expect(result.isSuccess).toBe(true);
    expect(query.data()).toBe(20);
    query.destroy();
  });
});

describe("createQuery throwOnError", () => {
  it("throws on reactive field read when throwOnError is true and the query errored", async () => {
    const query = createQuery(client, {
      queryKey: ["throw-on-error"],
      queryFn: async () => {
        throw new Error("boom");
      },
      throwOnError: true,
      retry: false,
    });

    await sleep(30);
    expect(query.isError()).toBe(true);

    // Imperative read without a listener must not throw.
    expect(query.error()).toBeInstanceOf(Error);
    expect(query.data()).toBeUndefined();

    // Reactive read (render path) must throw into the caller.
    const fakeListener = () => {};
    expect(() => query.data(fakeListener as any)).toThrow("boom");
    expect(() => query.status(fakeListener as any)).toThrow("boom");

    query.destroy();
  });

  it("does not throw on reactive read when throwOnError is false", async () => {
    const query = createQuery(client, {
      queryKey: ["no-throw"],
      queryFn: async () => {
        throw new Error("soft");
      },
      throwOnError: false,
      retry: false,
    });
    await sleep(30);
    const fakeListener = () => {};
    expect(query.isError(fakeListener as any)).toBe(true);
    expect(query.error(fakeListener as any)).toBeInstanceOf(Error);
    query.destroy();
  });
});

describe("createInfiniteQuery.fetchPreviousPage", () => {
  it("prepends a previous page using getPreviousPageParam", async () => {
    const query = createInfiniteQuery<
      number[],
      Error,
      number[],
      string[],
      number
    >(client, {
      queryKey: ["infinite-prev"],
      queryFn: async ({ pageParam }) => [pageParam],
      initialPageParam: 5,
      getNextPageParam: (last) => last[0] + 1,
      getPreviousPageParam: (first) =>
        first[0] > 0 ? first[0] - 1 : undefined,
    });

    await sleep(10);
    expect(query.data()?.pages).toEqual([[5]]);
    expect(query.hasPreviousPage()).toBe(true);

    const result = await query.fetchPreviousPage();
    await sleep(10);

    expect(query.data()?.pages).toEqual([[4], [5]]);
    expect(result.data?.pages).toEqual([[4], [5]]);
    query.destroy();
  });
});

describe("createMutation.reset", () => {
  it("returns the mutation back to idle and clears data", async () => {
    const mutation = createMutation<number, Error, number>(client, {
      mutationFn: async (input) => input * 2,
    });

    await mutation.mutateAsync(21);
    await sleep(5);
    expect(mutation.data()).toBe(42);
    expect(mutation.isSuccess()).toBe(true);

    mutation.reset();
    await sleep(5);

    expect(mutation.isIdle()).toBe(true);
    expect(mutation.data()).toBeUndefined();
    mutation.destroy();
  });

  it("notifies a status listener when reset is called", async () => {
    const mutation = createMutation<number, Error, number>(client, {
      mutationFn: async (input) => input,
    });
    await mutation.mutateAsync(1);
    await sleep(5);

    let statusCalls = 0;
    mutation.status(() => statusCalls++);

    mutation.reset();
    await sleep(5);

    expect(statusCalls).toBeGreaterThan(0);
    expect(mutation.status()).toBe("idle");
    mutation.destroy();
  });
});

describe("createQuery.isPlaceholderData", () => {
  it("is true while showing keepPreviousData across key changes", async () => {
    // Start with key "a"
    const query = createQuery<string>(client, {
      queryKey: ["placeholder", "a"],
      queryFn: async () => "page-a",
      placeholderData: keepPreviousData,
    });

    await sleep(20);
    expect(query.data()).toBe("page-a");
    expect(query.isPlaceholderData()).toBe(false);

    // Switch to key "b" — data for "b" is not yet cached, so the observer
    // shows the previous page-a data as placeholder while fetching.
    query.setOptions({
      queryKey: ["placeholder", "b"],
      queryFn: async () => "page-b",
      placeholderData: keepPreviousData,
    });

    // Immediately after key change the old data is shown as placeholder
    expect(query.isPlaceholderData()).toBe(true);

    await sleep(20);
    // After the new fetch resolves, placeholder flag clears
    expect(query.data()).toBe("page-b");
    expect(query.isPlaceholderData()).toBe(false);
    query.destroy();
  });
});

describe("createMutation.variables", () => {
  it("exposes the last submitted variables reactively", async () => {
    const mutation = createMutation<number, Error, number>(client, {
      mutationFn: async (input) => input + 1,
    });

    expect(mutation.variables()).toBeUndefined();

    let variableCalls = 0;
    mutation.variables(() => variableCalls++);

    await mutation.mutateAsync(99);
    await sleep(5);

    expect(mutation.variables()).toBe(99);
    expect(variableCalls).toBeGreaterThan(0);
    mutation.destroy();
  });
});
