"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { AuthBackground } from "@/components/ui/AuthBackground";
import { SignupProof } from "@/components/SignupProof";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSignup() {
    setError(null);
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setLoading(false);
    if (error) {
      setError("Gagal daftar: " + error.message);
      return;
    }
    // Lapor ke Meta Pixel: pendaftaran berhasil (dipakai kampanye iklan untuk
    // optimasi & hitung konversi). Aman kalau fbq belum termuat — di-skip.
    if (typeof window !== "undefined" && (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq) {
      (window as unknown as { fbq: (...a: unknown[]) => void }).fbq("track", "CompleteRegistration");
    }
    if (data.session) {
      router.push("/onboarding");
      router.refresh();
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-12">
        <Card className="w-full max-w-sm text-center">
          <h1 className="text-xl font-bold text-navy">Cek emailmu 📩</h1>
          <p className="mt-2 text-sm text-navy/60">
            Kami kirim link konfirmasi ke <b>{email}</b>. Klik link itu, lalu masuk.
          </p>
          <Link href="/login" className="mt-4 inline-block font-semibold text-primary hover:underline">
            Ke halaman Masuk
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <AuthBackground />
      <div className="relative z-10 grid w-full max-w-5xl items-center gap-8 md:grid-cols-[3fr_2fr]">
        {/* KIRI: bukti sosial (di HP muncul di atas form) */}
        <SignupProof />

        {/* KANAN: form daftar — logika TIDAK diubah */}
        <Card className="w-full max-w-sm justify-self-center md:justify-self-end">
          <div className="mb-6 flex flex-col items-center gap-2">
            <Link href="/" className="flex items-center gap-2 transition hover:opacity-80">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/keposty-icon.png" alt="Keposting" className="h-10 w-10" />
              <span className="text-2xl font-bold text-navy">Keposting</span>
            </Link>
            <h1 className="text-2xl font-bold text-navy">Buat akun</h1>
            <p className="text-sm text-navy/60">Mulai bikin konten harianmu ✨</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSignup();
            }}
            className="flex flex-col gap-4"
          >
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kamu@email.com" />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="minimal 6 karakter" />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={loading || !email || !password} className="w-full">
              {loading ? "Memproses..." : "Daftar"}
            </Button>

            <div className="my-1 flex items-center gap-3">
              <div className="h-px flex-1 bg-navy/10" />
              <span className="text-xs text-navy/40">atau</span>
              <div className="h-px flex-1 bg-navy/10" />
            </div>

            <GoogleAuthButton label="Daftar dengan Google" />
          </form>
          <p className="mt-5 text-center text-sm text-navy/60">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Masuk
            </Link>
          </p>
        </Card>
      </div>
    </main>
  );
}
