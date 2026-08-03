"use client";

import { useState } from "react";
import Link from "next/link";

type Step = { title: string; href: string; hrefLabel: string; desc: string };

const STEPS: Step[] = [
  {
    title: "Upload Logo",
    href: "/dashboard",
    hrefLabel: "Buka Dashboard",
    desc: "Mulai dengan mengunggah logo usahamu di Dashboard. Logo ini otomatis muncul di setiap konten. Kalau punya, sediakan versi terang & gelap biar pas di background apa pun.",
  },
  {
    title: "Atur Sosial Media",
    href: "/dashboard",
    hrefLabel: "Buka Dashboard",
    desc: "Isi akun sosmedmu (Instagram, WhatsApp, YouTube, dll — maksimal 3) di Dashboard → Sosial Media. Ini yang tampil di baris bawah setiap konten.",
  },
  {
    title: "Upload Jenis Produk",
    href: "/dashboard",
    hrefLabel: "Buka Dashboard",
    desc: "Unggah foto produk lalu pilih kategorinya (Produk, Makanan/Minuman, Kecantikan/Skincare, Wajah/Orang, Suasana/Fasilitas) dan perlakuannya: tampilkan apa adanya, atau olah AI. Foto & kategori inilah bahan kontenmu.",
  },
  {
    title: "Buat Konten Manual",
    href: "/generate",
    hrefLabel: "Buka Buat Konten",
    desc: "Pilih template & foto, tulis teksmu sendiri, atur posisi teks/logo/sosmed. Cocok kalau kamu mau kontrol penuh atas hasilnya.",
  },
  {
    title: "Buat Konten Otomatis",
    href: "/generate-otomatis",
    hrefLabel: "Buka Otomatis",
    desc: "AI membuatkan gambar + caption otomatis dari data usahamu. Pilih jenis (Produk / Umum / Interaksi) dan ukuran (Feed / Kotak / Story), klik Generate — jadi dalam hitungan detik.",
  },
  {
    title: "Edit Konten",
    href: "/konten",
    hrefLabel: "Buka Edit Konten",
    desc: "Semua kontenmu tersimpan di sini. Buka lagi untuk mengubah teks, menggeser logo/sosmed, atau menyimpan ulang sebagai PNG.",
  },
  {
    title: "Jadwal",
    href: "/jadwal",
    hrefLabel: "Buka Jadwal",
    desc: "Atur kapan tiap konten mau diposting dan lihat kalendernya — biar posting rutin tanpa lupa.",
  },
];

export function PanduanWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState(0);
  if (!open) return null;

  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function close() {
    setStep(0);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Panduan Mulai</p>
            <p className="text-xs text-navy/50">
              Langkah {step + 1} dari {STEPS.length}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Tutup"
            className="rounded-full p-1 text-navy/40 hover:bg-navy/5 hover:text-navy"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="6" y1="18" x2="18" y2="6" />
            </svg>
          </button>
        </div>

        <div className="mt-3 flex gap-1.5">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-navy/10"}`} />
          ))}
        </div>

        <h2 className="mt-4 text-xl font-bold text-navy">
          {step + 1}. {s.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-navy/70">{s.desc}</p>

        <Link
          href={s.href}
          onClick={close}
          className="mt-4 inline-flex rounded-full border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10"
        >
          {s.hrefLabel} →
        </Link>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button type="button" onClick={close} className="text-sm text-navy/40 hover:text-navy/70 hover:underline">
            Lewati
          </button>
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((v) => v - 1)}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium text-navy/70 hover:bg-navy/5"
              >
                Kembali
              </button>
            ) : null}
            {isLast ? (
              <button
                type="button"
                onClick={close}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Selesai
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((v) => v + 1)}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Lanjut
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
