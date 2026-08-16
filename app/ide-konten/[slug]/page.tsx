// app/ide-konten/[slug]/page.tsx
// Halaman SEO programatik: "25 Ide Konten Instagram untuk [Industri]".
// Semua slug di-prerender statis (generateStaticParams) — cepat & ramah Google.

import type { Metadata } from "next";
import Link from "next/link";
import SeoHeader from "../SeoHeader";
import { notFound } from "next/navigation";
import {
  getIndustry,
  getAllSlugs,
  INDUSTRIES,
} from "@/lib/seo/industries";

type Props = {
  params: Promise<{ slug: string }>;
};

// Prerender semua halaman industri saat build
export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

// Metadata per slug (title + description mengandung kata kunci)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) return {};

  const url = `https://www.keposting.com/ide-konten/${industry.slug}`;
  return {
    title: industry.metaTitle,
    description: industry.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: industry.metaTitle,
      description: industry.metaDescription,
      url,
      siteName: "Keposting",
      locale: "id_ID",
      type: "article",
    },
  };
}

export default async function IdeKontenPage({ params }: Props) {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) notFound();

  // Industri lain untuk internal linking (maks 6, tanpa halaman ini sendiri)
  const lainnya = INDUSTRIES.filter((i) => i.slug !== industry.slug).slice(
    0,
    6
  );

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <SeoHeader />
      {/* ===== Hero ===== */}
      <header className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#ff6b57]">
            Ide Konten Gratis
          </p>
          <h1 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">
            {industry.ideKonten.length} Ide Konten Instagram untuk{" "}
            {industry.nama}
          </h1>
          <p className="mt-3 text-slate-600">
            Plus {industry.contohCaption.length} contoh caption siap pakai.
            Tinggal pilih, sesuaikan, posting hari ini.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-10">
        {/* ===== Intro ===== */}
        <section className="space-y-4 text-[17px] leading-relaxed text-slate-700">
          {industry.intro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>

        {/* ===== Daftar ide ===== */}
        <section className="mt-10">
          <h2 className="text-2xl font-bold text-slate-900">
            Daftar Ide Konten
          </h2>
          <ol className="mt-6 space-y-5">
            {industry.ideKonten.map((ide, i) => (
              <li
                key={i}
                className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <h3 className="font-semibold text-slate-900">
                  {i + 1}. {ide.judul}
                </h3>
                <p className="mt-1 text-[15px] leading-relaxed text-slate-600">
                  {ide.deskripsi}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ===== CTA tengah ===== */}
        <section className="mt-12 rounded-2xl bg-[#0f2b46] p-6 text-white sm:p-8">
          <h2 className="text-xl font-bold sm:text-2xl">
            Ide sudah ada. Yang bikin siapa?
          </h2>
          <p className="mt-2 text-slate-200">
            Keposting mengubah foto biasa dari HP-mu jadi konten Instagram
            lengkap — gambar menarik + caption — dalam sekali klik. Tanpa
            perlu jago desain, tanpa mikir caption dari nol.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/coba"
              className="inline-flex items-center justify-center rounded-lg bg-[#ff6b57] px-6 py-3 font-semibold text-white transition hover:bg-[#ff5540]"
            >
              Coba Gratis Tanpa Daftar
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-lg border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Daftar & Dapat 5 Konten Gratis
            </Link>
          </div>
        </section>

        {/* ===== Contoh caption ===== */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-slate-900">
            Contoh Caption Siap Pakai
          </h2>
          <p className="mt-2 text-slate-600">
            Salin, ganti bagian dalam kurung dengan detail usahamu, posting.
          </p>
          <div className="mt-6 space-y-5">
            {industry.contohCaption.map((c, i) => (
              <figure
                key={i}
                className="rounded-xl border border-slate-200 bg-slate-50 p-5"
              >
                <figcaption className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#0f2b46]">
                  {c.judul}
                </figcaption>
                <blockquote className="whitespace-pre-line text-[15px] leading-relaxed text-slate-700">
                  {c.teks}
                </blockquote>
              </figure>
            ))}
          </div>
        </section>

        {/* ===== CTA bawah ===== */}
        <section className="mt-12 rounded-2xl border border-slate-200 p-6 text-center sm:p-8">
          <h2 className="text-xl font-bold text-slate-900">
            Capek mikir konten tiap hari?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-slate-600">
            Upload fotomu, pilih jenis konten, selesai. Keposting yang mikirkan
            gambar dan captionnya — kamu tinggal posting.
          </p>
          <Link
            href="/coba"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#ff6b57] px-8 py-3 font-semibold text-white transition hover:bg-[#ff5540]"
          >
            Lihat Hasilnya Sekarang
          </Link>
        </section>

        {/* ===== Internal linking ===== */}
        {lainnya.length > 0 && (
          <section className="mt-12 border-t border-slate-100 pt-8">
            <h2 className="text-lg font-bold text-slate-900">
              Ide konten untuk usaha lain
            </h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {lainnya.map((i) => (
                <li key={i.slug}>
                  <Link
                    href={`/ide-konten/${i.slug}`}
                    className="text-[#0f2b46] underline decoration-slate-300 underline-offset-4 hover:decoration-[#ff6b57]"
                  >
                    Ide Konten untuk {i.nama}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
