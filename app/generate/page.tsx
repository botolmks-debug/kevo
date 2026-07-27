"use client";

import { useEffect, useRef, useState } from "react";
import { templates } from "@/lib/templates";
import type { AspectRatio, FooterSocial, Slot, Template } from "@/lib/templates/types";
import type { BusinessProfile } from "@/lib/onboarding/businessProfile";
import type { ImageUsage } from "@/lib/images/categories";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Header } from "@/components/ui/Header";
import { Input, Textarea } from "@/components/ui/Input";
import { buildFooterSocials } from "@/lib/onboarding/profileStorage";
import { buildRenderInput } from "./buildRenderInput";
import { validateGenerateForm } from "./validateGenerateForm";

const CAPTION_COOLDOWN_MS = 3_000;

const RATIO_OPTIONS: { value: AspectRatio; label: string }[] = [
  { value: "4:5", label: "Feed (4:5)" },
  { value: "1:1", label: "Kotak (1:1)" },
  { value: "9:16", label: "Story (9:16)" },
];

// NOTE: pemilihan gambar manual di sini masih sementara — akan digantikan
// auto-pilih dari deskripsi (spec-perbaikan-render-generate.md bagian A3)
// di irisan berikutnya.

function buildCaptionContentValues(
  slots: Slot[],
  values: Record<string, string>,
): Record<string, string> {
  const labeled: Record<string, string> = {};
  for (const slot of slots) {
    if (slot.type !== "text") continue;
    const value = values[slot.id];
    if (value && value.trim().length > 0) {
      labeled[fieldLabel(slot)] = value;
    }
  }
  return labeled;
}

function withFooterOverride(template: Template, businessName: string, socials: FooterSocial[]): Template {
  return {
    ...template,
    brand: {
      ...template.brand,
      footer: { text: businessName || template.brand.footer.text, socials },
    },
  };
}

type Status = "idle" | "loading" | "error" | "success";

type PickableImage = {
  id: string;
  description: string;
  category: string;
  publicUrl: string;
  usage: ImageUsage;
};

function fieldLabel(slot: Slot): string {
  return slot.label ?? slot.id;
}

export default function GeneratePage() {
  const [templateId, setTemplateId] = useState(templates[0].id);
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [footerOverride, setFooterOverride] = useState<{
    businessName: string;
    socials: FooterSocial[];
  } | null>(null);
  const [caption, setCaption] = useState("");
  const [captionStatus, setCaptionStatus] = useState<Status>("idle");
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [captionCooldown, setCaptionCooldown] = useState(false);
  const [images, setImages] = useState<PickableImage[]>([]);
  const [ratio, setRatio] = useState<AspectRatio>("4:5");
  const [selectedImageUrl, setSelectedImageUrl] = useState<Record<string, string>>({});
  const [aiComposeStatus, setAiComposeStatus] = useState<Record<string, Status>>({});
  const [aiComposeError, setAiComposeError] = useState<Record<string, string | null>>({});
  const aiComposeCache = useRef<Map<string, string>>(new Map());

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? templates[0];
  const templateToRender =
    footerOverride && footerOverride.socials.length > 0
      ? withFooterOverride(selectedTemplate, footerOverride.businessName, footerOverride.socials)
      : selectedTemplate;
  const selectedSlots = selectedTemplate.layouts[ratio].slots;

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/business-profile")
      .then((res) => res.json())
      .then((data: { profile?: BusinessProfile | null }) => {
        if (cancelled) return;
        const profile = data?.profile ?? null;
        setBusinessProfile(profile);
        if (profile) {
          setFooterOverride({ businessName: profile.business.name, socials: buildFooterSocials(profile) });
        }
      })
      .catch(() => {
        // gagal memuat profil bisnis dari DB: lanjut tanpa override footer/caption, bukan fatal.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/images")
      .then((res) => res.json())
      .then((data: { images?: PickableImage[] }) => {
        if (cancelled) return;
        setImages(data?.images ?? []);
      })
      .catch(() => {
        // gagal memuat Database Gambar: slot gambar tetap tampil kosong, bukan fatal.
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
    const validation = validateGenerateForm(selectedTemplate, values, ratio);
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
        body: JSON.stringify(buildRenderInput(templateToRender, values, ratio)),
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

  async function handleGenerateCaption() {
    if (!businessProfile) {
      setCaptionStatus("error");
      setCaptionError("Lengkapi profil bisnis di halaman onboarding dulu untuk memakai fitur ini.");
      return;
    }

    setCaptionStatus("loading");
    setCaptionError(null);

    try {
      const res = await fetch("/api/generate-caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: businessProfile,
          templateName: selectedTemplate.name,
          values: buildCaptionContentValues(selectedSlots, values),
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Gagal membuat caption.");
      }

      setCaption(data.caption);
      setCaptionStatus("success");
    } catch (error) {
      setCaptionStatus("error");
      setCaptionError(error instanceof Error ? error.message : "Gagal membuat caption.");
    } finally {
      setCaptionCooldown(true);
      setTimeout(() => setCaptionCooldown(false), CAPTION_COOLDOWN_MS);
    }
  }

  const isLoading = status === "loading";
  const isCaptionLoading = captionStatus === "loading";
  const isCaptionDisabled = isCaptionLoading || captionCooldown;

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

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-navy">Ukuran</span>
            <div className="flex gap-4">
              {RATIO_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1.5 text-sm text-navy">
                  <input
                    type="radio"
                    name="ratio"
                    checked={ratio === opt.value}
                    onChange={() => setRatio(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {selectedSlots.map((slot) =>
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
              <div key={slot.id} className="flex flex-col gap-1.5">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-navy">{`${fieldLabel(slot)} (opsional)`}</span>
                  <select
                    value={values[slot.id] ?? ""}
                    onChange={(e) => setFieldValue(slot.id, e.target.value)}
                    className="rounded-card border border-slate-200 bg-white px-4 py-2.5 text-sm text-navy focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">(Tidak ada foto)</option>
                    {images.map((image) => (
                      <option key={image.id} value={image.publicUrl}>
                        {image.category} — {image.description || "(tanpa deskripsi)"}
                      </option>
                    ))}
                  </select>
                </label>

                {images.length === 0 ? (
                  <p className="text-xs text-navy/50">
                    Belum ada gambar di Database Gambar. Unggah dulu di Dashboard.
                  </p>
                ) : null}

                {values[slot.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- pratinjau gambar dari Database Gambar (Supabase Storage) atau hasil adaptasi AI
                  <img
                    src={values[slot.id]}
                    alt="Pratinjau gambar terpilih"
                    className="h-20 w-20 rounded-card border border-slate-200 object-cover"
                  />
                ) : null}
              </div>
            ),
          )}

          <Button type="button" onClick={handleGenerate} disabled={isLoading} className="w-fit">
            {isLoading ? "Sedang membuat…" : "Generate"}
          </Button>

          {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
        </Card>

        <Card className="flex flex-col gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleGenerateCaption}
            disabled={isCaptionDisabled}
            className="w-fit"
          >
            {isCaptionLoading ? "Sedang membuat…" : "Generate Caption (AI)"}
          </Button>

          {captionError ? <p className="text-sm text-red-600">{captionError}</p> : null}

          <Textarea
            label="Caption (bisa diedit)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption akan muncul di sini setelah digenerate…"
          />
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
