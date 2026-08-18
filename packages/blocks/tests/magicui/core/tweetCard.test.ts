// @vitest-environment jsdom

import type { DomphyElement } from "@domphy/core";
import { ElementNode, flushSync, toState } from "@domphy/core";
import { afterEach, describe, expect, it } from "vitest";
import {
  type TweetData,
  tweetCard,
} from "../../../src/magicui/core/tweetCard.js";

function render(app: DomphyElement) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const node = new ElementNode(app);
  node.render(host);
  return { host, node };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("tweetCard", () => {
  it("renders a working demo with zero arguments (server-rendered path, no loading skeleton)", () => {
    const { host } = render(tweetCard());

    const article = host.querySelector('[role="article"]');
    expect(article).toBeTruthy();
    expect(host.textContent).toContain("Ada Byte");
    expect(host.textContent).toContain("@adabyte");
    // Static `tweet`/default-fixture path renders synchronously — no skeleton.
    expect(host.querySelector('[aria-label="Loading tweet"]')).toBeNull();
  });

  it("shows a skeleton while fetching by id, then swaps in the resolved tweet", async () => {
    const fixture: TweetData = {
      id: "t1",
      author: { name: "Grace Hopper", handle: "gracehopper", verified: true },
      text: "Testing tweetCard with an injectable fetcher.",
      createdAt: "2026-01-01T00:00:00Z",
    };
    const fetchTweet = () => Promise.resolve(fixture);

    const { host } = render(tweetCard({ tweetId: "t1", fetchTweet }));
    flushSync();
    expect(host.querySelector('[aria-label="Loading tweet"]')).toBeTruthy();

    await new Promise((resolve) => setTimeout(resolve, 0));
    flushSync();

    expect(host.textContent).toContain("Grace Hopper");
    expect(host.querySelector('[aria-label="Loading tweet"]')).toBeNull();
  });

  it("falls back to the unavailable state when the fetcher rejects", async () => {
    const { host } = render(
      tweetCard({
        tweetId: "missing",
        fetchTweet: () => Promise.reject(new Error("not found")),
      }),
    );
    flushSync();

    await new Promise((resolve) => setTimeout(resolve, 0));
    flushSync();

    expect(host.textContent).toContain("unavailable");
  });
});

describe("tweetCard — reused-node lifecycle", () => {
  it("applies a fetch that resolves after an ancestor re-render", async () => {
    let resolveTweet!: (data: TweetData) => void;
    const fetchTweet = () =>
      new Promise<TweetData>((resolve) => {
        resolveTweet = resolve;
      });
    const refresh = toState(0);
    const host = document.createElement("div");
    document.body.appendChild(host);
    const node = new ElementNode({
      div: (listener: unknown) => {
        (refresh.get as (l: unknown) => number)(listener);
        return [
          tweetCard({ tweetId: "t-reused", fetchTweet }) as DomphyElement,
        ];
      },
    } as DomphyElement);
    node.render(host);
    flushSync();
    expect(host.querySelector('[aria-label="Loading tweet"]')).toBeTruthy();

    // Fresh factory closure (new phase/tweetState) on the SAME article.
    refresh.set(1);
    flushSync();

    resolveTweet({
      id: "t-reused",
      author: { name: "Reuse Hopper", handle: "reuse" },
      text: "Persisted across generations.",
      createdAt: "2026-01-01T00:00:00Z",
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    flushSync();

    expect(host.textContent).toContain("Reuse Hopper");
    expect(host.querySelector('[aria-label="Loading tweet"]')).toBeNull();
  });
});
