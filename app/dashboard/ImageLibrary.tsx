"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FileButton } from "@/components/ui/FileButton";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { HelpTip } from "@/components/ui/HelpTip";
import { getLang, t, type Lang } from "@/lib/i18n";
import { DEFAULT_IMAGE_CATEGORY, IMAGE_CATEGORIES, type ImageUsage } from "@/lib/images/categories";

type UploadedImage = {
  id: string;
  storage_path: string;
  description: string;
  category: string;
  type: string;
  usage: ImageUsage;
  created_at: string;
  publicUrl: string;
};

type Status = "idle" | "loading" | "error" | "success";

export function ImageLibrary() {
  const [lang, setLangState] = useState<Lang>("id");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [sizeHint, setSizeHint] = useState("");
  const [category, setCategory] = useState(DEFAULT_IMAGE_CATEGORY);
  const [usage, setUsage] = useState<ImageUsage>("apa_adanya");
  const [uploadStatus, setUploadStatus] = useState<Status>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { setLangState(getLang()); }, []);

  async function loadImages() {
    setListError(null);
    try {
      const res = await fetch("/api/images");
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("dash.img.errList", getLang()));
      setImages(data?.images ?? []);
    } catch (error) {
      setListError(error instanceof Error ? error.message : t("dash.img.errList", getLang()));
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/images")
      .then(async (res) => ({ ok: res.ok, data: await res.json().catch(() => null) }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) { setListError(data?.error ?? t("dash.img.errList", getLang())); return; }
        setImages(data?.images ?? []);
      })
      .catch(() => { if (!cancelled) setListError(t("dash.img.errList", getLang())); });
    return () => { cancelled = true; };
  }, []);

  async function handleUpload() {
    if (!file) {
      setUploadStatus("error");
      setUploadError(t("dash.img.errNoFile", lang));
      return;
    }
    setUploadStatus("loading");
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("usage", usage);
      formData.append("sizeHint", sizeHint);
      const res = await fetch("/api/images", { method: "POST", body: formData });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("dash.img.errUpload", lang));
      setFile(null);
      setDescription("");
      setSizeHint("");
      setUploadStatus("success");
      await loadImages();
    } catch (error) {
      setUploadStatus("error");
      setUploadError(error instanceof Error ? error.message : t("dash.img.errUpload", lang));
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setListError(null);
    try {
      const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("dash.img.errDelete", lang));
      await loadImages();
    } catch (error) {
      setListError(error instanceof Error ? error.message : t("dash.img.errDelete", lang));
    } finally {
      setDeletingId(null);
    }
  }

  const isUploading = uploadStatus === "loading";
  const descPlaceholder =
    category === "Kecantikan/Skincare" ? t("dash.img.phSkincare", lang)
    : category === "Makanan/Minuman" ? t("dash.img.phFood", lang)
    : t("dash.img.phDefault", lang);
  const groups = IMAGE_CATEGORIES.map((def) => ({
    ...def,
    images: images.filter((image) => image.category === def.category),
  })).filter((group) => group.images.length > 0);

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h3 className="font-semibold text-navy">{t("dash.img.title", lang)}</h3>
        <p className="text-sm text-navy/60">{t("dash.img.desc", lang)}</p>
      </div>

      <div className="flex items-center gap-2">
        <FileButton accept="image/*" aria-label={t("dash.img.chooseAria", lang)}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} label={t("dash.img.choose", lang)} />
        {file ? <span className="text-sm text-navy/50">{file.name}</span> : null}
      </div>

      <Textarea label={t("dash.img.description", lang)} value={description}
        onChange={(e) => setDescription(e.target.value)} placeholder={descPlaceholder} />

      {category === "Makanan/Minuman" ? null : category === "Software/Website" ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">{t("dash.img.device", lang)}</span>
          <select value={sizeHint === "desktop" ? "desktop" : "smartphone"}
            onChange={(e) => setSizeHint(e.target.value)}
            className="rounded-card border border-slate-200 bg-white px-4 py-2.5 text-sm text-navy focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
            <option value="smartphone">Smartphone</option>
            <option value="desktop">{t("dash.img.deviceDesktop", lang)}</option>
          </select>
          <span className="text-xs text-navy/50">{t("dash.img.deviceHint", lang)}</span>
        </label>
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-navy">
            {category === "Suasana/Fasilitas" ? t("dash.img.roomSize", lang) : t("dash.img.productSize", lang)}{" "}
            <span className="font-normal text-navy/50">{t("dash.img.optional", lang)}</span>
          </span>
          <input value={sizeHint} onChange={(e) => setSizeHint(e.target.value)}
            placeholder={category === "Suasana/Fasilitas" ? t("dash.img.phRoom", lang) : t("dash.img.phProduct", lang)}
            className="rounded-card border border-slate-200 bg-white px-4 py-2.5 text-sm text-navy focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          <span className="text-xs text-navy/50">
            {category === "Suasana/Fasilitas" ? t("dash.img.hintRoom", lang) : t("dash.img.hintProduct", lang)}
          </span>
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-sm font-medium text-navy">
          {t("dash.img.category", lang)}
          <HelpTip title={t("dash.img.categoryTipTitle", lang)} align="left" text={t("dash.img.categoryTipText", lang)} />
        </span>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="rounded-card border border-slate-200 bg-white px-4 py-2.5 text-sm text-navy focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
          {IMAGE_CATEGORIES.map((c) => (
            <option key={c.category} value={c.category}>{c.label}</option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="flex items-center gap-1.5 text-sm font-medium text-navy">
          {t("dash.img.handling", lang)}
          <HelpTip title={t("dash.img.handling", lang)} align="left" text={
            <span className="flex flex-col gap-1.5">
              <span><b>{t("dash.img.asIsB", lang)}</b> {t("dash.img.asIsDesc", lang)}</span>
              <span><b>{t("dash.img.aiB", lang)}</b> {t("dash.img.aiDesc", lang)}</span>
            </span>
          } />
        </span>
        <div className="flex gap-4 text-sm text-navy">
          <label className="flex items-center gap-1.5">
            <input type="radio" name="usage" checked={usage === "apa_adanya"} onChange={() => setUsage("apa_adanya")} />
            {t("dash.img.asIs", lang)}
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" name="usage" checked={usage === "olah_ai"} onChange={() => setUsage("olah_ai")} />
            {t("dash.img.aiOk", lang)}
          </label>
        </div>
      </div>

      <Button type="button" onClick={handleUpload} disabled={isUploading} className="w-fit">
        {isUploading ? t("dash.img.uploading", lang) : t("dash.img.upload", lang)}
      </Button>

      {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}
      {listError ? <p className="text-sm text-red-600">{listError}</p> : null}

      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.category}>
            <h4 className="text-sm font-semibold text-navy">{group.label}</h4>
            <div className="mt-2 flex flex-wrap gap-3">
              {group.images.map((image) => (
                <div key={image.id} className="flex flex-col gap-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.publicUrl} alt={image.description || group.label} className="h-24 w-24 rounded-card object-cover" />
                  <span className="max-w-24 truncate text-xs text-navy/60" title={image.description}>
                    {image.description || t("dash.img.noDesc", lang)}
                  </span>
                  <button type="button" onClick={() => handleDelete(image.id)} disabled={deletingId === image.id}
                    className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50">
                    {deletingId === image.id ? t("dash.img.deleting", lang) : t("dash.img.delete", lang)}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
