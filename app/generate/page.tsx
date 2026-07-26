"use client";

import { useEffect, useState } from "react";
import { pengumumanTemplate } from "@/lib/templates/example-pengumuman";
import { buildRenderInput, type GenerateFormState } from "./buildRenderInput";
import { validateGenerateForm } from "./validateGenerateForm";

type Status = "idle" | "loading" | "error" | "success";

const initialForm: GenerateFormState = { headline: "", body: "", photoUrl: "" };

export default function GeneratePage() {
  const [form, setForm] = useState<GenerateFormState>(initialForm);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  async function handleGenerate() {
    const validation = validateGenerateForm(form);
    if (!validation.ok) {
      setStatus("error");
      setErrorMessage(validation.error);
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildRenderInput(form)),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Gagal membuat gambar.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return url;
      });
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Gagal membuat gambar.");
    }
  }

  const isLoading = status === "loading";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Generate Konten</h1>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Template</span>
          <select
            disabled
            className="rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm"
          >
            <option>{pengumumanTemplate.name}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Headline</span>
          <input
            type="text"
            value={form.headline}
            onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="Judul pengumuman"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Isi</span>
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            className="min-h-24 rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="Isi pengumuman"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">URL Gambar (opsional)</span>
          <input
            type="url"
            value={form.photoUrl}
            onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))}
            className="rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="https://..."
          />
        </label>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-fit rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isLoading ? "Sedang membuat…" : "Generate"}
        </button>

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
      </div>

      {previewUrl ? (
        <div className="flex flex-col items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau blob lokal, bukan aset statis */}
          <img
            src={previewUrl}
            alt="Hasil generate"
            className="h-auto w-full max-w-sm rounded border border-gray-200"
          />
          <a
            href={previewUrl}
            download="hasil.png"
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium"
          >
            Download PNG
          </a>
        </div>
      ) : null}
    </main>
  );
}
