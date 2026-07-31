import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateJsonContent } from "@/lib/ai/geminiJson";

const ORIGINAL_ENV = { ...process.env };

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function textCandidate(text: string) {
  return { candidates: [{ content: { parts: [{ text }] } }] };
}

describe("generateJsonContent", () => {
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

    const result = await generateJsonContent("halo");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/GEMINI_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parses a clean JSON response", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, textCandidate('{"onImageText":"Kopi Segar","caption":"Halo!"}')));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateJsonContent("buat konten");

    expect(result).toEqual({ ok: true, data: { onImageText: "Kopi Segar", caption: "Halo!" } });
  });

  it("requests JSON response mime type", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, textCandidate('{"onImageText":"a","caption":"b"}')));
    vi.stubGlobal("fetch", fetchMock);

    await generateJsonContent("buat konten");

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
  });

  it("strips a ```json markdown fence before parsing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse(200, textCandidate('```json\n{"onImageText":"Kopi Segar","caption":"Halo!"}\n```')),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateJsonContent("buat konten");

    expect(result).toEqual({ ok: true, data: { onImageText: "Kopi Segar", caption: "Halo!" } });
  });

  it("returns a friendly error when the response is not valid JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, textCandidate("bukan json sama sekali")));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateJsonContent("buat konten");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/format tidak valid/i);
  });

  it("gives a friendly message when the configured model is not found (404)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(404, { error: { message: "model not found" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateJsonContent("halo");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/tidak ditemukan/i);
  });

  it("retries on 503 up to 3 times with 3s/6s/10s backoff, then gives up with a friendly message", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(503, {}));
    vi.stubGlobal("fetch", fetchMock);

    const pending = generateJsonContent("halo");
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(3_000);
    await vi.advanceTimersByTimeAsync(6_000);
    await vi.advanceTimersByTimeAsync(10_000);

    const result = await pending;

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/sibuk/i);
  });

  it("returns a friendly timeout message when the request aborts", async () => {
    const abortError = new DOMException("aborted", "AbortError");
    const fetchMock = vi.fn().mockRejectedValue(abortError);
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateJsonContent("halo");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/timeout/i);
  });
});
