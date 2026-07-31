import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { editImage, generateImage } from "@/lib/ai/geminiImage";

const ORIGINAL_ENV = { ...process.env };

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("editImage", () => {
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

    const result = await editImage({ imageBase64: "abc", mimeType: "image/jpeg", aspectRatio: "9:16", prompt: "x" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/GEMINI_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the composed image as a data URI on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        candidates: [
          { content: { parts: [{ inlineData: { mimeType: "image/png", data: "ZmFrZS1iYXNlNjQ=" } }] } },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await editImage({ imageBase64: "abc", mimeType: "image/jpeg", aspectRatio: "1:1", prompt: "keep object" });

    expect(result).toEqual({ ok: true, dataUri: "data:image/png;base64,ZmFrZS1iYXNlNjQ=" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("gemini-2.5-flash-image");
    const body = JSON.parse(init.body);
    expect(body.generationConfig.imageConfig.aspectRatio).toBe("1:1");
    expect(body.contents[0].parts[0].inlineData).toEqual({ mimeType: "image/jpeg", data: "abc" });
    expect(body.contents[0].parts[1].text).toBe("keep object");
  });

  it("gives a friendly message when the configured model is not found (404)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(404, { error: { message: "model not found" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await editImage({ imageBase64: "abc", mimeType: "image/jpeg", aspectRatio: "4:5", prompt: "x" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/tidak ditemukan/i);
  });

  it("retries on 503 up to 3 times with 3s/6s/10s backoff, then gives up with a friendly message", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(503, {}));
    vi.stubGlobal("fetch", fetchMock);

    const pending = editImage({ imageBase64: "abc", mimeType: "image/jpeg", aspectRatio: "9:16", prompt: "x" });
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

    const result = await editImage({ imageBase64: "abc", mimeType: "image/jpeg", aspectRatio: "1:1", prompt: "x" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/timeout/i);
  });

  it("returns a friendly message instead of throwing when no image comes back", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { candidates: [{ content: { parts: [{}] } }] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await editImage({ imageBase64: "abc", mimeType: "image/jpeg", aspectRatio: "1:1", prompt: "x" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/tidak mengembalikan gambar/i);
  });
});

describe("generateImage", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, GEMINI_API_KEY: "test-key" };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    process.env = { ...ORIGINAL_ENV };
  });

  it("sends only a text part, with no source image, to Gemini", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, {
        candidates: [
          { content: { parts: [{ inlineData: { mimeType: "image/png", data: "ZmFrZS1iYXNlNjQ=" } }] } },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateImage({ prompt: "foto suasana kedai kopi", aspectRatio: "4:5" });

    expect(result).toEqual({ ok: true, dataUri: "data:image/png;base64,ZmFrZS1iYXNlNjQ=" });
    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.contents[0].parts).toEqual([{ text: "foto suasana kedai kopi" }]);
    expect(body.generationConfig.imageConfig.aspectRatio).toBe("4:5");
  });

  it("returns a friendly error and never calls fetch when the API key is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateImage({ prompt: "x", aspectRatio: "1:1" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/GEMINI_API_KEY/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("retries on 503 and eventually gives up with a friendly message", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(503, {}));
    vi.stubGlobal("fetch", fetchMock);

    const pending = generateImage({ prompt: "x", aspectRatio: "9:16" });
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(3_000);
    await vi.advanceTimersByTimeAsync(6_000);
    await vi.advanceTimersByTimeAsync(10_000);

    const result = await pending;

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/sibuk/i);
  });

  it("returns a friendly message instead of throwing when no image comes back", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { candidates: [{ content: { parts: [{}] } }] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateImage({ prompt: "x", aspectRatio: "1:1" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/tidak mengembalikan gambar/i);
  });
});
