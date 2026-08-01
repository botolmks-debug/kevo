"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FileButton } from "@/components/ui/FileButton";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
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

  // Fungsi ini juga dipanggil dari handleUpload (event handler) untuk
  // refresh daftar setelah upload sukses — di situ aman, beda dengan
  // memanggilnya langsung dari body useEffect (react-hooks/set-state-in-effect).
  async function loadImages() {
    setListError(null);
    try {
      const res = await fetch("/api/images");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Gagal memuat daftar gambar.");
      }
      setImages(data?.images ?? []);
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Gagal memuat daftar gambar.");
    }
  }

  useEffect(() => {
    let cancelled = false;

    fetch("/api/images")
      .then(async (res) => ({ ok: res.ok, data: await res.json().catch(() => null) }))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) {
          setListError(data?.error ?? "Gagal memuat daftar gambar.");
          return;
        }
        setImages(data?.images ?? []);
      })
      .catch(() => {
        if (!cancelled) setListError("Gagal memuat daftar gambar.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUpload() {
    if (!file) {
      setUploadStatus("error");
      setUploadError("Pilih file gambar dulu.");
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
      if (!res.ok) {
        throw new Error(data?.error ?? "Gagal mengunggah gambar.");
      }

      setFile(null);
      setDescription("");
      setSizeHint("");
      setUploadStatus("success");
      await loadImages();
    } catch (error) {
      setUploadStatus("error");
      setUploadError(error instanceof Error ? error.message : "Gagal mengunggah gambar.");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setListError(null);

    try {
      const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Gagal menghapus gambar.");
      }
      await loadImages();
    } catch (error) {
      setListError(error instanceof Error ? error.message : "Gagal menghapus gambar.");
    } finally {
      setDeletingId(null);
    }
  }

  const isUploading = uploadStatus === "loading";
  const groups = IMAGE_CATEGORIES.map((def) => ({
    ...def,
    images: images.filter((image) => image.category === def.category),
  })).filter((group) => group.images.length > 0);

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h3 className="font-semibold text-navy">Database Gambar</h3>
        <p className="text-sm text-navy/60">
          Unggah gambar bisnis (logo, produk, suasana, dll) untuk dipakai nanti saat generate konten.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <FileButton
          accept="image/*"
          aria-label="Pilih file gambar"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          label="Pilih Gambar"
        />
        {file ? <span className="text-sm text-navy/50">{file.name}</span> : null}
      </div>

      <Textarea
        label="Deskripsi"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="mis. Logo klinik warna biru, dipakai di semua konten"
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-navy">
          Estimasi ukuran produk <span className="font-normal text-navy/50">(opsional)</span>
        </span>
        <input
          value={sizeHint}
          onChange={(e) => setSizeHint(e.target.value)}
          placeholder="mis. tinggi produk 10 cm  : isi dengan akurat : untuk meningkatkan keakuratan produk "
          className="rounded-card border border-slate-200 bg-white px-4 py-2.5 text-sm text-navy focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <span className="text-xs text-navy/50">Membantu AI menjaga skala produk (mis. produk besar tidak dikecilkan).</span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-navy">Kategori</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-card border border-slate-200 bg-white px-4 py-2.5 text-sm text-navy focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {IMAGE_CATEGORIES.map((c) => (
            <option key={c.category} value={c.category}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-navy">Perlakuan gambar</span>
        <div className="flex gap-4 text-sm text-navy">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="usage"
              checked={usage === "apa_adanya"}
              onChange={() => setUsage("apa_adanya")}
            />
            Apa adanya (dipakai langsung)
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="usage"
              checked={usage === "olah_ai"}
              onChange={() => setUsage("olah_ai")}
            />
            Boleh diolah AI
          </label>
        </div>
      </div>

      <Button type="button" onClick={handleUpload} disabled={isUploading} className="w-fit">
        {isUploading ? "Mengunggah…" : "Unggah Gambar"}
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
                  {/* eslint-disable-next-line @next/next/no-img-element -- gambar dari Supabase Storage, bukan aset statis */}
                  <img
                    src={image.publicUrl}
                    alt={image.description || group.label}
                    className="h-24 w-24 rounded-card object-cover"
                  />
                  <span className="max-w-24 truncate text-xs text-navy/60" title={image.description}>
                    {image.description || "(tanpa deskripsi)"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(image.id)}
                    disabled={deletingId === image.id}
                    className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                  >
                    {deletingId === image.id ? "Menghapus…" : "Hapus"}
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
