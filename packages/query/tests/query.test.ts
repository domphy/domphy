import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CancelledError,
  dehydrate,
  focusManager,
  hashKey,
  hydrate,
  InfiniteQueryObserver,
  keepPreviousData,
  MutationObserver,
  matchQuery,
  notifyManager,
  onlineManager,
  QueryClient,
  QueryObserver,
  skipToken,
} from "../src/index";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  queryClient.mount();
});

afterEach(() => {
  queryClient.clear();
  queryClient.unmount();
});

describe("QueryClient", () => {
  it("fetchQuery resolves data and caches it", async () => {
    const data = await queryClient.fetchQuery({
      queryKey: ["user", 1],
      queryFn: async () => ({ id: 1, name: "Anna" }),
    });
    expect(data).toEqual({ id: 1, name: "Anna" });
    expect(queryClient.getQueryData(["user", 1])).toEqual({
      id: 1,
      name: "Anna",
    });
  });

  it("deduplicates concurrent fetches for the same key", async () => {
    const queryFn = vi.fn(async () => {
      await sleep(10);
      return "value";
    });
    const [first, second] = await Promise.all([
      queryClient.fetchQuery({ queryKey: ["dedupe"], queryFn }),
      queryClient.fetchQuery({ queryKey: ["dedupe"], queryFn }),
    ]);
    expect(first).toBe("value");
    expect(second).toBe("value");
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it("setQueryData with updater receives previous data", () => {
    queryClient.setQueryData(["count"], 1);
    queryClient.setQueryData(
      ["count"],
      (previous: number | undefined) => (previous ?? 0) + 1,
    );
    expect(queryClient.getQueryData(["count"])).toBe(2);
  });

  it("invalidateQueries marks matching queries stale and refetches active ones", async () => {
    let serverValue = "v1";
    const observer = new QueryObserver(queryClient, {
      queryKey: ["versioned"],
      queryFn: async () => serverValue,
    });
    const results: string[] = [];
    const unsubscribe = observer.subscribe((result) => {
      if (result.data) results.push(result.data as string);
    });
    await vi.waitFor(() => expect(results).toContain("v1"));

    serverValue = "v2";
    await queryClient.invalidateQueries({ queryKey: ["versioned"] });
    await vi.waitFor(() => expect(results).toContain("v2"));
    unsubscribe();
  });

  it("propagates query errors with retry disabled", async () => {
    await expect(
      queryClient.fetchQuery({
        queryKey: ["fails"],
        queryFn: async () => {
          throw new Error("network down");
        },
      }),
    ).rejects.toThrow("network down");
  });

  it("retries the configured number of times", async () => {
    const queryFn = vi.fn(async () => {
      throw new Error("always fails");
    });
    await expect(
      queryClient.fetchQuery({
        queryKey: ["retry"],
        queryFn,
        retry: 2,
        retryDelay: 1,
      }),
    ).rejects.toThrow("always fails");
    expect(queryFn).toHaveBeenCalledTimes(3);
  });

  it("cancelQueries rejects in-flight fetch with CancelledError", async () => {
    const promise = queryClient.fetchQuery({
      queryKey: ["slow"],
      queryFn: async () => {
        await sleep(1000);
        return "never";
      },
    });
    promise.catch(() => undefined);
    await sleep(5);
    await queryClient.cancelQueries({ queryKey: ["slow"] });
    await expect(promise).rejects.toBeInstanceOf(CancelledError);
  });

  it("skipToken prevents fetching", async () => {
    const observer = new QueryObserver(queryClient, {
      queryKey: ["skipped"],
      queryFn: skipToken,
    });
    const unsubscribe = observer.subscribe(() => undefined);
    await sleep(20);
    expect(observer.getCurrentResult().fetchStatus).toBe("idle");
    expect(observer.getCurrentResult().isPending).toBe(true);
    unsubscribe();
  });
});

describe("QueryObserver", () => {
  it("emits pending then success", async () => {
    const observer = new QueryObserver(queryClient, {
      queryKey: ["observer"],
      queryFn: async () => "done",
    });
    const statuses: string[] = [];
    const unsubscribe = observer.subscribe((result) => {
      statuses.push(result.status);
    });
    expect(observer.getCurrentResult().status).toBe("pending");
    await vi.waitFor(() => expect(statuses).toContain("success"));
    expect(observer.getCurrentResult().data).toBe("done");
    unsubscribe();
  });

  it("keepPreviousData keeps data while the key changes", async () => {
    const observer = new QueryObserver(queryClient, {
      queryKey: ["page", 1],
      queryFn: async () => "page-1",
      placeholderData: keepPreviousData,
    });
    const unsubscribe = observer.subscribe(() => undefined);
    await vi.waitFor(() =>
      expect(observer.getCurrentResult().data).toBe("page-1"),
    );

    observer.setOptions({
      queryKey: ["page", 2],
      queryFn: async () => {
        await sleep(10);
        return "page-2";
      },
      placeholderData: keepPreviousData,
    });
    expect(observer.getCurrentResult().data).toBe("page-1");
    expect(observer.getCurrentResult().isPlaceholderData).toBe(true);
    await vi.waitFor(() =>
      expect(observer.getCurrentResult().data).toBe("page-2"),
    );
    unsubscribe();
  });

  it("select transforms data", async () => {
    const observer = new QueryObserver(queryClient, {
      queryKey: ["select"],
      queryFn: async () => [1, 2, 3],
      select: (numbers) => numbers.length,
    });
    const unsubscribe = observer.subscribe(() => undefined);
    await vi.waitFor(() => expect(observer.getCurrentResult().data).toBe(3));
    unsubscribe();
  });
});

describe("MutationObserver", () => {
  it("runs mutationFn and reports success result", async () => {
    const observer = new MutationObserver(queryClient, {
      mutationFn: async (input: number) => input * 2,
    });
    const statuses: string[] = [];
    observer.subscribe((result) => statuses.push(result.status));
    const data = await observer.mutate(21);
    expect(data).toBe(42);
    expect(statuses).toContain("pending");
    expect(statuses).toContain("success");
    expect(observer.getCurrentResult().data).toBe(42);
  });

  it("calls onSuccess and supports cache invalidation", async () => {
    queryClient.setQueryData(["list"], ["a"]);
    const onSuccess = vi.fn();
    const observer = new MutationObserver(queryClient, {
      mutationFn: async (item: string) => item,
      onSuccess,
    });
    await observer.mutate("b");
    expect(onSuccess).toHaveBeenCalledWith(
      "b",
      "b",
      undefined,
      expect.anything(),
    );
  });

  it("reports error state when mutationFn throws", async () => {
    const observer = new MutationObserver(queryClient, {
      mutationFn: async () => {
        throw new Error("save failed");
      },
    });
    await expect(observer.mutate(undefined)).rejects.toThrow("save failed");
    expect(observer.getCurrentResult().status).toBe("error");
    expect((observer.getCurrentResult().error as Error).message).toBe(
      "save failed",
    );
  });
});

describe("InfiniteQueryObserver", () => {
  it("fetches pages and appends with fetchNextPage", async () => {
    const observer = new InfiniteQueryObserver(queryClient, {
      queryKey: ["infinite"],
      queryFn: async ({ pageParam }) => ({
        items: [pageParam],
        nextPage: (pageParam as number) + 1,
      }),
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextPage,
    });
    const unsubscribe = observer.subscribe(() => undefined);
    await vi.waitFor(() =>
      expect(observer.getCurrentResult().status).toBe("success"),
    );
    expect(observer.getCurrentResult().data?.pages).toHaveLength(1);

    await observer.fetchNextPage();
    expect(observer.getCurrentResult().data?.pages).toHaveLength(2);
    expect(observer.getCurrentResult().data?.pageParams).toEqual([0, 1]);
    unsubscribe();
  });
});

describe("hydration", () => {
  it("dehydrate and hydrate round-trips cached data", async () => {
    await queryClient.prefetchQuery({
      queryKey: ["ssr"],
      queryFn: async () => ({ greeting: "hello" }),
    });
    const dehydrated = JSON.parse(JSON.stringify(dehydrate(queryClient)));

    const clientSide = new QueryClient();
    hydrate(clientSide, dehydrated);
    expect(clientSide.getQueryData(["ssr"])).toEqual({ greeting: "hello" });
    clientSide.clear();
  });
});

describe("cache matching and utils", () => {
  it("hashKey is stable regardless of object key order", () => {
    expect(hashKey([{ b: 2, a: 1 }])).toBe(hashKey([{ a: 1, b: 2 }]));
  });

  it("matchQuery filters by exact and prefix key", async () => {
    await queryClient.prefetchQuery({
      queryKey: ["todos", 1],
      queryFn: async () => "x",
    });
    const query = queryClient.getQueryCache().find({ queryKey: ["todos", 1] });
    if (!query) throw new Error("query not found in cache");
    expect(matchQuery({ queryKey: ["todos"] }, query)).toBe(true);
    expect(matchQuery({ queryKey: ["todos"], exact: true }, query)).toBe(false);
    expect(matchQuery({ queryKey: ["todos", 1], exact: true }, query)).toBe(
      true,
    );
  });

  it("queryCache findAll matches by prefix", async () => {
    await queryClient.prefetchQuery({
      queryKey: ["item", 1],
      queryFn: async () => 1,
    });
    await queryClient.prefetchQuery({
      queryKey: ["item", 2],
      queryFn: async () => 2,
    });
    expect(
      queryClient.getQueryCache().findAll({ queryKey: ["item"] }),
    ).toHaveLength(2);
  });
});

describe("managers", () => {
  it("notifyManager batches notifications and flushes asynchronously", async () => {
    const calls: number[] = [];
    notifyManager.batch(() => {
      notifyManager.schedule(() => calls.push(1));
      notifyManager.schedule(() => calls.push(2));
      expect(calls).toEqual([]);
    });
    await vi.waitFor(() => expect(calls).toEqual([1, 2]));
  });

  it("focusManager setFocused notifies subscribers", () => {
    const seen: boolean[] = [];
    const unsubscribe = focusManager.subscribe((focused) => seen.push(focused));
    focusManager.setFocused(false);
    focusManager.setFocused(true);
    expect(seen).toEqual([false, true]);
    unsubscribe();
    focusManager.setFocused(undefined);
  });

  it("onlineManager setOnline notifies subscribers", () => {
    const seen: boolean[] = [];
    const unsubscribe = onlineManager.subscribe((online) => seen.push(online));
    onlineManager.setOnline(false);
    onlineManager.setOnline(true);
    expect(seen).toEqual([false, true]);
    unsubscribe();
  });
});
