"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { AuthBackground } from "@/components/ui/AuthBackground";
import { getStoredLang, setLang, t, type Lang } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Default English. Kalau user sudah pernah memilih, pakai pilihannya.
  const [lang, setLangLocal] = useState<Lang>("en");

  useEffect(() => {
    const stored = getStoredLang();
    if (stored) {
      setLangLocal(stored);
    } else {
      setLangLocal("en");
      setLang("en"); // simpan default supaya konsisten sampai ke dashboard
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
      setError("login.error");
      return;
    }
    router.push("/dashboard");
    router.refresh();
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
          {error && <p className="text-sm text-red-500">{t(error, lang)}</p>}
          <Button type="submit" disabled={loading || !email || !password} className="w-full">
            {loading ? t("login.processing", lang) : t("login.submit", lang)}
          </Button>
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
