import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { langFromCookie, t } from "@/lib/i18n";
import { Header } from "@/components/ui/Header";
import { createClient } from "@/lib/supabase/server";
import { loadBusinessProfile } from "@/lib/supabase/businessProfile";
import { ImageLibrary } from "@/app/dashboard/ImageLibrary";
import { LogoSettings } from "@/app/dashboard/LogoSettings";

// ── Halaman Gambar ────────────────────────────────────────────────────
// Upload & kelola gambar sekarang menu sendiri (bukan bagian Dashboard).
// User BARU diarahkan ke sini dulu setelah login (belum punya gambar),
// lalu tombol "Lanjut Buat Konten" membawa ke Generate Otomatis.

export default async function GambarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await loadBusinessProfile(supabase, user.id);
  if (!result.ok || !result.profile) {
    redirect("/onboarding");
  }

  const lang = langFromCookie((await cookies()).get("lang")?.value);

  return (
    <>
      <Header />
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-navy">{t("dash.img.title", lang)}</h1>
          <p className="text-navy/60">{t("dash.img.desc", lang)}</p>
        </div>

        {/* Upload logo bisnis PINDAH ke sini (dulu di Dashboard) —
            satu tempat untuk semua aset gambar. Logo paling atas. */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-navy/50">{t("dash.logo.section", lang)}</h2>
          <LogoSettings />
        </section>

        <ImageLibrary />

        <Link
          href="/generate-otomatis"
          className="self-end rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
        >
          {t("gambar.continue", lang)}
        </Link>
      </main>
    </>
  );
}
