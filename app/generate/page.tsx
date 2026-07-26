"use client";

import { useEffect, useState } from "react";
import { templates } from "@/lib/templates";
import type { Slot } from "@/lib/templates/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { Input, Textarea } from "@/components/ui/Input";
import { buildRenderInput } from "./buildRenderInput";
import { validateGenerateForm } from "./validateGenerateForm";

type Status = "idle" | "loading" | "error" | "success";

function fieldLabel(slot: Slot): string {
  return slot.label ?? slot.id;
}

export default function GeneratePage() {
  const [templateId, setTemplateId] = useState(templates[0].id);
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? templates[0];

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    setValues({});
    setStatus("idle");
    setErrorMessage(null);
  }

  function setFieldValue(slotId: string, value: string) {
    setValues((v) => ({ ...v, [slotId]: value }));
  }

  async function handleGenerate() {
    const validation = validateGenerateForm(selectedTemplate, values);
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
        body: JSON.stringify(buildRenderInput(selectedTemplate, values)),
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
              value={templateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="rounded-card border border-slate-200 bg-white px-4 py-2.5 text-sm text-navy focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          {selectedTemplate.slots.map((slot) =>
            slot.type === "text" ? (
              slot.maxLines > 1 ? (
                <Textarea
                  key={slot.id}
                  label={fieldLabel(slot)}
                  value={values[slot.id] ?? ""}
                  onChange={(e) => setFieldValue(slot.id, e.target.value)}
                  placeholder={slot.placeholder}
                />
              ) : (
                <Input
                  key={slot.id}
                  label={fieldLabel(slot)}
                  type="text"
                  value={values[slot.id] ?? ""}
                  onChange={(e) => setFieldValue(slot.id, e.target.value)}
                  placeholder={slot.placeholder}
                />
              )
            ) : (
              <Input
                key={slot.id}
                label={`${fieldLabel(slot)} (opsional)`}
                type="url"
                value={values[slot.id] ?? ""}
                onChange={(e) => setFieldValue(slot.id, e.target.value)}
                placeholder={slot.placeholder ?? "https://..."}
              />
            ),
          )}

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
