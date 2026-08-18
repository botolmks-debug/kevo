"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { AuthBackground } from "@/components/ui/AuthBackground";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { getStoredLang, setLang, t, type Lang } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Default BAHASA INDONESIA (pre-launch pasar Indonesia). Kalau user sudah
  // pernah memilih, pakai pilihannya.
  const [lang, setLangLocal] = useState<Lang>("id");

  useEffect(() => {
    // Pesan setelah konfirmasi email (Opsi B): akun aktif, minta user login.
    try {
      const q = new URLSearchParams(window.location.search);
      if (q.get("verified") === "1") setNotice("login.verifiedOk");
      const err = q.get("error");
      if (err) {
        setError(err.startsWith("login.") ? err : err);
        // Link kedaluwarsa/tak valid -> tampilkan tombol kirim ulang juga,
        // supaya user langsung bisa minta email baru tanpa buntu.
        if (err === "login.linkExpired") setShowResend(true);
      }
    } catch {}
    const stored = getStoredLang();
    if (stored) {
      setLangLocal(stored);
    } else {
      setLangLocal("id");
      setLang("id"); // simpan default supaya konsisten sampai ke dashboard
    }
  }, []);

  function chooseLang(next: Lang) {
    if (next === lang) return;
    setLang(next);
    setLangLocal(next);
  }

  async function handleLogin() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      // Supabase mengembalikan error khusus saat email belum dikonfirmasi.
      // Tanpa ini, user yang lupa klik link email lihat pesan "password salah"
      // (menyesatkan -> user frustrasi -> pergi). Pisahkan jadi pesannya sendiri.
      const notConfirmed =
        error.code === "email_not_confirmed" ||
        /email not confirmed|not confirmed/i.test(error.message ?? "");
      setError(notConfirmed ? "login.notConfirmed" : "login.error");
      setShowResend(notConfirmed);
      return;
    }
    // Arah setelah login:
    //   sudah punya gambar  -> langsung Buat Konten (Otomatis)
    //   belum punya gambar  -> halaman Gambar (upload dulu)
    //   gagal cek           -> Dashboard (fallback aman; onboarding tetap tertangani di sana)
    let dest = "/dashboard";
    try {
      const res = await fetch("/api/images");
      const data = await res.json().catch(() => null);
      if (res.ok) {
        dest = (data?.images?.length ?? 0) > 0 ? "/generate-otomatis" : "/gambar";
      }
    } catch {}
    router.push(dest);
    router.refresh();
  }

  async function handleResend() {
    setResendMsg(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResendMsg(error ? "login.resendFail" : "login.resendOk");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <AuthBackground lang={lang} />

      {/* Pemilih bahasa */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <span className="text-xs font-semibold text-navy/70">{lang === "en" ? "Language" : "Bahasa"}</span>
        <div className="flex rounded-full border border-line bg-white/80 p-1 backdrop-blur">
          <button
            type="button"
            onClick={() => chooseLang("id")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${lang === "id" ? "bg-primary text-white" : "text-navy/60 hover:text-navy"}`}
          >
            ID
          </button>
          <button
            type="button"
            onClick={() => chooseLang("en")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${lang === "en" ? "bg-primary text-white" : "text-navy/60 hover:text-navy"}`}
          >
            EN
          </button>
        </div>
      </div>

      <Card className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          {/* Logo Keposting */}
          <Link href="/" className="flex items-center gap-2" aria-label="Kembali ke beranda">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/keposty-icon.png" alt="Keposting" className="h-10 w-10" />
            <span className="text-2xl font-bold text-navy">Keposting</span>
          </Link>
          <h1 className="text-2xl font-bold text-navy">{t("login.title", lang)}</h1>
          <p className="text-sm font-medium text-navy/50">{t("login.tagline", lang)}</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          className="flex flex-col gap-4"
        >
          <Input label={t("login.email", lang)} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("login.emailPlaceholder", lang)} />
          <Input label={t("login.password", lang)} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          <div className="-mt-2 text-right">
            <Link href="/lupa-password" className="text-xs font-medium text-primary hover:underline">
              {t("login.forgot", lang)}
            </Link>
          </div>
          {notice && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              {t(notice, lang)}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <p>{t(error, lang)}</p>
              {showResend && (
                <button
                  type="button"
                  onClick={handleResend}
                  className="mt-1.5 font-semibold text-primary underline underline-offset-2 hover:opacity-80"
                >
                  {t("login.resendBtn", lang)}
                </button>
              )}
              {resendMsg && <p className="mt-1 text-xs text-navy/60">{t(resendMsg, lang)}</p>}
            </div>
          )}
          <Button type="submit" disabled={loading || !email || !password} className="w-full">
            {loading ? t("login.processing", lang) : t("login.submit", lang)}
          </Button>

          <div className="my-1 flex items-center gap-3">
            <div className="h-px flex-1 bg-navy/10" />
            <span className="text-xs text-navy/40">atau</span>
            <div className="h-px flex-1 bg-navy/10" />
          </div>

          <GoogleAuthButton label="Masuk dengan Google" />
        </form>
        <p className="mt-5 text-center text-sm text-navy/60">
          {t("login.noAccount", lang)}{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            {t("login.signup", lang)}
          </Link>
        </p>
      </Card>
    </main>
  );
}
