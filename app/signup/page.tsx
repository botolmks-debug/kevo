"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { AuthBackground } from "@/components/ui/AuthBackground";

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
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) {
      setError("Gagal daftar: " + error.message);
      return;
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
      <Card className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          {/* Logo Keposting */}
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/keposty-icon.png" alt="Keposting" className="h-10 w-10" />
            <span className="text-2xl font-bold text-navy">Keposting</span>
          </div>
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
        </form>
        <p className="mt-5 text-center text-sm text-navy/60">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Masuk
          </Link>
        </p>
      </Card>
    </main>
  );
}
