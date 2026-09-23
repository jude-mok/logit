import { describe, it, expect } from "vitest";
import { filterMoments, monthKey, type Moment } from "./api";
const moments: Moment[] = [
  {
    id: 1,
    image_path: "a",
    comment: "Morning coffee",
    is_starred: true,
    created_at: new Date(2026, 8, 20).getTime() / 1000,
  },
  {
    id: 2,
    image_path: "b",
    comment: null,
    is_starred: false,
    created_at: new Date(2026, 7, 20).getTime() / 1000,
  },
];
describe("journal filters", () => {
  it("combines search, favorites and month without mutating the journal", () => {
    expect(
      filterMoments(moments, "COFFEE", true, "2026-09").map((m) => m.id),
    ).toEqual([1]);
    expect(moments.length).toBe(2);
  });
  it("handles missing captions and unmatched months", () => {
    expect(filterMoments(moments, "coffee", false, "2026-08")).toEqual([]);
    expect(
      filterMoments(moments, "", false, "2026-08").map((m) => m.id),
    ).toEqual([2]);
  });
  it("sorts newest first", () =>
    expect(
      filterMoments([...moments].reverse(), "", false, "").map((m) => m.id),
    ).toEqual([1, 2]));
  it("uses local calendar month for albums", () =>
    expect(monthKey(new Date(2026, 0, 1, 0, 1).getTime() / 1000)).toBe(
      "2026-01",
    ));
});

import { beforeEach, afterEach, vi } from "vitest";
import { request, session } from "./api";
describe("authenticated API requests", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => values.get(key) || null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("sends the session bearer token and leaves multipart boundaries to the browser", async () => {
    session.set("test-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: 1 })));
    vi.stubGlobal("fetch", fetchMock);
    const body = new FormData();
    body.append("comment", "hello");
    await request("/moments/", { method: "POST", body });
    const options = fetchMock.mock.calls[0][1];
    expect(options.headers.get("Authorization")).toBe("Bearer test-token");
    expect(options.headers.has("Content-Type")).toBe(false);
    expect(options.body).toBe(body);
  });
  it("expires only the session that made an unauthorized request", async () => {
    session.set("old");
    vi.stubGlobal("fetch", async () => {
      session.set("new");
      return new Response(JSON.stringify({ detail: "Expired" }), {
        status: 401,
      });
    });
    await expect(request("/me/")).rejects.toThrow("Expired");
    expect(session.get()).toBe("new");
    expect(window.dispatchEvent).not.toHaveBeenCalled();
  });
  it("clears a rejected current session but keeps it on network failure", async () => {
    session.set("current");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Network unavailable")),
    );
    await expect(request("/me/")).rejects.toThrow("Network unavailable");
    expect(session.get()).toBe("current");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ detail: "Expired" }), { status: 401 }),
        ),
    );
    await expect(request("/me/")).rejects.toThrow("Expired");
    expect(session.get()).toBe(null);
    expect(window.dispatchEvent).toHaveBeenCalledOnce();
  });
});
