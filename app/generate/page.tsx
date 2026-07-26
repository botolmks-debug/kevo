"use client";

import { useEffect, useState } from "react";
import { pengumumanTemplate } from "@/lib/templates/example-pengumuman";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { Input, Textarea } from "@/components/ui/Input";
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
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-8">
        <h1 className="text-2xl font-bold text-navy">Generate Konten</h1>

        <Card className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-navy">Template</span>
            <select
              disabled
              className="rounded-card border border-slate-200 bg-surface px-4 py-2.5 text-sm text-navy"
            >
              <option>{pengumumanTemplate.name}</option>
            </select>
          </label>

          <Input
            label="Headline"
            type="text"
            value={form.headline}
            onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
            placeholder="Judul pengumuman"
          />

          <Textarea
            label="Isi"
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            placeholder="Isi pengumuman"
          />

          <Input
            label="URL Gambar (opsional)"
            type="url"
            value={form.photoUrl}
            onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))}
            placeholder="https://..."
          />

          <Button type="button" onClick={handleGenerate} disabled={isLoading} className="w-fit">
            {isLoading ? "Sedang membuat…" : "Generate"}
          </Button>

          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
        </Card>

        {previewUrl ? (
          <Card className="flex flex-col items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau blob lokal, bukan aset statis */}
            <img
              src={previewUrl}
              alt="Hasil generate"
              className="h-auto w-full max-w-sm rounded-card border border-slate-200"
            />
            <a
              href={previewUrl}
              download="hasil.png"
              className="rounded-card border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
            >
              Download PNG
            </a>
          </Card>
        ) : null}
      </main>
    </>
  );
}
