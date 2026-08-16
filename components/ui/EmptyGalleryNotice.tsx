"use client";

import Link from "next/link";
import { getLang } from "@/lib/i18n";
import { useEffect, useState } from "react";

/**
 * Banner ajakan saat GALERI KOSONG — dipasang di halaman Generate Otomatis
 * dan Buat Konten (manual). Banyak user langsung ke halaman generate tanpa
 * sadar harus upload foto produk dulu di halaman Upload Produk (/gambar);
 * banner ini mencegat mereka persis saat butuh, dengan link ke sana.
 *
 * Caller yang menentukan kapan tampil (biasanya: daftar gambar SUDAH selesai
 * dimuat DAN kosong) supaya banner tidak berkedip saat loading.
 */
export function EmptyGalleryNotice() {
  const [en, setEn] = useState(false);
  useEffect(() => setEn(getLang() === "en"), []);
  const L = (id: string, enTxt: string) => (en ? enTxt : id);

  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-semibold text-amber-900">
          {L("Belum ada foto produk di galerimu", "No product photos in your gallery yet")}
        </p>
        <p className="text-xs text-amber-800/80">
          {L(
            "Foto produk adalah bahan utama konten. Upload dulu 1-2 foto, lalu kembali ke sini.",
            "Product photos are the main ingredient of your content. Upload 1-2 photos first, then come back here.",
          )}
        </p>
      </div>
      <Link
        href="/gambar"
        className="shrink-0 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
      >
        {L("Upload Gambar →", "Upload Image →")}
      </Link>
    </div>
  );
}
