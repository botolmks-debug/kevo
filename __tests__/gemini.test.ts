import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateCaption } from "@/lib/ai/gemini";

const ORIGINAL_ENV = { ...process.env };

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("generateCaption", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, GEMINI_API_KEY: "test-key" };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns a friendly error and never calls fetch when the API key is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateCaption("halo");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/GEMINI_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the generated text on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        candidates: [{ content: { parts: [{ text: "  Promo spesial minggu ini! #klinik  " }] } }],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateCaption("halo");

    expect(result).toEqual({ ok: true, text: "Promo spesial minggu ini! #klinik" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives a friendly message when the configured model is not found (404)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(404, { error: { message: "model not found" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateCaption("halo");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/tidak ditemukan/i);
  });

  it("retries on 503 up to 3 times with 3s/6s/10s backoff, then gives up with a friendly message", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(503, {}));
    vi.stubGlobal("fetch", fetchMock);

    const pending = generateCaption("halo");
    // flush microtasks so the first fetch call happens before advancing timers
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(3_000);
    await vi.advanceTimersByTimeAsync(6_000);
    await vi.advanceTimersByTimeAsync(10_000);

    const result = await pending;

    expect(fetchMock).toHaveBeenCalledTimes(4); // 1 percobaan awal + 3 retry
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/sibuk/i);
  });

  it("recovers if a 503 is followed by a success on retry", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(jsonResponse(200, { candidates: [{ content: { parts: [{ text: "Caption oke" }] } }] }));
    vi.stubGlobal("fetch", fetchMock);

    const pending = generateCaption("halo");
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(3_000);

    const result = await pending;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ok: true, text: "Caption oke" });
  });

  it("returns a friendly timeout message when the request aborts", async () => {
    const abortError = new DOMException("aborted", "AbortError");
    const fetchMock = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateCaption("halo");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/timeout/i);
  });

  it("does not crash and returns a friendly message on network failure", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateCaption("halo");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  });
});
