// app/ide-konten/SeoHeader.tsx
// Header sederhana untuk halaman SEO: logo Keposting (link ke home) + tombol Coba Gratis.
// GANTI LOGO_SRC di bawah sesuai nama file logo kamu di folder public/
// (contoh: "/logo.png" kalau filenya public/logo.png).

import Link from "next/link";

const LOGO_SRC = "/Logo/logo-keposting.png";

export default function SeoHeader() {
  return (
    <nav className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_SRC} alt="Keposting" className="h-7 w-auto" />
        </Link>
        <Link
          href="/coba"
          className="rounded-lg bg-[#ff6b57] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#ff5540]"
        >
          Coba Gratis
        </Link>
      </div>
    </nav>
  );
}
