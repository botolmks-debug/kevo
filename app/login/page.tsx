"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { AuthBackground } from "@/components/ui/AuthBackground";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Email atau password salah. Coba lagi.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
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
          <h1 className="text-2xl font-bold text-navy">Masuk</h1>
          <p className="text-sm font-medium text-navy/50">Setiap Produk Punya Cerita</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          className="flex flex-col gap-4"
        >
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="kamu@email.com" />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          <div className="-mt-2 text-right">
            <Link href="/lupa-password" className="text-xs font-medium text-primary hover:underline">
              Lupa password?
            </Link>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={loading || !email || !password} className="w-full">
            {loading ? "Memproses..." : "Masuk"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-navy/60">
          Belum punya akun?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Daftar
          </Link>
        </p>
      </Card>
    </main>
  );
}
