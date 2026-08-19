import Link from "next/link";

export default function MaintenancePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[#FAF8F3] px-5 text-center">
      <div className="flex flex-col items-center gap-6 max-w-sm">
        <div className="text-5xl">🔧</div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#17211f]">
            Sedang pemeliharaan
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#7c8a86]">
            Keposting sedang dalam pemeliharaan singkat untuk peningkatan
            layanan. Silakan kembali lagi dalam beberapa saat.
          </p>
        </div>
        <div className="rounded-2xl bg-[#EAF9F6] px-5 py-4 text-sm text-[#0E8F80]">
          Kami sedang bekerja keras untuk kamu 💪
        </div>
        <Link
          href="/"
          className="mt-2 text-sm text-[#7c8a86] underline underline-offset-2"
        >
          Kembali ke halaman utama
        </Link>
      </div>
    </main>
  );
}
