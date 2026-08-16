// app/ide-konten/page.tsx
// Halaman index: daftar semua industri. Berfungsi sebagai "hub" internal linking
// supaya Google mudah menemukan semua halaman /ide-konten/[slug].

import type { Metadata } from "next";
import Link from "next/link";
import SeoHeader from "@/app/ide-konten/SeoHeader";
import { INDUSTRIES } from "@/lib/seo/industries";

export const metadata: Metadata = {
  title: "Ide Konten Instagram per Jenis Usaha — Gratis | Keposting",
  description:
    "Kumpulan ide konten Instagram gratis untuk berbagai jenis usaha: toko bangunan, usaha makanan, laundry, dan lainnya. Lengkap dengan contoh caption siap pakai.",
  alternates: { canonical: "https://www.keposting.com/ide-konten" },
};

export default function IdeKontenIndexPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <SeoHeader />
      <header className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            Ide Konten Instagram per Jenis Usaha
          </h1>
          <p className="mt-3 text-slate-600">
            Pilih jenis usahamu. Setiap halaman berisi 25 ide konten + contoh
            caption siap pakai — gratis, tanpa perlu daftar.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10">
        <ul className="grid gap-4 sm:grid-cols-2">
          {INDUSTRIES.map((i) => (
            <li key={i.slug}>
              <Link
                href={`/ide-konten/${i.slug}`}
                className="block rounded-xl border border-slate-200 p-5 transition hover:border-[#ff6b57] hover:shadow-sm"
              >
                <h2 className="font-semibold text-slate-900">{i.nama}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {i.ideKonten.length} ide konten + {i.contohCaption.length}{" "}
                  contoh caption
                </p>
              </Link>
            </li>
          ))}
        </ul>

        <section className="mt-12 rounded-2xl bg-[#0f2b46] p-6 text-white sm:p-8">
          <h2 className="text-xl font-bold">
            Nggak mau mikir konten sama sekali?
          </h2>
          <p className="mt-2 text-slate-200">
            Keposting bikinkan gambar + caption otomatis dari foto produkmu.
            Coba dulu, gratis, tanpa daftar.
          </p>
          <Link
            href="/coba"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#ff6b57] px-6 py-3 font-semibold text-white transition hover:bg-[#ff5540]"
          >
            Coba Sekarang
          </Link>
        </section>
      </div>
    </main>
  );
}
